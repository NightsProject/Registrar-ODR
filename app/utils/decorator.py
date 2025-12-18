from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from app.admin.settings.models import OpenRequestRestriction, AvailableDates
from app.utils.time_utils import get_philippine_time_info, parse_time_string
import datetime
import json

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
    Precedence order: Time → Date → Day
    Uses Philippine time (UTC+8) for all time calculations.
    """
    try:
        # Get current Philippine time
        time_info = get_philippine_time_info()
        current_time = time_info['current_time']
        current_day = time_info['current_day']
        current_date_str = time_info['current_date_str']

        # STEP 1: Check time restrictions first (highest priority)
        settings = OpenRequestRestriction.get_settings()
        if settings:
            start_time_str = settings.get('start_time', '09:00:00')
            end_time_str = settings.get('end_time', '17:00:00')

            # Validate time strings and provide defaults
            start_time = parse_time_string(start_time_str) or datetime.time(9, 0, 0)
            end_time = parse_time_string(end_time_str) or datetime.time(17, 0, 0)


            # Handle time range logic properly
            # For same-day requests: start_time <= current_time <= end_time
            # For overnight requests: current_time >= start_time OR current_time <= end_time
            time_allowed = False
            if start_time <= end_time:
                # Same day range (e.g., 09:00 to 17:00)
                time_allowed = start_time <= current_time <= end_time
                print(f"Philippine Time check: {current_time} between {start_time} and {end_time}: {time_allowed}")
            else:
                # Overnight range (e.g., 22:00 to 06:00)
                time_allowed = current_time >= start_time or current_time <= end_time
                print(f"Overnight Philippine Time check: {current_time} >= {start_time} or {current_time} <= {end_time}: {time_allowed}")

            # If not within allowed time, deny immediately
            if not time_allowed:
                print(f"Philippine Time {current_time} is outside allowed range {start_time} to {end_time}")
                return False

        # STEP 2: Check date-specific restrictions second
        date_availability = AvailableDates.is_date_available(current_date_str)
        
        if date_availability is not None:
            # Specific date setting exists
            if not date_availability:
                # Date is explicitly marked as unavailable
                print(f"Date {current_date_str} is marked as unavailable")
                return False
            else:
                # Date is explicitly marked as available - allow regardless of day
                print(f"Date {current_date_str} is marked as available")
                return True

        # STEP 3: No specific date setting, check day restrictions (lowest priority)
        if settings:
            # Handle available_days - could be JSON string or list
            available_days_raw = settings.get('available_days', [])
            if isinstance(available_days_raw, str):
                try:
                    available_days = json.loads(available_days_raw)
                except json.JSONDecodeError:
                    # Fallback to default if JSON parsing fails
                    available_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
            else:
                available_days = available_days_raw

            # Check if current day is allowed
            if current_day not in available_days:
                print(f"Current day {current_day} is not in allowed days: {available_days}")
                return False

        # If we get here, all checks passed
        return True

    except Exception as e:
        print(f"Error in is_request_allowed: {e}")
        # If there's any error, allow requests by default
        return True
