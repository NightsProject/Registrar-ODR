from . import manage_request_bp
from flask import jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.decorator import jwt_required_with_role
from .models import ManageRequestModel


# Admin role
role = "admin"


@manage_request_bp.route("/api/admin/requests", methods=["GET"])
@jwt_required_with_role(role)
def get_requests():
    """
    Get paginated requests for admin management.
    """
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        result = ManageRequestModel.get_all_requests(page=page, limit=limit)
        return jsonify({"requests": result["requests"], "total": result["total"]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@manage_request_bp.route("/api/admin/requests/<request_id>/status", methods=["PUT"])
@jwt_required_with_role(role)
def update_request_status(request_id):
    """
    Update the status of a specific request.
    """
    try:
        data = request.get_json()
        new_status = data.get("status")
        payment_status = data.get("payment_status")
        if not new_status:
            return jsonify({"error": "Status is required"}), 400

        # Validate status
        valid_statuses = ["UNCONFIRMED", "SUBMITTED", "PENDING", "IN-PROGRESS", "DOC-READY", "RELEASED", "REJECTED"]
        if new_status not in valid_statuses:
            return jsonify({"error": "Invalid status"}), 400

        # Get admin ID from JWT token
        admin_id = get_jwt_identity()

        success = ManageRequestModel.update_request_status(request_id, new_status, admin_id, payment_status)
        if success:
            return jsonify({"message": "Status updated successfully"}), 200
        else:
            return jsonify({"error": "Request not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@manage_request_bp.route("/api/admin/requests/<request_id>", methods=["DELETE"])
@jwt_required_with_role(role)
def delete_request(request_id):
    """
    Delete a specific request and all associated data.
    """
    try:
        # Get admin ID from JWT token
        admin_id = get_jwt_identity()

        success = ManageRequestModel.delete_request(request_id, admin_id)
        if success:
            return jsonify({"message": "Request deleted successfully"}), 200
        else:
            return jsonify({"error": "Request not found or deletion failed"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@manage_request_bp.route("/api/admin/my-requests", methods=["GET"])
@jwt_required_with_role(role)
def get_my_requests():
    """
    Get paginated requests assigned to the logged-in admin.
    """
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        admin_id = get_jwt_identity()
        result = ManageRequestModel.get_assigned_requests(admin_id, page=page, limit=limit)
        return jsonify({"requests": result["requests"], "total": result["total"]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
