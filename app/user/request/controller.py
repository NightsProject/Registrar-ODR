from . import request_bp
from flask import jsonify, request, session
from app.utils.decorator import jwt_required_with_role
from flask_jwt_extended import get_jwt_identity, unset_jwt_cookies
from .models import Request
from app.user.document_list.models import DocumentList
import os
from werkzeug.utils import secure_filename

role = 'user'

@request_bp.route("/api/request", methods=["GET"])
@jwt_required_with_role(role)
def get_request_page_data():
    """
    Step 1: Initialize the db with the student_id and request_id 
            and Get student data from external DB then fill in the database
    Step 2: Get all available documents for request
    Step 3: Return JSON data to React
    """
    try:
        
        # step 1: initialize the db
        request_id = session.get("request_id")
        
        if not request_id:
            request_id = Request.generate_unique_request_id()
            session["request_id"] = request_id
            
        student_id = session.get("student_id")
              
        ##store req_id and student_id to db
        Request.store_request(request_id, student_id)
        
        
        #Fetch student info
        student_data = Request.get_student_data(student_id)

        student_name = student_data.get("full_name")
        student_contact = student_data.get("contact_number")
        student_email = student_data.get("email")
        
        #Store student info in the database
        Request.store_student_info(request_id, student_id, student_name, student_contact, student_email)

        # Step 2: Fetch documents available for request
        documents = DocumentList.get_all_documents()

        session["request_id"] = request_id  # Store request_id in session for later use
        
        # Step 3: send the needed data to React
        return jsonify({
            "status": "success",
            "request_id": request_id,
            "student_name": student_name,
            "documents": documents
        })

    except Exception as e:
        print(f"Error in /api/request: {e}")
        return jsonify({
            "status": "error",
            "message": "An unexpected error occurred while fetching request data."
        }), 500

    
#submit requests
@request_bp.route("/api/save-documents", methods=["POST"])
@jwt_required_with_role(role)
def save_documents():
    """
    Accepts final submission data from React and processes the request.
    Returns a success or error notification based on processing outcome.
    """
    
    """accepts data from react: document id, quantity"""
    data = request.get_json()
    request_id = session.get("request_id")
    
    try:
        #store requested documents to db
        Request.store_requested_documents(
            request_id,
            data["document_ids"],
            data["quantity_list"]
        )

        return jsonify({
            "success": True,
            "notification": "Your request has been submitted successfully."
        }), 200

    except Exception as e:
        print(f"Error in /api/save-request: {e}")
        return jsonify({
            "success": False,
            "notification": "An error occurred while submitting your request. Please try again later."
        }), 500
        

@request_bp.route("/api/list-requirements", methods=["GET"])
@jwt_required_with_role(role)  
def get_requirements():
    """
    Returns all unique requirements for a specific request.
    """
    request_id = session.get("request_id")
    
    if not request_id:
        return jsonify({
            "success": False,
            "notification": "Missing request_id parameter.",
            "requirements": []
        }), 400

    # Fetch unique requirements
    result = Request.get_requirements_by_request_id(request_id)

    if not result["requirements"]:
        return jsonify({
            "success": True,
            "notification": "No requirements found for this request.",
            "requirements": []
        }), 200

    return jsonify({
        "success": True,
        "requirements": result["requirements"]
    }), 200
# submit requirement files
@request_bp.route("/api/save-file", methods=["POST"])
@jwt_required_with_role(role)
def submit_requirement_files():
    """
    Accepts requirement files from React, saves them to disk, and stores file paths to the database.
    Skips saving requirements that are already uploaded.
    Expected multipart/form-data format:
    - request_id: "R0000123"
    - requirements: JSON string like [
          {"requirement_id": "REQ0001", "alreadyUploaded": true},
          {"requirement_id": "REQ0002", "alreadyUploaded": false}
      ]
    - files: file uploads with keys like "file_REQ0001", "file_REQ0002"
    """
    request_id = session.get("request_id")
    requirements_json = request.form.get("requirements")
    if not requirements_json:
        return jsonify({"success": False, "notification": "No requirements provided."}), 400

    try:
        import json
        requirements = json.loads(requirements_json)
    except json.JSONDecodeError:
        return jsonify({"success": False, "notification": "Invalid requirements format."}), 400

    upload_dir = os.path.join(os.getcwd(), 'uploads', request_id)
    os.makedirs(upload_dir, exist_ok=True)

    saved_files = []
    for req in requirements:
        requirement_id = req.get("requirement_id")
        already_uploaded = req.get("alreadyUploaded", False)

        # Skip saving if already uploaded
        if already_uploaded:
            continue

        file_key = f"file_{requirement_id}"
        if file_key in request.files:
            file = request.files[file_key]
            if file.filename:
                filename = secure_filename(file.filename)
                file_path = os.path.join(upload_dir, f"{requirement_id}_{filename}")

                # Delete existing files for this requirement_id
                for existing_file in os.listdir(upload_dir):
                    if existing_file.startswith(f"{requirement_id}_"):
                        os.remove(os.path.join(upload_dir, existing_file))

                file.save(file_path)
                saved_files.append({"requirement_id": requirement_id, "file_path": file_path})

    if not saved_files:
        # Nothing new to save, return success
        return jsonify({"success": True, "notification": "All files already uploaded, nothing to save."}), 200

    # Store newly uploaded requirement files to DB
    success, message = Request.store_requirement_files(request_id, saved_files)
    status_code = 200 if success else 400
    return jsonify({"success": success, "notification": message}), status_code


@request_bp.route("/api/get-uploaded-files", methods=["GET"])
@jwt_required_with_role(role)
def get_uploaded_files():
    """
    Return previously uploaded files for the current request.
    """
    request_id = session.get("request_id")
    if not request_id:
        return jsonify({"success": False, "notification": "No active request."}), 400

    uploaded_files = Request.get_uploaded_files(request_id)
    return jsonify({"success": True, "uploaded_files": uploaded_files}), 200


@request_bp.route("/api/delete-file/<requirement_id>", methods=["DELETE"])
@jwt_required_with_role(role)
def delete_requirement_file(requirement_id):
    """
    Delete a previously uploaded requirement file.
    """
    request_id = session.get("request_id")
    if not request_id:
        return jsonify({"success": False, "notification": "No active request."}), 400

    success, message = Request.delete_requirement_file(request_id, requirement_id)
    status_code = 200 if success else 400
    return jsonify({"success": success, "notification": message}), status_code


#get preferred contact
@request_bp.route("/api/get-contact", methods=["GET"])
@jwt_required_with_role(role)
def get_preferred_contact():
    """
    Fetches the preferred contact method for the logged-in student.
    """
    student_id = session.get("student_id")  
    contact_info = Request.get_contact_info_by_student_id(student_id)

    if contact_info:
        return jsonify({
            "success": True,
            "contact_info": contact_info
        }), 200
    else:
        return jsonify({
            "success": False,
            "notification": "Could not retrieve contact information."
        }), 500

#set preferred contact
@request_bp.route("/api/set-preferred-contact", methods=["POST"])
@jwt_required_with_role(role)
def set_preferred_contact():
    """
    Sets the preferred contact method for the request.
    """
    data = request.get_json()
    request_id = session.get("request_id")
    preferred_contact = data.get("preferred_contact")

    if not request_id or not preferred_contact:
        return jsonify({
            "success": False,
            "notification": "Missing request_id or preferred_contact."
        }), 400

    success = Request.store_preferred_contact(request_id, preferred_contact)

    if success:
        return jsonify({
            "success": True,
            "notification": "Preferred contact method updated successfully."
        }), 200
    else:
        return jsonify({
            "success": False,
            "notification": "Failed to update preferred contact method."
        }), 500
        
#complete button in summary page
@request_bp.route("/api/complete-request", methods=["POST"])
@jwt_required_with_role(role)
def complete_request():

    request_id = session.get("request_id")
    total_price = request.get_json().get("total_price", 0.0)

    try:
        Request.mark_request_complete(request_id, total_price)
        
        #Todo send details include: request id to preferred contact
        #Todo delete the jwt session and other session variables
        
        return jsonify({
            "success": True,
            "request_id": request_id,
            "notification": "Your request has been completed successfully."
        }), 200
    except Exception as e:
        print(f"Error in /api/submit-request: {e}")
        return jsonify({
            "success": False,
            "notification": "An error occurred while completing your request. Please try again later."
        }), 500

@request_bp.route("/api/clear-session", methods=["POST"])
@jwt_required_with_role(role)
def logout_user():
    """
    Clears user session and JWT cookies.
    """
    response = jsonify({"message": "Logout successful"})
    
    # Remove any JWT cookies set via set_access_cookies()
    unset_jwt_cookies(response)
    
    # Clear server-side session
    session.clear()
    
    print("[INFO] Session and JWT cleared successfully.")
    return response, 200