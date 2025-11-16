from . import tracking_bp
from flask import jsonify, request, current_app, session
from flask_jwt_extended import create_access_token, set_access_cookies, get_jwt_identity
from .models import Tracking
from app.utils.decorator import jwt_required_with_role
from app.user.authentication.models import AuthenticationUser


role = 'user'

# Mock SMS sender (in production you replace this with an actual SMS API)
# For now, it prints OTP in console for debugging/dev testing
def send_sms(phone, message):
    print("=========== DEV OTP ===========")
    print(f"To: {phone}")
    print(f"Message: {message}")
    print("================================")

@tracking_bp.route('/api/track', methods=['POST'])
def get_tracking_data():
    """
    API endpoint to fetch tracking information based on tracking number and student ID.
    Also issues a JWT for the student.
    """
    data = request.get_json(silent=True) or {}
    tracking_number = data.get('tracking_number')
    student_id = data.get('student_id')


    current_app.logger.info(f"Tracking request received: {data}")


    if not tracking_number or not student_id:
        return jsonify({"message": "Please provide both Tracking Number and Student ID."}), 400


    try:
        # Fetch tracking record
        record = Tracking.get_record_by_ids(tracking_number, student_id)
        if not record:
            return jsonify({"message": "Invalid Tracking Number or Student ID."}), 404

        result = AuthenticationUser.check_student_in_school_system(student_id) 

        # Student not found in records
        if not result["exists"]:
            return jsonify({
                "status": "not_found",
                "message": "Student ID not registered"
            }),404
        
        phone_number = result.get("phone_number") if result else None
        masked_phone = phone_number[-2:] if phone_number else ""

        # Generate OTP + hash
        otp, otp_hash = AuthenticationUser.generate_otp()

        #Save OTP hash in session (temp)
        AuthenticationUser.save_otp(student_id, otp_hash, session)
        session["phone_number"] = result["phone_number"]
        session["tracking_number"] = tracking_number # Add tracking number to session

        # DEBUG: Print session data
        print(f"[DEBUG] Session after saving OTP: {dict(session)}")

        # Send OTP to registered phone (printed in dev)
        phone = result["phone_number"]
        send_sms(phone, f"Your verification code is: {otp}")

        # Build response
        response_data = {
            "message": "Tracking data retrieved successfully",
            "role": role,
            "track_data": record,
            "masked_phone": masked_phone,
            "otp": otp  # Include OTP for testing purposes
        }
        response = jsonify(response_data)

        # Create and set JWT in http-only cookie
        access_token = create_access_token(identity=student_id, additional_claims={"role": role})
        set_access_cookies(response, access_token)

        return response, 200

    except Exception as e:
        current_app.logger.error(f"Error in /api/track: {e}")
        return jsonify({
            "status": "error",
            "message": "An unexpected error occurred while fetching tracking data."
        }), 500
    
@tracking_bp.route('/api/track/payment-complete', methods=['POST'], strict_slashes=False)
@jwt_required_with_role(role)
def mark_payment_complete():
    """
    API endpoint to mark a request's payment as complete.
    """
    student_id = get_jwt_identity()
    if not student_id:
        return jsonify({"message": "User session not found or invalid."}), 401

    data = request.get_json(silent=True) or {}
    tracking_number = data.get('tracking_number')

    if not tracking_number:
        return jsonify({"message": "Tracking number is required."}), 400

    try:
        success = Tracking.update_payment_status(tracking_number, student_id)
        if success:
            return jsonify({"message": "Payment status updated successfully."}), 200
        else:
            return jsonify({"message": "Failed to update payment status. Record not found or you do not have permission."}), 404
    except Exception as e:
        current_app.logger.error(f"Error in /api/track/payment-complete: {e}")
        return jsonify({"status": "error", "message": f"An unexpected error occurred: {str(e)}"}), 500
    
@tracking_bp.route("/api/set-order-type", methods=["POST"], strict_slashes=False)
@jwt_required_with_role(role)
def set_order_type():
    """
    Sets the order_type for the current request.
    """
    student_id = get_jwt_identity()
    if not student_id:
        return jsonify({"message": "User session not found or invalid."}), 401
    data = request.get_json()

    print(f"[DEBUG] Raw request data: {data}")
    print(f"[DEBUG] Request headers: {request.headers}")
    print(f"[DEBUG] Request data type: {type(data)}")

    tracking_number = data.get("tracking_number")
    order_type = data.get("order_type")

    if not tracking_number or not order_type:
        return jsonify({
            "success": False,
            "notification": "Missing tracking_number or order_type."
        }), 400

    success = Tracking.set_order_type(tracking_number, order_type)

    if success:
        return jsonify({
            "success": True,
            "notification": f"Order type set to {order_type} successfully."
        }), 200
    else:
        return jsonify({
            "success": False,
            "notification": "Failed to set order type."
        }), 500

@tracking_bp.route('/api/track/document/<tracking_number>', methods=['GET'])
@jwt_required_with_role(role)
def get_requested_documents(tracking_number):
    """
    API endpoint to fetch requested documents for a given tracking number and student ID.
    """
    try:
        documents = Tracking.get_requested_documents(tracking_number)
        if documents is None:
            return jsonify({"message": "No documents found for the provided Tracking Number and Student ID."}), 404

        # Log the retrieved documents as requested
        current_app.logger.info(f"Retrieved documents for tracking number {tracking_number}: {documents}")

        return jsonify({
            "message": "Requested documents retrieved successfully",
            "documents": documents
        }), 200


    except Exception as e:
        current_app.logger.error(f"Error in /api/track/document: {e}")
        return jsonify({
            "status": "error",
            "message": f"An unexpected error occurred: {str(e)}"
        }), 500