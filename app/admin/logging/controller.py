from . import logging_bp
from flask import render_template, session, redirect, url_for, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.decorator import jwt_required_with_role
from .models import LoggingModel

# Admin role
role = "admin"


@logging_bp.route("/api/admin/logs", methods=["GET"])
@jwt_required_with_role(role)
def get_logs():
    """
    Get all logs for admin view.
    """
    try:
        logs = LoggingModel.get_all_logs()
        return jsonify({"logs": logs}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
