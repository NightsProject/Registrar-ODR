from . import authentication_admin_bp
from flask import jsonify, request, current_app, redirect, url_for, session
from flask_jwt_extended import create_access_token, set_access_cookies, jwt_required, get_jwt_identity
from authlib.integrations.flask_client import OAuth
from config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, FRONTEND_URL
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from ..settings.models import Admin, DomainWhitelist
import secrets
from app.services.logging_service import log_admin_action, log_security_event, log_error, LoggingService
from app.utils.permissions import get_permissions, normalize_role

NAVIGATION_ITEMS = [
    {"key": "dashboard",     "name": "Dashboard",    "path": "/admin/Dashboard",    "icon": "DashboardIcon"},
    {"key": "requests",      "name": "Requests",     "path": "/admin/Requests",     "icon": "RequestsIcon"},
    {"key": "transactions",  "name": "Transactions", "path": "/admin/Transactions", "icon": "PaidIcon"},
    {"key": "documents",     "name": "Documents",    "path": "/admin/Documents",    "icon": "DocumentsIcon"},
    {"key": "logs",          "name": "Logs",         "path": "/admin/Logs",         "icon": "LogsIcon"},
    {"key": "settings",      "name": "Settings",     "path": "/admin/Settings",     "icon": "SettingsIcon"},
    {"key": "developers",    "name": "Developers",   "path": "/admin/Developers",   "icon": "CodeIcon"},
]



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
        hd = email.split("@")[1] if email and "@" in email else None

        if not email or not hd:
            frontend_error_url = f"{FRONTEND_URL}/admin/login?error=invalid_credentials"
            return redirect(frontend_error_url)

        # Check if domain is allowed using whitelist
        if not DomainWhitelist.is_domain_allowed(hd):
            LoggingService.log_user_management("auth_failed", email, f"Unauthorized domain: {hd}")
            frontend_error_url = f"{FRONTEND_URL}/admin/login?error=unauthorized_domain"
            return redirect(frontend_error_url)

        admin = Admin.get_by_email(email)
        if not admin:
            # If database is empty for admins, first account becomes admin automatically
            admin_count = Admin.count()
            role = "admin" if admin_count == 0 else "none"
            Admin.add(email, role, profile_picture)
            
            if role == "admin":
                LoggingService.log_user_management("first_admin_created", email, f"First admin account automatically created")
                access_token = create_access_token(
                    identity=email,
                    additional_claims={"role": role}
                )
                frontend_success_url = f"{FRONTEND_URL}/admin/login?oauth=success&first_admin=true"
                response = redirect(frontend_success_url)
                set_access_cookies(response, access_token)
                return response
            else:
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
        
        # Log admin list access
        log_admin_action(
            action="admins_list_accessed",
            details=f"Admin list retrieved by {get_jwt_identity()}",
            category="USER_MANAGEMENT"
        )
        return jsonify(admins), 200

    except Exception as e:
        log_error("get_admins", f"Error fetching admins: {str(e)}")
        return jsonify({"error": "Failed to fetch admins"}), 500


@authentication_admin_bp.route("/api/admin/admins", methods=["POST"])
@jwt_required()
def add_admin():
    """Add a new admin."""
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    role = data.get("role")

    if not email or not role:
        log_security_event(
            event_type="add_admin_invalid_input",
            details=f"Missing email or role - email: {bool(email)}, role: {bool(role)}",
            severity="WARNING"
        )
        return jsonify({"error": "Email and role are required"}), 400


    if Admin.add(email, role):
        LoggingService.log_user_management("admin_created", email, f"Admin {email} added with role {role}")
        return jsonify({"message": "Admin added successfully"}), 201
    else:
        log_error("add_admin", f"Failed to add admin {email} with role {role}")
        return jsonify({"error": "Failed to add admin"}), 500


@authentication_admin_bp.route("/api/admin/admins/<email>", methods=["PUT"])
@jwt_required()
def update_admin(email):
    """Update an admin's role."""
    data = request.get_json(silent=True) or {}
    role = data.get("role")

    if not role:
        log_security_event(
            event_type="update_admin_invalid_input",
            details=f"Missing role for admin: {email}",
            severity="WARNING"
        )
        return jsonify({"error": "Role is required"}), 400

    if Admin.update(email, role):
        # Log admin role update
        log_admin_action(
            action="admin_role_updated",
            details=f"Admin {email} role changed to {role}",
            category="USER_MANAGEMENT"
        )
        current_app.logger.info(f"Admin {email} role updated to {role}")
        return jsonify({"message": "Admin updated successfully"}), 200
    else:
        log_error("update_admin", f"Failed to update admin {email}")
        return jsonify({"error": "Admin not found"}), 404



@authentication_admin_bp.route("/api/admin/admins/<email>", methods=["DELETE"])
@jwt_required()
def delete_admin(email):
    """Delete an admin."""
    if Admin.delete(email):
        # Log admin deletion
        log_admin_action(
            action="admin_deleted",
            details=f"Admin {email} deleted",
            category="USER_MANAGEMENT"
        )
        current_app.logger.info(f"Admin {email} deleted")
        return jsonify({"message": "Admin deleted successfully"}), 200
    else:
        log_error("delete_admin", f"Failed to delete admin {email}")
        return jsonify({"error": "Admin not found"}), 404



@authentication_admin_bp.route("/api/admin/current-user", methods=["GET"])
@jwt_required()
def get_current_user():
    """
    Return the authenticated admin's profile together with their
    server-computed permissions and filtered navigation list.

    Response shape:
    {
        "email": "john@example.com",
        "role": "manager",
        "permissions": {
            "dashboard": true,
            "requests": true,
            "transactions": false,
            ...
        },
        "navigation": [
            {"key": "dashboard", "name": "Dashboard", "path": "/admin/Dashboard", "icon": "DashboardIcon"},
            ...  // only items the role can access
        ]
    }
    """
    try:
        current_email = get_jwt_identity()
        admin = Admin.get_by_email(current_email)

        if not admin:
            return jsonify({"error": "User not found"}), 404

        role = normalize_role(admin["role"])
        permissions = get_permissions(role)

        # Build the filtered navigation list using the server's permission matrix.
        # The frontend no longer filters this itself.
        allowed_nav = [
            item for item in NAVIGATION_ITEMS
            if permissions.get(item["key"], False)
        ]

        return jsonify({
            "email":       admin["email"],
            "role":        role,
            "permissions": permissions,
            "navigation":  allowed_nav,
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching current user: {e}")
        return jsonify({"error": "Failed to fetch user information"}), 500

@authentication_admin_bp.route("/api/admin/logout", methods=["POST"])
@jwt_required()
def logout():
    """Logout current user."""
    try:
        # Get admin identity before clearing
        admin_id = get_jwt_identity()
        
        # Create response
        response = jsonify({"message": "Logout successful"})
        # Clear the JWT cookie
        set_access_cookies(response, "", max_age=0)

        # Log the logout
        log_admin_action(
            action="admin_logout",
            details=f"Admin {admin_id} logged out",
            category="AUTHENTICATION"
        )

        return response, 200
    except Exception as e:
        current_app.logger.error(f"Error during logout: {e}")
        return jsonify({"error": "Logout failed"}), 500

