from . import authentication_user_bp
from ...whatsapp.controller import send_whatsapp_message 
from flask import jsonify, request, session, current_app
from .models import AuthenticationUser
from flask_jwt_extended import create_access_token, set_access_cookies, jwt_required
from flask import jsonify, request, session
from app.utils.decorator import jwt_required_with_role
from werkzeug.utils import secure_filename
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_ANON_KEY 
from app.services.logging_service import log_auth_event
import random
import hashlib


def send_whatsapp_otp(phone, full_name, otp_code):
    template_name = "odr_reference_number"

    components = [
        {
            "type": "body",
            "parameters": [
                {"type": "text", "text": str(full_name)},
                {"type": "text", "text": str(otp_code)}
            ]
        }
    ]
    
    print(f"[OTP Verification] Attempting to send WhatsApp OTP {otp_code} to {phone}")
    
    result = send_whatsapp_message(phone, template_name, components)
    
    if "error" in result:
        current_app.logger.error(f"WhatsApp send failed for OTP to {phone}: {result['error']}")
        return {"status": "failed", "message": "Failed to send OTP via WhatsApp"}
    
    return {"status": "success"}


@authentication_user_bp.route('/api/check-id', methods=['POST'])
def check_id():
    # Get student ID from frontend
    student_id = request.json.get("student_id")

    # Query school database for student info
    result = AuthenticationUser.check_student_in_school_system(student_id)

    # Student not found in records
    if not result["exists"]:
        # Log failed attempt
        log_auth_event(
            event_type="student_not_found",
            details=f"Student ID {student_id} not found in records",
            success=False,
            user_id=student_id
        )
        return jsonify({
            "status": "not_found",
            "message": "Student ID not registered"
        }),404

    # # Student has unpaid liabilities, cannot proceed
    # if result["has_liability"]:
    #     return jsonify({
    #         "status": "has_liability",
    #         "message": "Student has outstanding liabilities"
    #     }), 200

    # Generate OTP + hash it
    otp, otp_hash = AuthenticationUser.generate_otp()
    phone = result["phone_number"] 
    full_name = result.get("full_name") if result else "Valued Customer"

    # Save OTP hash and student ID in session
    AuthenticationUser.save_otp(student_id, otp_hash, has_liability=result["has_liability"], session=session)
    session["phone_number"] = phone
    session ["full_name"] = full_name
    # Send OTP via WhatsApp
    whatsapp_result = send_whatsapp_otp(phone, full_name, otp)
    
    if whatsapp_result["status"] == "failed":
        return jsonify({
            "status": "error",
            "message": whatsapp_result["message"]
        }), 500
  
    # Return masked number to frontend
    return jsonify({
        "status": "valid",
        "message": "Student OK, continue",
        "masked_phone": phone[-4:] 
    }), 200




@authentication_user_bp.route('/api/check-name', methods=['POST'])
def check_name():
    firstname = request.json.get("firstname")
    lastname = request.json.get("lastname")
    requester_whatsapp_number= request.json.get("whatsapp_number")
    requester_name = request.json.get("requester_name")
    
    # Check if this is an outsider request (has requester_name indicates outsider)
    is_outsider = bool(requester_name and requester_whatsapp_number)

    # Returns dict with exists, has_liability, phone_number, student_id, full_name
    # Skip liability check for outsider users
    result = AuthenticationUser.check_student_name_exists(firstname, lastname, skip_liability_check=is_outsider)

    if not result["exists"]:
        # Log name mismatch
        log_auth_event(
            event_type="name_mismatch",
            details=f"Name does not match records: {firstname} {lastname}",
            success=False
        )
        return jsonify({"status": "name_mismatch", "message": "Provided name does not match records."}), 400

    if requester_whatsapp_number:
        full_name = requester_name
        phone = requester_whatsapp_number
        current_app.logger.info(f"Using requester's WhatsApp number {phone} for OTP.")

    else:
        full_name = result.get("full_name", f"{firstname} {lastname}")
        phone = result["phone_number"]
        current_app.logger.info(f"Sending OTP to registered student number {phone}")

    otp, otp_hash = AuthenticationUser.generate_otp()
    
    AuthenticationUser.save_otp(result["student_id"], otp_hash, has_liability=result["has_liability"], session=session)
    session["phone_number"] = phone
    session["full_name"] = full_name
    session["is_outsider"] = is_outsider

    # Send OTP via WhatsApp 
    whatsapp_result = send_whatsapp_otp(phone, full_name, otp)
    
    if whatsapp_result["status"] == "failed":
        return jsonify({
            "status": "error",
            "message": whatsapp_result["message"]
        }), 500
   
    return jsonify({
        "status": "name_verified",
        "message": "Name verified successfully.",
        "masked_phone": phone[-4:]  
    }), 200

@authentication_user_bp.route('/api/resend-otp', methods=['POST'])
def resend_otp():
    # Debug print
    print(f"[DEBUG] Session at resend: {dict(session)}")

    student_id = session.get("student_id")
    phone = session.get("phone_number")
    full_name = session.get("full_name", "Valued Customer")

    if not student_id or not phone:
        # Log failed resend attempt
        log_auth_event(
            event_type="resend_otp_failed_no_session",
            details="No active OTP session to resend",
            success=False
        )
        return jsonify({
            "status": "expired",
            "message": "No active OTP session. Please start again."
        }), 400

    # Generate new OTP
    otp, otp_hash = AuthenticationUser.generate_otp()
    session["otp"] = otp_hash  

    # Send OTP via WhatsApp
    whatsapp_result = send_whatsapp_otp(phone, full_name, otp)
    
    if whatsapp_result["status"] == "failed":
        log_auth_event(
            event_type="resend_otp_failed_whatsapp",
            details=f"Failed to send OTP via WhatsApp for student_id: {student_id}",
            success=False,
            user_id=student_id
        )
        return jsonify({
            "status": "error",
            "message": whatsapp_result["message"]
        }), 500
    
    # Log successful resend
    log_auth_event(
        event_type="resend_otp_success",
        details=f"OTP resent successfully for student_id: {student_id}",
        success=True,
        user_id=student_id
    )
    
    # Success response
    return jsonify({
        "status": "resent",
        "message": "New OTP sent successfully",
        "masked_phone": phone[-4:] 
    }), 200


@authentication_user_bp.route('/api/verify-otp', methods=['POST'])
def verify_otp():
    print("=" * 50)
    print("[DEBUG] Received payload:", request.json)
    print("[DEBUG] Session contents:", dict(session))
    print("[DEBUG] Session ID:", request.cookies.get('session'))
    print("=" * 50)

    otp = request.json.get("otp")
    student_id = session.get("student_id")
    is_outsider = session.get("is_outsider", False)
    
    # Check if OTP exists in session
    if "otp" not in session:
        print("[ERROR] No OTP found in session!")
        return jsonify({
            "valid": False, 
            "message": "Session expired. Please request a new OTP."
        }), 400
    
    # Validate entered OTP
    result = AuthenticationUser.verify_otp(otp, session)

    if not result["verified"]:
        # Log failed login attempt
        log_auth_event(
            event_type="login_failed_invalid_otp",
            details=f"Invalid OTP for student_id: {student_id}",
            success=False,
            user_id=student_id
        )
        return jsonify({
            "valid": False,
            "message": "Invalid OTP"
        }), 400

    # Skip liability check for outsider users
    if result["has_liability"] and not is_outsider:
        return jsonify({
            "valid": True,
            "status": "has_liability",
            "message": "Student has outstanding liabilities"
        }), 200

    # OTP correct, clear it
    session.pop("otp", None)

    # Create JWT token for the session
    user = {"student_id": student_id, "role": "user"}
    access_token = create_access_token(
        identity=user["student_id"],
        additional_claims={"role": user["role"]}
    )

    response = jsonify({
        "message": "User login successful",
        "role": user["role"],
        "valid": True,
        "has_liability": result["has_liability"] if not is_outsider else False
    })
    set_access_cookies(response, access_token)

    # Log successful login
    log_auth_event(
        event_type="login_success",
        details=f"User {student_id} logged in successfully",
        success=True,
        user_id=student_id
    )

    current_app.logger.info(f"User {student_id} logged in successfully.")
    print("[SUCCESS] OTP verified, JWT token created")
    return response, 200


@authentication_user_bp.route("/api/upload-authletter", methods=["POST"])
@jwt_required()
def upload_auth_letter():
    """
    Uploads an authorization letter for a student.
    Stores the file in Supabase bucket 'auth_letter_odr' and saves the URL in the DB.
    Expected multipart/form-data:
      - file: the authorization letter
      - firstname: student's first name
      - lastname: student's last name  
      - number: requester's phone number
      - requester_name: name of person/organization making request
      - request_id: (optional) request ID to associate with the auth letter
    """
    firstname = request.form.get("firstname")
    lastname = request.form.get("lastname")
    number = request.form.get("number")
    requester_name = request.form.get("requester_name")
    request_id = request.form.get("request_id")


    if not firstname or not lastname or not number or not requester_name:
        return jsonify({"success": False, "notification": "Missing student information."}), 400

    if "file" not in request.files:
        return jsonify({"success": False, "notification": "No file uploaded."}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"success": False, "notification": "Empty file."}), 400

    try:
        filename = secure_filename(file.filename)
        file_path_in_bucket = f"{firstname}_{lastname}/{filename}"

        # Initialize Supabase client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

        file_content = file.read()
        supabase.storage.from_("auth_letter_odr").upload(
            file_path_in_bucket,
            file_content,
            {
                "content-type": file.content_type,
                "x-upsert": "true"
            }
        )

        # Get public URL
        file_url = supabase.storage.from_("auth_letter_odr").get_public_url(file_path_in_bucket)


        # Store URL in DB
        success, message = AuthenticationUser.store_authletter(request_id, firstname, lastname, file_url, number, requester_name)
        status_code = 200 if success else 400
        
        # Log auth letter upload
        if success:
            log_document_action(
                action="auth_letter_uploaded",
                document_id=request_id or "new",
                details=f"Uploaded by: {firstname} {lastname}, Requester: {requester_name}"
            )
        else:
            log_error("upload_auth_letter", message, f"Request ID: {request_id}")

        return jsonify({"success": success, "notification": message, "file_url": file_url}), status_code

    except Exception as e:
        print(f"Error uploading auth letter: {e}")
        log_error("upload_auth_letter", str(e), f"Request ID: {request_id}")
        return jsonify({"success": False, "notification": "Failed to upload authorization letter."}), 500
