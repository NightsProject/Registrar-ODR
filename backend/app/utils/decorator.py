from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from app.admin.settings.models import OpenRequestRestriction, AvailableDates
from app.utils.time_utils import get_philippine_time_info, parse_time_string
from app.utils.permissions import normalize_role, has_permission
import datetime
import json


def _extract_role() -> str:
    """
    Pull the role out of the current request's JWT.
    Works whether the role is stored in the identity dict or in
    additional_claims (both patterns are used in this project).
    """
    identity = get_jwt_identity()
    claims = get_jwt()

    raw = (
        identity.get("role") if isinstance(identity, dict)
        else claims.get("role")
    )
    return normalize_role(raw)


# ---------------------------------------------------------------------------
# Existing decorator — kept 100% backward-compatible
# ---------------------------------------------------------------------------
def jwt_required_with_role(role=None):
    """
    Verify a valid JWT is present and, optionally, that the caller holds
    exactly the specified role.

    Usage:
        @jwt_required_with_role("admin")   # admins only
        @jwt_required_with_role()          # any authenticated user
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()

            if role:
                user_role = _extract_role()
                if user_role != role:
                    return jsonify({
                        "error": (
                            f"Forbidden. Required role: '{role}', "
                            f"your role: '{user_role}'"
                        )
                    }), 403

            return fn(*args, **kwargs)
        return decorator
    return wrapper


# ---------------------------------------------------------------------------
# New decorator — feature-level permission check
# ---------------------------------------------------------------------------
def permission_required(feature: str):
    """
    Verify a valid JWT is present AND that the caller's role has access
    to *feature* according to the server-side ROLE_PERMISSIONS matrix.

    Because permission decisions live in permissions.py (server only),
    a user cannot bypass this by editing their browser state.

    Usage:
        @permission_required("settings")
        @permission_required("transactions")
        @permission_required("developers")
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            user_role = _extract_role()

            if not has_permission(user_role, feature):
                return jsonify({
                    "error": (
                        f"Forbidden. Your role '{user_role}' does not "
                        f"have access to '{feature}'."
                    )
                }), 403

            return fn(*args, **kwargs)
        return decorator
    return wrapper


# ---------------------------------------------------------------------------
# Existing decorator — unchanged
# ---------------------------------------------------------------------------
def request_allowed_required():
    """Block requests outside the configured operating hours."""
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            if not is_request_allowed():
                return jsonify({
                    "status": "error",
                    "message": (
                        "Requests are not allowed at this time. "
                        "Please check the available hours and days."
                    ),
                }), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper


def is_request_allowed() -> bool:
    """
    Check if requesting is allowed at the current time based on settings.
    Precedence order: Time → Date → Day
    Uses Philippine time (UTC+8) for all time calculations.
    """
    try:
        ph_time_info = get_philippine_time_info()
        current_time = ph_time_info["time"]
        current_date = ph_time_info["date"]
        current_day  = ph_time_info["day_name"]

        # Date-specific override has highest precedence
        date_setting = AvailableDates.get_date_setting(current_date)
        if date_setting is not None:
            return date_setting

        restriction = OpenRequestRestriction.get_settings()
        if not restriction:
            return True

        # Time window check
        start_time = parse_time_string(restriction.get("start_time"))
        end_time   = parse_time_string(restriction.get("end_time"))
        if start_time and end_time:
            if not (start_time <= current_time <= end_time):
                return False

        # Day-of-week check
        available_days = restriction.get("available_days", [])
        if isinstance(available_days, str):
            try:
                available_days = json.loads(available_days)
            except (json.JSONDecodeError, TypeError):
                available_days = []

        if available_days and current_day not in available_days:
            return False

        return True

    except Exception:
        return True   # Fail open — a settings bug should never block all users