# user/payment/controller.py
from flask import request, jsonify, current_app, g
import os
from . import payment_bp
from ...whatsapp.controller import send_whatsapp_message
from app.user.authentication.models import AuthenticationUser
from .models import Payment
import hmac
import hashlib
from flask_jwt_extended import jwt_required

# Toggle to true for local testing
MAYA_DISABLE_SECURITY = os.getenv('MAYA_DISABLE_SECURITY', 'false').lower() == 'true'

def send_whatsapp_payment_confirmation(phone, full_name, request_id):
    template_name = "odr_payment_successful_v2"

    components = [
        {
            "type": "body",
            "parameters" : [
                {"type": "text", "text": str(full_name)},
                {"type": "text", "text": str(request_id)}
            ]
        }
    ]

    print(f"[Payment Successful] Sending payment confirmation to {phone} for request {request_id}")

    result = send_whatsapp_message(phone, template_name, components)

    if "error" in result:
        current_app.logger.error(f"WhatsApp send failed for {phone}: {result['error']}")
        return {"status": "failed", "message": "Failed to send payment confirmation to WhatsApp"}

    return {"status": "success"}

@payment_bp.before_request
def verify_maya_ip():
    """Verify request comes from Maya servers"""
    if MAYA_DISABLE_SECURITY:
        current_app.logger.warning("[MAYA] IP check disabled via MAYA_DISABLE_SECURITY")
        return

    # Skip IP verification for non-webhook routes if needed
    if request.endpoint != 'payment.maya_webhook':
        return


@payment_bp.route('/maya/webhook', methods=['POST'])
def maya_webhook():
    """Handle Maya payment webhook"""
    try:
        maya_signature = request.headers.get('PayMaya-Signature')
        current_app.logger.info(f"[MAYA] Webhook received. Signature present: {bool(maya_signature)}")
        
        if not verify_signature(request.data, maya_signature):
            current_app.logger.warning("Invalid webhook signature")
            return jsonify({'error': 'Invalid signature'}), 401
        
        payload = request.get_json()
        current_app.logger.info(f"[MAYA] Payload received: {payload}")
        
        status = payload.get('status')
        tracking_number = payload.get('requestReferenceNumber') or payload.get('trackingNumber') or payload.get('metadata', {}).get('trackingNumber')
        payment_id = payload.get('id')
        amount = payload.get('totalAmount', {}).get('value')
        student_id = payload.get('studentId') or payload.get('metadata', {}).get('studentId')
        current_app.logger.info(f"[MAYA] Parsed fields -> status: {status}, tracking: {tracking_number}, amount: {amount}, student_id: {student_id}, payment_id: {payment_id}")
        
        if status == 'PAYMENT_SUCCESS' and tracking_number:
            # Process payment
            result = Payment.process_webhook_payment(tracking_number, amount, student_id)
            
            if result['success']:
                current_app.logger.info(
                    f"[MAYA] Payment confirmed: {tracking_number}, Payment ID: {payment_id}"
                )
            else:
                current_app.logger.warning(
                    f"[MAYA] Payment processing failed for {tracking_number}: {result['message']}"
                )
        else:
            current_app.logger.warning(f"[MAYA] Unexpected status or missing tracking number: status={status}, tracking={tracking_number}")
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        current_app.logger.error(f"[MAYA] Webhook error: {str(e)}")
        # Return success to prevent Maya from retrying for transient errors
        return jsonify({'success': True}), 200


def verify_signature(payload_bytes, signature):
    """Verify webhook signature"""
    if MAYA_DISABLE_SECURITY:
        current_app.logger.warning("[MAYA] Signature check disabled via MAYA_DISABLE_SECURITY")
        return True

    if not signature:
        return False
    
    secret_key = os.getenv('MAYA_SECRET_KEY')
    if not secret_key:
        current_app.logger.error("MAYA_SECRET_KEY not configured")
        return False
    
    expected = hmac.new(
        secret_key.encode('utf-8'),
        payload_bytes,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected)


@payment_bp.route('/mark-paid', methods=['POST'])
def mark_paid_manual():
    try:
        data = request.get_json() or {}
        tracking_number = data.get('trackingNumber') or data.get('tracking_number')
        amount = data.get('amount')
        student_id = data.get('studentId')

        current_app.logger.info(f"[MAYA][BROWSER] Mark-paid request: tracking={tracking_number}, amount={amount}, student_id={student_id}")

        if not tracking_number or student_id is None:
            return jsonify({'success': False, 'message': 'trackingNumber and studentId are required'}), 400

        result = Payment.process_webhook_payment(tracking_number, amount, student_id)
        
        if result.get("success"):
            if result.get("was_already_paid"):
                return jsonify(result), 200
            
            user_data = AuthenticationUser.check_student_in_school_system(student_id)
            
            if user_data.get("exists"):
                phone_number = user_data.get("phone_number") 
                full_name = user_data.get("full_name") if user_data else "Valued Customer"
                
                if phone_number:
                    whatsapp_result = send_whatsapp_payment_confirmation(
                        phone_number, 
                        full_name, 
                        tracking_number
                    )
                    
                    if whatsapp_result.get("status") == "failed":
                        current_app.logger.error(
                            f"[MAYA] Failed to send WhatsApp payment confirmation for {tracking_number} to {phone_number}: {whatsapp_result.get('message')}"
                        )
                else:
                    current_app.logger.warning(
                        f"[MAYA] Phone number missing for student {student_id}."
                    )
        else:
            current_app.logger.warning(f"[MAYA][BROWSER] mark-paid failed for {tracking_number}: {result.get('message')}")
        
        status_code = 200 if result.get('success') else 400
        return jsonify(result), status_code
    except Exception as e:
        current_app.logger.error(f"[MAYA][BROWSER] mark-paid error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500





@payment_bp.route('/mark-document-paid', methods=['POST'])
def mark_document_paid():
    try:
        data = request.get_json() or {}
        tracking_number = data.get('trackingNumber') or data.get('tracking_number')
        amount = data.get('amount')
        student_id = data.get('studentId')
        doc_ids = data.get('docIds', [])  # List of document IDs to mark as paid

        current_app.logger.info(f"[MAYA][BROWSER] Mark-document-paid request: tracking={tracking_number}, amount={amount}, student_id={student_id}, docIds={doc_ids}")

        if not tracking_number or student_id is None:
            return jsonify({'success': False, 'message': 'trackingNumber and studentId are required'}), 400

        if not doc_ids:
            return jsonify({'success': False, 'message': 'docIds (list of document IDs) are required'}), 400

        # Use the new document-level payment method
        result = Payment.update_multiple_documents_payment_status(tracking_number, student_id, doc_ids)
        
        if result.get("success"):
            # Send WhatsApp notification
            user_data = AuthenticationUser.check_student_in_school_system(student_id)
            
            if user_data.get("exists"):
                phone_number = user_data.get("phone_number") 
                full_name = user_data.get("full_name") if user_data else "Valued Customer"
                
                if phone_number:
                    whatsapp_result = send_whatsapp_payment_confirmation(
                        phone_number, 
                        full_name, 
                        tracking_number
                    )
                    
                    if whatsapp_result.get("status") == "failed":
                        current_app.logger.error(
                            f"[MAYA] Failed to send WhatsApp payment confirmation for {tracking_number} to {phone_number}: {whatsapp_result.get('message')}"
                        )
                else:
                    current_app.logger.warning(
                        f"[MAYA] Phone number missing for student {student_id}."
                    )
        else:
            current_app.logger.warning(
                f"[MAYA] Document payment update failed for {tracking_number}: {result.get('message')}"
            )
        
        status_code = 200 if result.get('success') else 400
        return jsonify(result), status_code
    except Exception as e:
        current_app.logger.error(f"[MAYA][BROWSER] mark-document-paid error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500
