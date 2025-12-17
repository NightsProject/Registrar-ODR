
from . import request_bp
from ...whatsapp.controller import send_whatsapp_message 
from flask import jsonify, request, session, current_app
from app.utils.decorator import jwt_required_with_role, request_allowed_required
from flask_jwt_extended import get_jwt_identity, unset_jwt_cookies, jwt_required
from .models import Request
from app.user.document_list.models import DocumentList
from app.admin.settings.models import Fee
import os
from werkzeug.utils import secure_filename
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_ANON_KEY


def send_whatsapp_tracking(phone, full_name, request_id):
    template_name = "odr_request_submitted_v2"
    
    components = [
        {
            "type": "body",
            "parameters": [
                {"type": "text", "text": str(full_name)},
                {"type": "text", "text": str(request_id)}
            ]
        }
    ]
    
    print(f"[Tracking Number] Attempting to send WhatsApp Tracking Number {request_id} to {phone}")
    
    result = send_whatsapp_message(phone, template_name, components)
    
    if "error" in result:
        current_app.logger.error(f"WhatsApp send failed for Tracking Number to {phone}: {result['error']}")
        return {"status": "failed", "message": "Failed to send Tracking Number via WhatsApp"}
    
    return {"status": "success"}

@request_bp.route("/api/check-request-allowed", methods=["GET"])
@request_allowed_required()
def check_request_allowed():
    """
    Check if requesting is allowed at the current time.
    If this function is reached, it means the decorator allowed it.
    """
    return jsonify({"allowed": True}), 200


@request_bp.route("/api/public/request-status", methods=["GET"])
def get_public_request_status():
    """
    Public endpoint to check current request restriction status.
    No authentication required - used by landing page to show/hide request functionality.
    """
    try:
        from app.utils.decorator import is_request_allowed
        from app.admin.settings.models import OpenRequestRestriction, AvailableDates
        
        # Get current restriction status
        allowed = is_request_allowed()
        
        # Get current settings for display
        settings = OpenRequestRestriction.get_settings()
        
        # Get today's date restriction info
        import datetime
        today = datetime.datetime.now().strftime('%Y-%m-%d')
        today_availability = AvailableDates.is_date_available(today)
        
        # Get upcoming date restrictions
        upcoming_restrictions = AvailableDates.get_upcoming_restrictions(30)
        
        # Return enhanced status with date information
        return jsonify({
            "allowed": allowed,
            "settings": settings or {
                "start_time": "09:00:00",
                "end_time": "17:00:00", 
                "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                "announcement": ""
            },
            "date_info": {
                "today": today,
                "today_available": today_availability,
                "has_today_restriction": today_availability is not None,
                "upcoming_restrictions": upcoming_restrictions
            }
        }), 200
        
    except Exception as e:
        print(f"Error in /api/public/request-status: {e}")
        # Return default settings if there's an error
        return jsonify({
            "allowed": True,  # Default to allowing requests if there's an error
            "settings": {
                "start_time": "09:00:00",
                "end_time": "17:00:00",
                "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                "announcement": ""
            },
            "date_info": {
                "today": datetime.datetime.now().strftime('%Y-%m-%d'),
                "today_available": None,
                "has_today_restriction": False,
                "upcoming_restrictions": []
            },
            "error": "Could not fetch current restriction status"
        }), 200

@request_bp.route("/api/request", methods=["GET"])
@jwt_required()
@request_allowed_required()
def get_request_page_data():
    """
    Step 1: Get student data from external DB
    Step 2: Get all available documents for request
    Step 3: Return JSON data to React
    """
    try:
        # step 1: Get student data from external DB
        student_id = session.get("student_id")
        
        #Fetch student info
        student_data = Request.get_student_data(student_id)


        student_name = student_data.get("full_name")

        student_contact = student_data.get("contact_number")
        student_email = student_data.get("email")
        student_college_code = student_data.get("college_code")

        # Step 2: Fetch documents available for request
        documents = DocumentList.get_all_documents()

        # Step 3: Get admin fee
        admin_fee = Fee.get_value('admin_fee')

        # Step 3: send the needed data to React
        return jsonify({
            "status": "success",
            "student_data": {
                "student_id": student_id,
                "student_name": student_name,
                "student_contact": student_contact,
                "email": student_email,
                "college_code": student_college_code
            },
            "documents": documents,
            "admin_fee": admin_fee
        })

    except Exception as e:
        print(f"Error in /api/request: {e}")
        return jsonify({
            "status": "error",
            "message": "An unexpected error occurred while fetching request data."
        }), 500


@request_bp.route("/api/list-requirements", methods=["POST"])
@jwt_required()  
def get_requirements():
    """
    Returns all unique requirements for selected documents.
    """
    try:
        data = request.get_json()
        document_ids = data.get("document_ids", [])
        
        if not document_ids:
            return jsonify({
                "success": True,
                "notification": "No documents selected.",
                "requirements": []
            }), 200

        # Fetch unique requirements for the selected documents
        result = Request.get_requirements_by_document_ids(document_ids)

        if not result["requirements"]:
            return jsonify({
                "success": True,
                "notification": "No requirements found for selected documents.",
                "requirements": []
            }), 200

        return jsonify({
            "success": True,
            "requirements": result["requirements"]
        }), 200
        
    except Exception as e:
        print(f"Error in /api/list-requirements: {e}")
        return jsonify({
            "success": False,
            "notification": "An error occurred while fetching requirements.",
            "requirements": []
        }), 500



#complete button in summary page
@request_bp.route("/api/complete-request", methods=["POST"])
@jwt_required()
def complete_request():
    """
    Complete the request submission process.
    Expects data from frontend: student_info, documents, requirements, files, total_price
    """
    data = request.get_json()
    


    # Extract data from frontend
    student_info = data.get("student_info", {})
    documents_data = data.get("documents", [])
    requirements_data = data.get("requirements", [])
    total_price = data.get("total_price", 0.0)
    admin_fee = data.get("admin_fee", 0.0)
    preferred_contact = data.get("preferred_contact", "SMS")
    payment_status = data.get("payment_status", False)
    remarks = data.get("remarks", "Request submitted successfully")
    
    # Step 1: Initialize request ID
    request_id = session.get("request_id")
    
    if not request_id:
        request_id = Request.generate_unique_request_id()
        session["request_id"] = request_id
    

    student_id = session.get("student_id")
    student_name = student_info.get("full_name")
    student_contact = student_info.get("contact_number")
    student_email = student_info.get("email")
    student_college_code = student_info.get("college_code")
    
    try:


        # Step 2: Store student info in the database
        Request.submit_request(request_id, student_id, student_name, student_contact, student_email, preferred_contact, payment_status, total_price, admin_fee, student_college_code, remarks)
        

        # Step 3: Save documents if provided
        if documents_data:
            documents_saved = save_documents_to_db(request_id, documents_data)
            if not documents_saved:
                raise Exception("Failed to save documents to database")
        
        # Step 3.1: Save custom documents if provided
        custom_documents = [doc for doc in documents_data if doc.get("isCustom", False)]
        if custom_documents:
            custom_docs_saved = save_custom_documents_to_db(request_id, student_id, custom_documents)
            if not custom_docs_saved:
                raise Exception("Failed to save custom documents to database")
        
        # Step 4: Handle requirement files upload to Supabase
        if requirements_data:
            file_upload_success, file_upload_message, saved_files = upload_requirement_files_to_supabase(request_id, requirements_data)
            if not file_upload_success:
                print(f"Warning: File upload issues - {file_upload_message}")
                # Don't fail the entire request for file upload issues, just log it
        
        # Step 5: Send WhatsApp notification
        whatsapp_result = send_whatsapp_tracking(student_contact, student_name, request_id)

        return jsonify({
            "success": True,
            "request_id": request_id,
            "notification": "Your request has been completed successfully.",
            "whatsapp_status": whatsapp_result.get("status", "unknown")
        }), 200
        
    except Exception as e:
        print(f"Error in /api/complete-request: {e}")
        return jsonify({
            "success": False,
            "notification": "An error occurred while completing your request. Please try again later.",
            "error": str(e)
        }), 500




@request_bp.route("/api/check-active-requests", methods=["GET"])
@jwt_required()
def check_active_requests():
    """
    Check for active requests for the logged-in student.
    Returns all requests where status != 'RELEASED'.
    """
    try:
        # Get student ID from session
        student_id = session.get("student_id")
        
        if not student_id:

            return jsonify({
                "status": "error",
                "message": "Student ID not found in session"
            }), 400

        # Fetch active requests for the student
        active_requests = Request.get_active_requests_by_student(student_id)

        return jsonify({
            "status": "success",
            "active_requests": active_requests,
            "count": len(active_requests)
        }), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "An unexpected error occurred while fetching active requests."
        }), 500


@request_bp.route("/api/clear-session", methods=["POST"])
@jwt_required()
def logout_user():
    """
    Clears user session and JWT cookies.
    """
    response = jsonify({"message": "Logout successful"})

    # Remove any JWT cookies set via set_access_cookies()
    unset_jwt_cookies(response)

    # Clear server-side session
    session.clear()

    # Delete the session cookie to fully clear the session
    response.delete_cookie('session')
    
    return response




def save_documents_to_db(request_id, documents_data):
    """
    Helper function to save selected documents to database.
    Args:
        request_id (str): The request ID
        documents_data (list): List of document objects with doc_id and quantity
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        document_ids = [doc.get("doc_id") for doc in documents_data]
        quantities = [doc.get("quantity", 1) for doc in documents_data]
        return Request.store_requested_documents(request_id, document_ids, quantities)
    except Exception as e:
        print(f"Error saving documents: {e}")
        return False
        
def upload_requirement_files_to_supabase(request_id, requirements_data):
    """
    Helper function to upload requirement files to Supabase and store in database.
    Args:
        request_id (str): The request ID
        requirements_data (list): List of requirement objects with file_data
    Returns:
        tuple: (success: bool, message: str, saved_files: list)
    """
    try:
        import base64
        import json
        
        # Initialize Supabase client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        saved_files = []
        
        for req in requirements_data:
            requirement_id = req.get("requirement_id")
            already_uploaded = req.get("alreadyUploaded", False)
            file_data = req.get("file_data")  # Base64 encoded file data from frontend
            
            if already_uploaded or not file_data:
                continue
            
            # Decode base64 file data
            file_content = base64.b64decode(file_data)
            filename = req.get("filename", f"requirement_{requirement_id}")
            file_path_in_bucket = f"{request_id}/{requirement_id}_{filename}"
            
            # Upload to Supabase
            supabase.storage.from_('requirements-odr').upload(
                file_path_in_bucket, 
                file_content,
                {"content-type": req.get("content_type", "application/octet-stream")}
            )
            
            # Get public URL
            file_url = supabase.storage.from_('requirements-odr').get_public_url(file_path_in_bucket)
            saved_files.append({
                "requirement_id": requirement_id, 
                "file_path": file_url
            })
        
        # Store requirement files in database
        if saved_files:
            success, message = Request.store_requirement_files(request_id, saved_files)
            return success, message, saved_files
        
        return True, "No files to upload", []
        

    except Exception as e:
        print(f"Error uploading requirement files: {e}")
        return False, f"Error uploading files: {str(e)}", []

def save_custom_documents_to_db(request_id, student_id, custom_documents):
    """
    Helper function to save custom documents to database.
    Args:
        request_id (str): The request ID
        student_id (str): The student ID
        custom_documents (list): List of custom document objects
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Extract custom document data
        custom_docs_data = []
        for doc in custom_documents:
            custom_docs_data.append({
                "doc_name": doc.get("doc_name", ""),
                "description": doc.get("description", "")
            })
        
        return Request.store_custom_documents(request_id, student_id, custom_docs_data)
    except Exception as e:
        print(f"Error saving custom documents: {e}")
        return False
