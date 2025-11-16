from . import authentication_user_bp
from flask import jsonify, request, session, current_app
from .models import AuthenticationUser
from flask_jwt_extended import create_access_token, set_access_cookies
import random
import hashlib

# Mock SMS sender (in production you replace this with an actual SMS API)
# For now, it prints OTP in console for debugging/dev testing
def send_sms(phone, message):
    print("=========== DEV OTP ===========")
    print(f"To: {phone}")
    print(f"Message: {message}")
    print("================================")

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

    # Save OTP hash in session (temporary)
    AuthenticationUser.save_otp(student_id, otp_hash, session)
    session["phone_number"] = result["phone_number"]
    
    # DEBUG: Print session data
    print(f"[DEBUG] Session after saving OTP: {dict(session)}")

    # Send OTP to registered phone (printed in dev)
    phone = result["phone_number"]
    send_sms(phone, f"Your verification code is: {otp}")

    # Return masked number to frontend
    return jsonify({
        "status": "valid",
        "message": "Student OK, continue",
        "masked_phone": phone[-2:],
        "otp": otp  # Include OTP for testing purposes
    }), 200

@authentication_user_bp.route('/resend-otp', methods=['POST'])
def resend_otp():
    # Debug print
    print(f"[DEBUG] Session at resend: {dict(session)}")

    student_id = session.get("student_id")
    phone = session.get("phone_number")

    if not student_id or not phone:
        return jsonify({
            "status": "expired",
            "message": "No active OTP session. Please start again."
        }), 400

    # Generate new OTP
    otp, otp_hash = AuthenticationUser.generate_otp()
    session["otp"] = otp_hash  # replace old OTP

    send_sms(phone, f"Your new verification code is: {otp}")

    return jsonify({
        "status": "resent",
        "message": "New OTP sent successfully",
        "masked_phone": phone[-2:]
    }), 200

# Mock SMS sender (in production you replace this with an actual SMS API)
# For now, it prints OTP in console for debugging/dev testing
def send_sms(phone, message):
    print("=========== DEV OTP ===========")
    print(f"To: {phone}")
    print(f"Message: {message}")
    print("================================")

@authentication_user_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    # DEBUG: Print everything
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
        "valid": True  # ADD THIS!
    })
    set_access_cookies(response, access_token)

    current_app.logger.info(f"User {student_id} logged in successfully.")
    print("[SUCCESS] OTP verified, JWT token created")
    return response, 200
