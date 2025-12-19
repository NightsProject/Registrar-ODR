
from . import authentication_admin_bp
from flask import jsonify, request, current_app, redirect, url_for, session
from flask_jwt_extended import create_access_token, set_access_cookies, jwt_required, get_jwt_identity
from authlib.integrations.flask_client import OAuth
from config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, FRONTEND_URL
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from ..settings.models import Admin
import secrets
from app.services.logging_service import LoggingService

# =========================
# OAuth setup (will be initialized in create_app)
# =========================
oauth = None
google = None

def init_oauth(app):
    global oauth, google
    oauth = OAuth(app)
    google = oauth.register(
    name='google',
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile"
    },
    claims_options={
        "iss": {
            "values": [
                "https://accounts.google.com",
                "accounts.google.com"
            ]
        }
    }
)


# =========================
# OAuth Redirect Flow
# =========================
@authentication_admin_bp.route("/api/admin/google/initiate")
def initiate_google_login():
    """Redirect user to Google OAuth 2.0"""
    state = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(32)
    session['oauth_state'] = state
    session['oauth_nonce'] = nonce
    redirect_uri = url_for("authentication_admin.google_oauth_callback", _external=True)
    return google.authorize_redirect(
        redirect_uri,
        state=state,
        nonce=nonce  # send nonce to Google
    )


@authentication_admin_bp.route("/api/admin/google/callback")
def google_oauth_callback():
    try:
        state = request.args.get("state")
        stored_state = session.pop("oauth_state", None)
        nonce = session.pop("oauth_nonce", None)  # retrieve nonce

        if not state or state != stored_state:
            frontend_error_url = f"{FRONTEND_URL}/admin/login?error=invalid_state"
            return redirect(frontend_error_url)

        token = google.authorize_access_token()
        user_info = google.parse_id_token(token, nonce=nonce)  # pass nonce here 
        profile_picture = user_info['picture']
        email = user_info.get("email")
        hd = user_info.get("hd")

        if not email or hd != "g.msuiit.edu.ph":
            frontend_error_url = f"{FRONTEND_URL}/admin/login?error=unauthorized_domain"
            return redirect(frontend_error_url)

        admin = Admin.get_by_email(email)
        if not admin:
            Admin.add(email, "none", profile_picture)
            frontend_waiting_url = f"{FRONTEND_URL}/admin/waiting"
            return redirect(frontend_waiting_url)
        if admin["role"] == "none":
            frontend_waiting_url = f"{FRONTEND_URL}/admin/waiting"
            return redirect(frontend_waiting_url)

        access_token = create_access_token(
            identity=email,
            additional_claims={"role": admin["role"]}
        )
        frontend_success_url = f"{FRONTEND_URL}/admin/login?oauth=success"
        response = redirect(frontend_success_url)
        set_access_cookies(response, access_token)
        return response

    except Exception as e:
        current_app.logger.error(f"Google OAuth callback error: {e}")
        frontend_error_url = f"{FRONTEND_URL}/admin/login?error=oauth_error"
        return redirect(frontend_error_url)

@authentication_admin_bp.route("/api/admin/admins", methods=["GET"])
@jwt_required()
def get_admins():
    """Get all admins."""
    try:
        admins = Admin.get_all()
        return jsonify(admins), 200

    except Exception as e:
        LoggingService.log_error("get_admins", f"Error fetching admins: {str(e)}")
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
        LoggingService.log_user_management("admin_created", email, f"Admin {email} added with role {role}")
        return jsonify({"message": "Admin added successfully"}), 201
    else:
        LoggingService.log_error("add_admin", f"Failed to add admin {email} with role {role}")
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



@authentication_admin_bp.route("/api/admin/current-user", methods=["GET"])
@jwt_required()
def get_current_user():
    """Get current authenticated user information."""
    try:
        current_email = get_jwt_identity()
        admin = Admin.get_by_email(current_email)
        

        if admin:
            return jsonify({
                "email": admin['email'],
                "role": admin['role']
            }), 200
        else:
            return jsonify({"error": "User not found"}), 404
    except Exception as e:
        current_app.logger.error(f"Error fetching current user: {e}")
        return jsonify({"error": "Failed to fetch user information"}), 500


@authentication_admin_bp.route("/api/admin/logout", methods=["POST"])
@jwt_required()
def logout():
    """Logout current user."""
    try:
        # Create response
        response = jsonify({"message": "Logout successful"})
        # Clear the JWT cookie
        set_access_cookies(response, "", max_age=0)
        return response, 200
    except Exception as e:
        current_app.logger.error(f"Error during logout: {e}")
        return jsonify({"error": "Logout failed"}), 500

