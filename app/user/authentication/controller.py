from . import authentication_user_bp
from ...whatsapp.controller import send_whatsapp_message 
from flask import jsonify, request, session, current_app
from .models import AuthenticationUser
from flask_jwt_extended import create_access_token, set_access_cookies
from flask import jsonify, request, session
from app.utils.decorator import jwt_required_with_role
from werkzeug.utils import secure_filename
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_ANON_KEY 
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

@authentication_user_bp.route('/check-id', methods=['POST'])
def check_id():
    # Get student ID from frontend
    student_id = request.json.get("student_id")

    # Query school database for student info
    result = AuthenticationUser.check_student_in_school_system(student_id)

    # Student not found in records
    if not result["exists"]:
        return jsonify({
            "status": "not_found",
            "message": "Student ID not registered"
        }),404

    # Student has unpaid liabilities, cannot proceed
    if result["has_liability"]:
        return jsonify({
            "status": "has_liability",
            "message": "Student has outstanding liabilities"
        }), 200

    # Generate OTP + hash it
    otp, otp_hash = AuthenticationUser.generate_otp()
    phone = result["phone_number"] 
    full_name = result.get("full_name") if result else "Valued Customer"

    # Save OTP hash and student ID in session
    AuthenticationUser.save_otp(student_id, otp_hash, session)
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
        "masked_phone": phone[-2:],
        "otp": otp  # Include OTP for testing purposes
        "masked_phone": phone[-4:] 
    }), 200

@authentication_user_bp.route('/check-name', methods=['POST'])
def check_name():
    firstname = request.json.get("firstname")
    lastname = request.json.get("lastname")

    student_id = session.get("student_id")
    if not student_id:
        return jsonify({"status": "expired", "message": "Session expired."}), 400

    # Returns dict with exists, has_liability, phone_number
    result = AuthenticationUser.check_student_name_exists(firstname, lastname)

    if not result["exists"]:
        return jsonify({"status": "name_mismatch", "message": "Provided name does not match records."}), 400

    if result["has_liability"]:
        return jsonify({
            "status": "has_liability",
            "message": "Student has outstanding liabilities"
        }), 200

    # Generate OTP + hash it
    otp, otp_hash = AuthenticationUser.generate_otp()
    AuthenticationUser.save_otp(student_id, otp_hash, session)
    session["phone_number"] = result["phone_number"]

    # Send OTP to registered phone (printed in dev)
    phone = result["phone_number"]
    send_sms(phone, f"Your verification code is: {otp}")

    return jsonify({
        "status": "name_verified",
        "message": "Name verified successfully.",
        "masked_phone": phone[-2:]
    }), 200

@authentication_user_bp.route('/resend-otp', methods=['POST'])
def resend_otp():
    # Debug print
    print(f"[DEBUG] Session at resend: {dict(session)}")

    student_id = session.get("student_id")
    phone = session.get("phone_number")
    full_name = session.get("full_name", "Valued Customer")

    if not student_id or not phone:
        return jsonify({
            "status": "expired",
            "message": "No active OTP session. Please start again."
        }), 400

    # Generate new OTP
    otp, otp_hash = AuthenticationUser.generate_otp()
    session["otp"] = otp_hash  # replace old OTP

    # Send OTP via WhatsApp
    whatsapp_result = send_whatsapp_otp(phone, full_name, otp)
    
    if whatsapp_result["status"] == "failed":
        return jsonify({
            "status": "error",
            "message": whatsapp_result["message"]
        }), 500
        
    # Success response
    return jsonify({
        "status": "resent",
        "message": "New OTP sent successfully",
        "masked_phone": phone[-4:] 
    }), 200

@authentication_user_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    print("=" * 50)
    print("[DEBUG] Received payload:", request.json)
    print("[DEBUG] Session contents:", dict(session))
    print("[DEBUG] Session ID:", request.cookies.get('session'))
    print("=" * 50)

    otp = request.json.get("otp")
    student_id = session.get("student_id")
    
    # Check if OTP exists in session
    if "otp" not in session:
        print("[ERROR] No OTP found in session!")
        return jsonify({
            "valid": False, 
            "message": "Session expired. Please request a new OTP."
        }), 400
    
    # Validate entered OTP
    valid = AuthenticationUser.verify_otp(otp, session)
    
    if not valid:
        print(f"[ERROR] OTP validation failed. Entered: {otp}")
        return jsonify({"valid": False, "message": "Invalid OTP"}), 400

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
        "valid": True
    })
    set_access_cookies(response, access_token)

    current_app.logger.info(f"User {student_id} logged in successfully.")
    print("[SUCCESS] OTP verified, JWT token created")
    return response, 200

@authentication_user_bp.route("/upload-authletter", methods=["POST"])
def upload_auth_letter():
    """
    Uploads an authorization letter for a student before a request exists.
    Stores the file in Supabase bucket 'auth_letter_odr' and saves the URL in the DB.
    Expected multipart/form-data:
      - file: the authorization letter
    """
    firstname = request.form.get("firstname")
    lastname = request.form.get("lastname")
    number = request.form.get("number")

    if not firstname or not lastname or not number:
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
        success, message = AuthenticationUser.store_authletter(firstname, lastname, file_url, number)
        status_code = 200 if success else 400

        return jsonify({"success": success, "notification": message, "file_url": file_url}), status_code

    except Exception as e:
        print(f"Error uploading auth letter: {e}")
        return jsonify({"success": False, "notification": "Failed to upload authorization letter."}), 500
