from . import authentication_admin_bp
from flask import jsonify, request, current_app
from flask_jwt_extended import create_access_token, set_access_cookies, jwt_required, get_jwt_identity
from authlib.integrations.flask_client import OAuth
from config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from ..settings.models import Admin


oauth = OAuth(current_app)
google = oauth.register(
   name='google',
   client_id=GOOGLE_CLIENT_ID,
   client_secret=GOOGLE_CLIENT_SECRET,
   authorize_url='https://accounts.google.com/o/oauth2/auth',
   authorize_params=None,
   access_token_url='https://accounts.google.com/o/oauth2/token',
   access_token_params=None,
   refresh_token_url=None,
   redirect_uri='http://localhost:8000/api/admin/google/callback',
   client_kwargs={'scope': 'openid email profile'},
)


@authentication_admin_bp.route("/api/admin/google-login", methods=["POST"])
def google_login():
   """Verify Google ID token and create JWT."""
   data = request.get_json(silent=True) or {}
   token = data.get("token")


   if not token:
       return jsonify({"error": "ID token required"}), 400


   try:
       # Verify the ID token
       CLIENT_ID = GOOGLE_CLIENT_ID
       id_info = id_token.verify_oauth2_token(token, google_requests.Request(), CLIENT_ID)

       email = id_info['email']

    # Check if email is authorized (e.g., domain check)
       if not email.endswith('@g.msuiit.edu.ph'):
           return jsonify({"error": "Unauthorized email, Please use MyIIT Account"}), 403

       # Check if email is in admins table
       admin = Admin.get_by_email(email)
       if not admin:
           # Add email with role "none"
           Admin.add(email, "none")
           current_app.logger.info(f"New admin {email} added with role 'none'")
           return jsonify({"message": "Account created. Waiting for admin approval.", "redirect": "/admin/waiting"}), 201

       # Check if role is "none"
       if admin['role'] == "none":
           current_app.logger.info(f"Admin {email} has role 'none', redirecting to waiting page.")
           return jsonify({"message": "Account pending approval.", "redirect": "/admin/waiting"}), 200

       # Create JWT with role from database
       access_token = create_access_token(
           identity=email,
           additional_claims={"role": admin['role']}
       )

       response = jsonify({"message": "Admin login successful", "role": admin['role']})
       set_access_cookies(response, access_token)

       current_app.logger.info(f"Admin {email} logged in via Google with role {admin['role']}.")
       return response, 200


   except ValueError as e:
       current_app.logger.warning(f"Invalid ID token: {e}")
       return jsonify({"error": "Invalid token"}), 401


@authentication_admin_bp.route("/api/admin/admins", methods=["GET"])
@jwt_required()
def get_admins():
    """Get all admins."""
    try:
        admins = Admin.get_all()
        return jsonify(admins), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching admins: {e}")
        return jsonify({"error": "Failed to fetch admins"}), 500


@authentication_admin_bp.route("/api/admin/admins", methods=["POST"])
@jwt_required()
def add_admin():
    """Add a new admin."""
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    role = data.get("role")

    if not email or not role:
        return jsonify({"error": "Email and role are required"}), 400

    if Admin.add(email, role):
        current_app.logger.info(f"Admin {email} added with role {role}")
        return jsonify({"message": "Admin added successfully"}), 201
    else:
        return jsonify({"error": "Failed to add admin"}), 500


@authentication_admin_bp.route("/api/admin/admins/<email>", methods=["PUT"])
@jwt_required()
def update_admin(email):
    """Update an admin's role."""
    data = request.get_json(silent=True) or {}
    role = data.get("role")

    if not role:
        return jsonify({"error": "Role is required"}), 400

    if Admin.update(email, role):
        current_app.logger.info(f"Admin {email} role updated to {role}")
        return jsonify({"message": "Admin updated successfully"}), 200
    else:
        return jsonify({"error": "Admin not found"}), 404


@authentication_admin_bp.route("/api/admin/admins/<email>", methods=["DELETE"])
@jwt_required()
def delete_admin(email):
    """Delete an admin."""
    if Admin.delete(email):
        current_app.logger.info(f"Admin {email} deleted")
        return jsonify({"message": "Admin deleted successfully"}), 200
    else:
        return jsonify({"error": "Admin not found"}), 404
