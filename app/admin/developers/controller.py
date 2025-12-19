
from . import developers_bp
from flask import jsonify, request, current_app
from flask_jwt_extended import jwt_required
from app.utils.decorator import jwt_required_with_role
from .models import TestModeSettings, Feedback, TestRegistration
import re


@developers_bp.route("/api/developers/test-mode", methods=["GET"])
def get_test_mode():
    """Get current test mode setting."""
    try:
        test_mode = TestModeSettings.get_test_mode()
        return jsonify({"test_mode": test_mode}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching test mode: {e}")
        return jsonify({"error": "Failed to fetch test mode"}), 500


@developers_bp.route("/api/developers/test-mode", methods=["PUT"])
@jwt_required()
@jwt_required_with_role("developer")
def update_test_mode():
    """Update test mode setting."""
    data = request.get_json(silent=True) or {}
    test_mode = data.get("test_mode")
    
    if test_mode is None:
        return jsonify({"error": "test_mode is required"}), 400
    
    try:
        if TestModeSettings.update_test_mode(bool(test_mode)):
            current_app.logger.info(f"Test mode updated to {test_mode}")
            return jsonify({"message": "Test mode updated successfully"}), 200
        else:
            return jsonify({"error": "Failed to update test mode"}), 500
    except Exception as e:
        current_app.logger.error(f"Error updating test mode: {e}")
        return jsonify({"error": "Failed to update test mode"}), 500

@developers_bp.route("/api/developers/feedback", methods=["POST"])
def submit_feedback():
    """Submit feedback (no authentication required for test mode)."""
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    email = data.get("email")
    feedback_type = data.get("feedback_type")
    description = data.get("description")
    steps_to_reproduce = data.get("steps_to_reproduce", "")
    
    # Validation
    if not all([name, email, feedback_type, description]):
        return jsonify({"error": "Name, email, feedback type, and description are required"}), 400
    
    if feedback_type not in ["Bug Report", "Feature Request", "General Feedback"]:
        return jsonify({"error": "Invalid feedback type"}), 400
    
    if feedback_type == "Bug Report" and not steps_to_reproduce:
        return jsonify({"error": "Steps to reproduce are required for bug reports"}), 400
    
    # Validate email format
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return jsonify({"error": "Invalid email format"}), 400
    
    try:
        feedback_id = Feedback.create(name, email, feedback_type, description, steps_to_reproduce)
        if feedback_id:
            current_app.logger.info(f"Feedback submitted: {feedback_id}")
            return jsonify({"message": "Feedback submitted successfully", "feedback_id": feedback_id}), 201
        else:
            return jsonify({"error": "Failed to submit feedback"}), 500
    except Exception as e:
        current_app.logger.error(f"Error submitting feedback: {e}")
        return jsonify({"error": "Failed to submit feedback"}), 500


@developers_bp.route("/api/developers/feedback", methods=["GET"])
@jwt_required()
@jwt_required_with_role("developer")
def get_feedback():
    """Get all feedback entries."""
    try:
        feedback_list = Feedback.get_all()
        return jsonify({"feedback": feedback_list}), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching feedback: {e}")
        return jsonify({"error": "Failed to fetch feedback"}), 500


@developers_bp.route("/api/developers/feedback/<int:feedback_id>", methods=["PUT"])
@jwt_required()
@jwt_required_with_role("developer")
def update_feedback_status(feedback_id):
    """Update feedback status."""
    data = request.get_json(silent=True) or {}
    status = data.get("status")
    
    if not status:
        return jsonify({"error": "Status is required"}), 400
    
    if status not in ["NEW", "IN PROGRESS", "RESOLVED", "CLOSED"]:
        return jsonify({"error": "Invalid status"}), 400
    
    try:
        if Feedback.update_status(feedback_id, status):
            current_app.logger.info(f"Feedback {feedback_id} status updated to {status}")
            return jsonify({"message": "Feedback status updated successfully"}), 200
        else:
            return jsonify({"error": "Feedback not found"}), 404
    except Exception as e:
        current_app.logger.error(f"Error updating feedback status: {e}")
        return jsonify({"error": "Failed to update feedback status"}), 500


@developers_bp.route("/api/developers/feedback/<int:feedback_id>", methods=["DELETE"])
@jwt_required()
@jwt_required_with_role("developer")
def delete_feedback(feedback_id):
    """Delete feedback entry."""
    try:
        if Feedback.delete(feedback_id):
            current_app.logger.info(f"Feedback {feedback_id} deleted")
            return jsonify({"message": "Feedback deleted successfully"}), 200
        else:
            return jsonify({"error": "Feedback not found"}), 404
    except Exception as e:
        current_app.logger.error(f"Error deleting feedback: {e}")
        return jsonify({"error": "Failed to delete feedback"}), 500


@developers_bp.route("/api/developers/test-registration/student", methods=["POST"])
def register_student():
    """Register student with dual registration (test + main tables if test mode ON)."""
    data = request.get_json(silent=True) or {}
    
    # Required fields
    required_fields = ['student_id', 'firstname', 'lastname', 'contact_number', 'email', 'college_code']
    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400
    
    # Validate phone number format (639xxxxxxxxx)
    contact_number = data.get('contact_number')
    phone_pattern = r'^639\d{9}$'
    if not re.match(phone_pattern, contact_number):
        return jsonify({"error": "Contact number must be in format 639xxxxxxxxx"}), 400
    
    # Validate email format
    email = data.get('email')
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return jsonify({"error": "Invalid email format"}), 400
    
    # Create student data
    student_data = {
        'student_id': data.get('student_id'),
        'full_name': f"{data.get('firstname')} {data.get('lastname')}",
        'contact_number': contact_number,
        'email': email,
        'firstname': data.get('firstname'),
        'lastname': data.get('lastname'),
        'college_code': data.get('college_code')
    }
    
    try:
        if TestRegistration.create_student(student_data):
            # Get current test mode state for response
            test_mode = TestModeSettings.get_test_mode()
            message = f"Student registered successfully ({'test mode ON - registered in both tables' if test_mode else 'test mode OFF - registered in test table only'})"
            current_app.logger.info(f"Student {data.get('student_id')} registered - {message}")
            return jsonify({"message": message}), 201
        else:
            return jsonify({"error": "Failed to register student"}), 500
    except ValueError as ve:
        current_app.logger.warning(f"Validation error registering student: {ve}")
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        current_app.logger.error(f"Error registering student: {e}")
        return jsonify({"error": "Failed to register student"}), 500


@developers_bp.route("/api/developers/test-registration/student/<student_id>", methods=["GET"])
@jwt_required()
@jwt_required_with_role("developer")
def get_student(student_id):
    """Get student by ID."""
    try:
        student = TestRegistration.get_student(student_id)
        if student:
            return jsonify(student), 200
        else:
            return jsonify({"message": "Student not found"}), 404
    except Exception as e:
        current_app.logger.error(f"Error fetching student: {e}")
        return jsonify({"error": "Failed to fetch student"}), 500


@developers_bp.route("/api/developers/test-registration/admin", methods=["POST"])
def register_admin():
    """Register admin with dual registration (test + main tables if test mode ON)."""
    data = request.get_json(silent=True) or {}
    
    # Required fields
    if not data.get('email') or not data.get('role'):
        return jsonify({"error": "Email and role are required"}), 400
    
    # Validate role
    valid_roles = ['admin', 'manager', 'auditor', 'staff']
    role = data.get('role')
    if role not in valid_roles:
        return jsonify({"error": f"Role must be one of: {', '.join(valid_roles)}"}), 400
    
    # Validate email format
    email = data.get('email')
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return jsonify({"error": "Invalid email format"}), 400
    
    admin_data = {
        'email': email,
        'role': role,
        'profile_picture': data.get('profile_picture', '')
    }
    
    try:
        if TestRegistration.create_admin(admin_data):
            # Get current test mode state for response
            test_mode = TestModeSettings.get_test_mode()
            message = f"Admin registered successfully ({'test mode ON - registered in both tables' if test_mode else 'test mode OFF - registered in test table only'})"
            current_app.logger.info(f"Admin {email} registered - {message}")
            return jsonify({"message": message}), 201
        else:
            return jsonify({"error": "Failed to register admin"}), 500
    except ValueError as ve:
        current_app.logger.warning(f"Validation error registering admin: {ve}")
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        current_app.logger.error(f"Error registering admin: {e}")
        return jsonify({"error": "Failed to register admin"}), 500



@developers_bp.route("/api/developers/test-registration/admin/<email>", methods=["GET"])
@jwt_required()
@jwt_required_with_role("developer")
def get_admin(email):
    """Get admin by email."""
    try:
        admin = TestRegistration.get_admin(email)
        if admin:
            return jsonify(admin), 200
        else:
            return jsonify({"message": "Admin not found"}), 404
    except Exception as e:
        current_app.logger.error(f"Error fetching admin: {e}")
        return jsonify({"error": "Failed to fetch admin"}), 500

@developers_bp.route("/api/developers/test-registration/validate/student", methods=["POST"])
def validate_student_uniqueness():
    """Validate student ID and email uniqueness across relevant tables."""
    data = request.get_json(silent=True) or {}
    student_id = data.get('student_id')
    email = data.get('email')
    
    if not student_id or not email:
        return jsonify({"error": "Student ID and email are required"}), 400
    
    try:
        # Check student ID uniqueness
        student_id_valid = TestModeSettings.validate_student_id_uniqueness(student_id)
        if not student_id_valid:
            return jsonify({
                "isValid": False,
                "error": "Student ID already exists in students or test_students tables"
            }), 400
        
        return jsonify({
            "isValid": True,
            "message": "Student ID are unique"
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error validating student uniqueness: {e}")
        return jsonify({"error": "Failed to validate uniqueness"}), 500

@developers_bp.route("/api/developers/test-registration/validate/admin", methods=["POST"])
def validate_admin_uniqueness():
    """Validate email uniqueness across all tables for admin registration."""
    data = request.get_json(silent=True) or {}
    email = data.get('email')
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
    
    try:
        # Check email uniqueness across all tables
        email_valid = TestModeSettings.validate_email_uniqueness(email)
        if not email_valid:
            return jsonify({
                "isValid": False,
                "error": "Email already exists in students, test_students, admins, or test_admins tables"
            }), 400
        
        return jsonify({
            "isValid": True,
            "message": "Email is unique"
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error validating admin uniqueness: {e}")
        return jsonify({"error": "Failed to validate uniqueness"}), 500

