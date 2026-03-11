from . import dashboard_bp
from flask import jsonify
from flask_jwt_extended import unset_jwt_cookies, jwt_required, get_jwt_identity
from app.utils.decorator import jwt_required_with_role
from .models import DashboardModel
from app.services.logging_service import log_admin_action, log_error


@dashboard_bp.route("/api/admin/dashboard", methods=["GET"])
@jwt_required()
def admin_dashboard():
   """
   Protected admin dashboard endpoint.
   Only accessible by users with role='admin'.
   """
   admin_id = get_jwt_identity()
   try:
       stats = DashboardModel.get_stats()
       notifications = DashboardModel.get_notifications()
       recent_activity = DashboardModel.get_recent_activity()

       # Log dashboard access
       log_admin_action(
           action="dashboard_accessed",
           details=f"Dashboard accessed by admin: {admin_id}",
           category="ADMINISTRATION"
       )

       data = {
           "stats": stats,
           "notifications": notifications,
           "recent_activity": recent_activity
       }
       return jsonify(data), 200
   except Exception as e:
       log_error("admin_dashboard", str(e), f"Admin: {admin_id}")
       return jsonify({"error": str(e)}), 500
