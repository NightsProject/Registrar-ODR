from . import settings_bp
from flask import jsonify, request, current_app
from app.utils.decorator import jwt_required_with_role
from .models import Admin, OpenRequestRestriction, Fee, AvailableDates, DomainWhitelist
from flask_jwt_extended import jwt_required
from app.services.logging_service import log_admin_action, log_system_event, log_error, log_security_event
import json

role = "admin"

@settings_bp.route("/api/admin/admins", methods=["GET"])
@jwt_required()
def get_admins():
    """Get all admins."""
    try:
        admins = Admin.get_all()
        
        # Log admin list access
        log_admin_action(
            action="admins_list_accessed",
            details="Admin list retrieved",
            category="USER_MANAGEMENT"
        )
        return jsonify(admins), 200
    except Exception as e:
        log_error("get_admins_settings", str(e))
        current_app.logger.error(f"Error fetching admins: {e}")
        return jsonify({"error": "Failed to fetch admins"}), 500


@settings_bp.route("/api/admin/admins", methods=["POST"])
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
        # Log admin addition
        log_admin_action(
            action="admin_created",
            details=f"Admin {email} added with role {role}",
            category="USER_MANAGEMENT"
        )
        current_app.logger.info(f"Admin {email} added with role {role}")
        return jsonify({"message": "Admin added successfully"}), 201
    else:
        log_error("add_admin", f"Failed to add admin {email} with role {role}")
        return jsonify({"error": "Failed to add admin"}), 500


@settings_bp.route("/api/admin/admins/<email>", methods=["PUT"])
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
        log_error("update_admin_settings", f"Failed to update admin {email}")
        return jsonify({"error": "Admin not found"}), 404


@settings_bp.route("/api/admin/admins/<email>", methods=["DELETE"])
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
        log_error("delete_admin_settings", f"Failed to delete admin {email}")
        return jsonify({"error": "Admin not found"}), 404


@settings_bp.route("/api/admin/settings", methods=["GET"])
def get_settings():
    """Get current settings."""
    try:
        settings = OpenRequestRestriction.get_settings()
        if settings:
            # Ensure all required fields are present
            default_settings = {
                "start_time": "09:00:00",
                "end_time": "17:00:00",
                "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                "announcement": ""
            }
            
            # Merge with defaults to ensure all fields exist
            complete_settings = {**default_settings, **settings}
            
            # Log settings access
            log_system_event(
                event_type="settings_accessed",
                details="Settings retrieved"
            )
            return jsonify(complete_settings), 200
        else:
            # Return default settings if no settings exist
            return jsonify({
                "start_time": "09:00:00",
                "end_time": "17:00:00",
                "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                "announcement": ""
            }), 200
    except Exception as e:
        log_error("get_settings", str(e))
        current_app.logger.error(f"Error fetching settings: {e}")
        # Return default settings on error
        return jsonify({
            "start_time": "09:00:00",
            "end_time": "17:00:00",
            "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            "announcement": "",
            "error": "Failed to fetch settings"
        }), 200


@settings_bp.route("/api/admin/settings", methods=["PUT"])
@jwt_required()
def update_settings():
    """Update settings."""
    data = request.get_json(silent=True) or {}
    start_time = data.get("start_time")
    end_time = data.get("end_time")
    available_days = data.get("available_days")
    announcement = data.get("announcement", "")

    if not start_time or not end_time or not available_days:
        log_security_event(
            event_type="update_settings_invalid_input",
            details=f"Missing required fields - start_time: {bool(start_time)}, end_time: {bool(end_time)}, available_days: {bool(available_days)}",
            severity="WARNING"
        )
        return jsonify({"error": "start_time, end_time, and available_days are required"}), 400

    # Ensure available_days is a list (in case it comes as a string)
    if isinstance(available_days, str):
        try:
            available_days = json.loads(available_days)
        except (json.JSONDecodeError, TypeError):
            log_security_event(
                event_type="update_settings_invalid_days",
                details="available_days must be a valid JSON array",
                severity="WARNING"
            )
            return jsonify({"error": "available_days must be a valid JSON array"}), 400

    if OpenRequestRestriction.update_settings(start_time, end_time, available_days, announcement):
        # Log settings update
        log_system_event(
            event_type="settings_updated",
            details=f"Time: {start_time}-{end_time}, Days: {', '.join(available_days)}"
        )
        current_app.logger.info("Settings updated")
        return jsonify({"message": "Settings updated successfully"}), 200
    else:
        log_error("update_settings", "Failed to update settings")
        return jsonify({"error": "Failed to update settings"}), 500

@settings_bp.route("/api/admin/settings/fee", methods=["GET"])
@jwt_required()
def get_admin_fee():
    """Get current admin fee."""
    try:
        value = Fee.get_value('admin_fee')
        
        # Log fee access
        log_system_event(
            event_type="admin_fee_accessed",
            details=f"Fee value retrieved: {value}"
        )
        return jsonify({'admin_fee': value}), 200
    except Exception as e:
        log_error("get_admin_fee", str(e))
        current_app.logger.error(f"Error fetching admin fee: {e}")
        return jsonify({"error": "Failed to fetch admin fee"}), 500


@settings_bp.route("/api/admin/settings/fee", methods=["PUT"])
@jwt_required()
def update_admin_fee():
    """Update admin fee."""
    data = request.get_json(silent=True) or {}
    admin_fee = data.get('admin_fee')

    if admin_fee is None:
        log_security_event(
            event_type="update_admin_fee_invalid_input",
            details="Missing admin_fee value",
            severity="WARNING"
        )
        return jsonify({"error": "admin_fee is required"}), 400

    if Fee.update_value('admin_fee', admin_fee):
        # Log fee update
        log_system_event(
            event_type="admin_fee_updated",
            details=f"New fee: ₱{admin_fee}"
        )
        current_app.logger.info(f"Admin fee updated to {admin_fee}")
        return jsonify({"message": "Admin fee updated successfully"}), 200
    else:
        log_error("update_admin_fee", "Failed to update admin fee")
        return jsonify({"error": "Failed to update admin fee"}), 500


# ==========================
# DATE AVAILABILITY MANAGEMENT ENDPOINTS
# ==========================

@settings_bp.route("/api/admin/available-dates", methods=["GET"])
@jwt_required()
def get_available_dates():
    """Get all date availability settings."""
    try:
        date_settings = AvailableDates.get_all()
        
        # Log date settings access
        log_system_event(
            event_type="available_dates_accessed",
            details=f"Retrieved {len(date_settings)} date settings"
        )
        return jsonify({"date_settings": date_settings}), 200
    except Exception as e:
        log_error("get_available_dates", str(e))
        current_app.logger.error(f"Error fetching available dates: {e}")
        return jsonify({"error": "Failed to fetch available dates"}), 500


@settings_bp.route("/api/admin/available-dates/<date>", methods=["GET"])
@jwt_required()
def get_available_date(date):
    """Get availability for a specific date."""
    try:
        date_setting = AvailableDates.get_by_date(date)
        if date_setting:
            return jsonify(date_setting), 200
        else:
            return jsonify({"message": "No specific availability setting found for this date"}), 200
    except Exception as e:
        log_error("get_available_date", str(e), f"Date: {date}")
        current_app.logger.error(f"Error fetching available date for {date}: {e}")
        return jsonify({"error": "Failed to fetch available date"}), 500


@settings_bp.route("/api/admin/available-dates", methods=["POST"])
@jwt_required()
def create_or_update_date():
    """Create or update availability for a specific date."""
    data = request.get_json(silent=True) or {}
    date = data.get("date")
    is_available = data.get("is_available")
    reason = data.get("reason", "")

    if not date or is_available is None:
        log_security_event(
            event_type="create_update_date_invalid_input",
            details=f"Missing required fields - date: {bool(date)}, is_available: {is_available}",
            severity="WARNING"
        )
        return jsonify({"error": "date and is_available are required"}), 400

    try:
        if AvailableDates.create_or_update(date, is_available, reason):
            # Log date availability update
            log_system_event(
                event_type="date_availability_updated",
                details=f"Date: {date}, Available: {is_available}, Reason: {reason}"
            )
            current_app.logger.info(f"Date availability updated for {date}: {is_available}")
            return jsonify({"message": "Date availability updated successfully"}), 200
        else:
            log_error("create_or_update_date", "Failed to update date availability", f"Date: {date}")
            return jsonify({"error": "Failed to update date availability"}), 500
    except Exception as e:
        log_error("create_or_update_date", str(e), f"Date: {date}")
        current_app.logger.error(f"Error updating date availability for {date}: {e}")
        return jsonify({"error": "Failed to update date availability"}), 500


@settings_bp.route("/api/admin/available-dates/<date>", methods=["DELETE"])
@jwt_required()
def delete_available_date(date):
    """Delete availability setting for a specific date."""
    try:
        if AvailableDates.delete(date):
            # Log date availability deletion
            log_system_event(
                event_type="date_availability_deleted",
                details=f"Date: {date}"
            )
            current_app.logger.info(f"Date availability deleted for {date}")
            return jsonify({"message": "Date availability deleted successfully"}), 200
        else:
            log_error("delete_available_date", "Date availability setting not found", f"Date: {date}")
            return jsonify({"error": "Date availability setting not found"}), 404
    except Exception as e:
        log_error("delete_available_date", str(e), f"Date: {date}")
        current_app.logger.error(f"Error deleting date availability for {date}: {e}")
        return jsonify({"error": "Failed to delete date availability"}), 500


@settings_bp.route("/api/admin/available-dates/bulk", methods=["POST"])
@jwt_required()
def bulk_update_dates():
    """Bulk update availability for multiple dates."""
    data = request.get_json(silent=True) or {}
    dates = data.get("dates", [])
    is_available = data.get("is_available")
    reason = data.get("reason", "")

    if not dates or is_available is None:
        log_security_event(
            event_type="bulk_update_dates_invalid_input",
            details=f"Missing required fields - dates: {bool(dates)}, is_available: {is_available}",
            severity="WARNING"
        )
        return jsonify({"error": "dates array and is_available are required"}), 400

    if not isinstance(dates, list) or len(dates) == 0:
        log_security_event(
            event_type="bulk_update_dates_invalid_array",
            details="dates must be a non-empty array",
            severity="WARNING"
        )
        return jsonify({"error": "dates must be a non-empty array"}), 400

    try:
        if AvailableDates.bulk_update(dates, is_available, reason):
            # Log bulk date update
            log_system_event(
                event_type="bulk_date_availability_updated",
                details=f"Dates: {len(dates)}, Available: {is_available}"
            )
            current_app.logger.info(f"Bulk updated {len(dates)} dates to {is_available}")
            return jsonify({"message": f"Successfully updated {len(dates)} dates"}), 200
        else:
            log_error("bulk_update_dates", "Failed to bulk update dates")
            return jsonify({"error": "Failed to bulk update dates"}), 500
    except Exception as e:
        log_error("bulk_update_dates", str(e))
        current_app.logger.error(f"Error bulk updating dates: {e}")
        return jsonify({"error": "Failed to bulk update dates"}), 500


@settings_bp.route("/api/admin/available-dates/upcoming", methods=["GET"])
@jwt_required()
def get_upcoming_restrictions():
    """Get upcoming date restrictions."""
    try:
        days_ahead = request.args.get('days', 30, type=int)
        restrictions = AvailableDates.get_upcoming_restrictions(days_ahead)
        
        # Log upcoming restrictions access
        log_system_event(
            event_type="upcoming_restrictions_accessed",
            details=f"Retrieved {len(restrictions)} upcoming restrictions for {days_ahead} days"
        )
        return jsonify({"restrictions": restrictions}), 200
    except Exception as e:
        log_error("get_upcoming_restrictions", str(e))
        current_app.logger.error(f"Error fetching upcoming restrictions: {e}")
        return jsonify({"error": "Failed to fetch upcoming restrictions"}), 500



@settings_bp.route("/api/public/date-availability/<date>", methods=["GET"])
def check_date_availability(date):
    """Public endpoint to check if a specific date is available for requests."""
    try:
        is_available = AvailableDates.is_date_available(date)
        
        # Log public date availability check
        log_system_event(
            event_type="public_date_check",
            details=f"Date: {date}, Available: {is_available}",
            log_level="DEBUG"
        )
        return jsonify({
            "date": date,
            "is_available": is_available,
            "has_specific_setting": is_available is not None
        }), 200
    except Exception as e:
        log_error("check_date_availability", str(e), f"Date: {date}")
        current_app.logger.error(f"Error checking availability for date {date}: {e}")
        return jsonify({"error": "Failed to check date availability"}), 500


# ==========================
# DOMAIN WHITELIST MANAGEMENT ENDPOINTS
# ==========================

@settings_bp.route("/api/admin/domain-whitelist", methods=["GET"])
@jwt_required()
def get_domain_whitelist():
    """Get all domains in whitelist."""
    try:
        domains = DomainWhitelist.get_all()
        
        # Log domain whitelist access
        log_system_event(
            event_type="domain_whitelist_accessed",
            details=f"Retrieved {len(domains)} domains"
        )
        return jsonify({"domains": domains}), 200
    except Exception as e:
        log_error("get_domain_whitelist", str(e))
        current_app.logger.error(f"Error fetching domain whitelist: {e}")
        return jsonify({"error": "Failed to fetch domain whitelist"}), 500


@settings_bp.route("/api/admin/domain-whitelist/<int:domain_id>", methods=["GET"])
@jwt_required()
def get_domain_by_id(domain_id):
    """Get a specific domain by ID."""
    try:
        domain = DomainWhitelist.get_by_id(domain_id)
        if domain:
            return jsonify(domain), 200
        else:
            return jsonify({"error": "Domain not found"}), 404
    except Exception as e:
        log_error("get_domain_by_id", str(e), f"Domain ID: {domain_id}")
        current_app.logger.error(f"Error fetching domain {domain_id}: {e}")
        return jsonify({"error": "Failed to fetch domain"}), 500


@settings_bp.route("/api/admin/domain-whitelist", methods=["POST"])
@jwt_required()
def add_domain():
    """Add a new domain to whitelist."""
    data = request.get_json(silent=True) or {}
    domain = data.get("domain")
    description = data.get("description", "")
    is_active = data.get("is_active", True)

    if not domain:
        log_security_event(
            event_type="add_domain_invalid_input",
            details="Missing domain value",
            severity="WARNING"
        )
        return jsonify({"error": "Domain is required"}), 400

    # Basic domain validation
    if not domain or '.' not in domain:
        log_security_event(
            event_type="add_domain_invalid_format",
            details=f"Invalid domain format: {domain}",
            severity="WARNING"
        )
        return jsonify({"error": "Invalid domain format"}), 400

    try:
        if DomainWhitelist.add(domain, description, is_active):
            # Log domain addition
            log_system_event(
                event_type="domain_added",
                details=f"Domain: {domain}, Description: {description}"
            )
            current_app.logger.info(f"Domain {domain} added to whitelist")
            return jsonify({"message": "Domain added successfully"}), 201
        else:
            log_error("add_domain", f"Failed to add domain (may already exist): {domain}")
            return jsonify({"error": "Failed to add domain (may already exist)"}), 500
    except Exception as e:
        log_error("add_domain", str(e), f"Domain: {domain}")
        current_app.logger.error(f"Error adding domain {domain}: {e}")
        return jsonify({"error": "Failed to add domain"}), 500


@settings_bp.route("/api/admin/domain-whitelist/<int:domain_id>", methods=["PUT"])
@jwt_required()
def update_domain(domain_id):
    """Update an existing domain."""
    data = request.get_json(silent=True) or {}
    domain = data.get("domain")
    description = data.get("description")
    is_active = data.get("is_active")

    if not any([domain, description is not None, is_active is not None]):
        log_security_event(
            event_type="update_domain_invalid_input",
            details="At least one field is required",
            severity="WARNING"
        )
        return jsonify({"error": "At least one field (domain, description, or is_active) is required"}), 400

    # Validate domain if provided
    if domain and '.' not in domain:
        log_security_event(
            event_type="update_domain_invalid_format",
            details=f"Invalid domain format: {domain}",
            severity="WARNING"
        )
        return jsonify({"error": "Invalid domain format"}), 400

    try:
        if DomainWhitelist.update(domain_id, domain, description, is_active):
            # Log domain update
            log_system_event(
                event_type="domain_updated",
                details=f"Domain ID: {domain_id}, New domain: {domain}"
            )
            current_app.logger.info(f"Domain {domain_id} updated")
            return jsonify({"message": "Domain updated successfully"}), 200
        else:
            log_error("update_domain", "Domain not found", f"Domain ID: {domain_id}")
            return jsonify({"error": "Domain not found"}), 404
    except Exception as e:
        log_error("update_domain", str(e), f"Domain ID: {domain_id}")
        current_app.logger.error(f"Error updating domain {domain_id}: {e}")
        return jsonify({"error": "Failed to update domain"}), 500


@settings_bp.route("/api/admin/domain-whitelist/<int:domain_id>", methods=["DELETE"])
@jwt_required()
def delete_domain(domain_id):
    """Delete a domain from whitelist."""
    try:
        if DomainWhitelist.delete(domain_id):
            # Log domain deletion
            log_system_event(
                event_type="domain_deleted",
                details=f"Domain ID: {domain_id}"
            )
            current_app.logger.info(f"Domain {domain_id} deleted from whitelist")
            return jsonify({"message": "Domain deleted successfully"}), 200
        else:
            log_error("delete_domain", "Domain not found", f"Domain ID: {domain_id}")
            return jsonify({"error": "Domain not found"}), 404
    except Exception as e:
        log_error("delete_domain", str(e), f"Domain ID: {domain_id}")
        current_app.logger.error(f"Error deleting domain {domain_id}: {e}")
        return jsonify({"error": "Failed to delete domain"}), 500


@settings_bp.route("/api/admin/domain-whitelist/<int:domain_id>/toggle", methods=["PATCH"])
@jwt_required()
def toggle_domain_status(domain_id):
    """Toggle the active status of a domain."""
    try:
        if DomainWhitelist.toggle_active_status(domain_id):
            # Log domain status toggle
            log_system_event(
                event_type="domain_status_toggled",
                details=f"Domain ID: {domain_id}"
            )
            current_app.logger.info(f"Domain {domain_id} status toggled")
            return jsonify({"message": "Domain status updated successfully"}), 200
        else:
            log_error("toggle_domain_status", "Domain not found", f"Domain ID: {domain_id}")
            return jsonify({"error": "Domain not found"}), 404
    except Exception as e:
        log_error("toggle_domain_status", str(e), f"Domain ID: {domain_id}")
        current_app.logger.error(f"Error toggling domain {domain_id}: {e}")
        return jsonify({"error": "Failed to toggle domain status"}), 500


@settings_bp.route("/api/admin/domain-whitelist/active", methods=["GET"])
@jwt_required()
def get_active_domains():
    """Get all active domains for dropdown/selection purposes."""
    try:
        domains = DomainWhitelist.get_active_domains()
        
        # Log active domains access
        log_system_event(
            event_type="active_domains_accessed",
            details=f"Retrieved {len(domains)} active domains"
        )
        return jsonify({"active_domains": domains}), 200
    except Exception as e:
        log_error("get_active_domains", str(e))
        current_app.logger.error(f"Error fetching active domains: {e}")
        return jsonify({"error": "Failed to fetch active domains"}), 500


@settings_bp.route("/api/public/domain-check/<domain>", methods=["GET"])
def check_domain_allowed(domain):
    """Public endpoint to check if a domain is allowed."""
    try:
        is_allowed = DomainWhitelist.is_domain_allowed(domain)
        
        # Log public domain check
        log_system_event(
            event_type="public_domain_check",
            details=f"Domain: {domain}, Allowed: {is_allowed}",
            log_level="DEBUG"
        )
        return jsonify({
            "domain": domain,
            "is_allowed": is_allowed
        }), 200
    except Exception as e:
        log_error("check_domain_allowed", str(e), f"Domain: {domain}")
        current_app.logger.error(f"Error checking domain {domain}: {e}")
        return jsonify({"error": "Failed to check domain"}), 500
