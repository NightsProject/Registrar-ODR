from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from app.admin.settings.models import OpenRequestRestriction
import datetime

def jwt_required_with_role(role=None):
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            # Verify JWT exists
            verify_jwt_in_request()

            # Get identity and claims
            identity = get_jwt_identity()  # string or dict depending on version
            claims = get_jwt()             # contains additional_claims

            # Determine user role
            user_role = None
            if isinstance(identity, dict):
                user_role = identity.get("role")
            else:
                user_role = claims.get("role")  # fallback to additional_claims

            # Role check
            if role and user_role != role:
                return jsonify({
                    "error": f"You are forbidden to access this page. Required '{role}' role"
                }), 403

            return fn(*args, **kwargs)
        return decorator
    return wrapper

def request_allowed_required():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            if not is_request_allowed():
                return jsonify({
                    "status": "error",
                    "message": "Requests are not allowed at this time. Please check the available hours and days."
                }), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper

def is_request_allowed():
    """
    Check if requesting is allowed at the current time based on settings.
    """
    now = datetime.datetime.now()
    current_day = now.strftime('%A')  # e.g., 'Monday'
    current_time = now.time()

    settings = OpenRequestRestriction.get_settings()
    if not settings:
        # If no settings, allow by default
        return True

    available_days = settings.get('available_days', [])
    start_time_str = settings.get('start_time', '09:00:00')
    end_time_str = settings.get('end_time', '17:00:00')

    # Parse times
    start_time = datetime.datetime.strptime(start_time_str, '%H:%M:%S').time()
    end_time = datetime.datetime.strptime(end_time_str, '%H:%M:%S').time()

    # Check if current day is allowed
    if current_day not in available_days:
        return False

    # Check if current time is within range
    if start_time <= current_time <= end_time:
        return True
    else:
        return False
