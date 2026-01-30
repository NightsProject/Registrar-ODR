from . import dashboard_bp
from flask import jsonify
from flask_jwt_extended import unset_jwt_cookies, jwt_required
from app.utils.decorator import jwt_required_with_role
from .models import DashboardModel


@dashboard_bp.route("/api/admin/dashboard", methods=["GET"])
@jwt_required()
def admin_dashboard():
   """
   Protected admin dashboard endpoint.
   Only accessible by users with role='admin'.
   """
   try:
       stats = DashboardModel.get_stats()
       notifications = DashboardModel.get_notifications()
       recent_activity = DashboardModel.get_recent_activity()


       data = {
           "stats": stats,
           "notifications": notifications,
           "recent_activity": recent_activity
       }
       return jsonify(data), 200
   except Exception as e:
       return jsonify({"error": str(e)}), 500

@dashboard_bp.route("/api/admin/logout", methods=["POST"])
@jwt_required()
def admin_logout():
   """
   Logout admin by clearing JWT cookies.
   """
   response = jsonify({"message": "Logged out successfully"})
   unset_jwt_cookies(response)  # clears JWT + CSRF cookies
   return response, 200
