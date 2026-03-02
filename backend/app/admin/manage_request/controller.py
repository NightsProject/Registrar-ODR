from . import manage_request_bp
from ...whatsapp.controller import send_whatsapp_message
from flask import jsonify, request, g, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.decorator import jwt_required_with_role
from .models import ManageRequestModel


def send_whatsapp_status_update(phone, full_name, request_id, status_update):
    status_template_map = {
        "PENDING": "odr_request_submitted_v2", 
        "IN-PROGRESS": "odr_processing_request_v2", 
        "DOC-READY": "odr_document_processed_v3", 
        "RELEASED": "odr_document_released_v2", 
        "REJECTED" : "odr_request_declined" 
    }

    template_name = status_template_map.get(status_update)

    components = [
        {
            "type": "body",
            "parameters": [
                {"type": "text", "text": str(full_name)},
                {"type": "text", "text": str(request_id)}
            ]
        }
    ]

    print(f"[Status Update] Attempting to send WhatsApp Status Update to {phone}")

    result = send_whatsapp_message(phone, template_name, components)

    if "error" in result:
        current_app.logger.error(f"WhatsApp send failed for Status Update to {phone}: {result['error']}")
        return {"status": "failed", "message": "Failed to send Status Update via WhatsApp"}

    return {"status": "success"}


@manage_request_bp.route("/api/admin/requests", methods=["GET"])
@jwt_required()
def get_requests():
    """
    Get paginated requests for admin management with filtering options.
    """
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        search = request.args.get('search')
        college_code = request.args.get('college_code')
        requester_type = request.args.get('requester_type')
        has_others_docs = request.args.get('has_others_docs')
        
        # Parse has_others_docs parameter
        has_others_docs_filter = None
        if has_others_docs is not None:
            has_others_docs_filter = has_others_docs.lower() in ('true', '1', 'yes')
        
        result = ManageRequestModel.fetch_requests(
            page=page, 
            limit=limit, 
            search=search,
            college_code=college_code,
            requester_type=requester_type,
            has_others_docs=has_others_docs_filter
        )
        return jsonify({"requests": result["requests"], "total": result["total"]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@manage_request_bp.route("/api/admin/requests/<request_id>/status", methods=["PUT"])
@jwt_required()
def update_request_status(request_id):
    """
    Update the status of a specific request.
    """
    try:
        data = request.get_json()
        new_status = data.get("status")
        payment_status = data.get("payment_status")
        payment_reference = data.get("payment_reference", "")
        payment_type = data.get("payment_type")
        
        if not new_status:
            return jsonify({"error": "Status is required"}), 400

        # Validate status
        valid_statuses = ["PENDING", "IN-PROGRESS", "DOC-READY", "RELEASED", "REJECTED"]
        if new_status not in valid_statuses:
            return jsonify({"error": "Invalid status"}), 400

        # Get admin ID from JWT token
        admin_id = get_jwt_identity()
        request_data = ManageRequestModel.get_request_by_id(request_id)
        if not request_data:
            return jsonify({"error": "Request not found"}), 404
        
        phone = request_data.get("contact_number")
        full_name = request_data.get("full_name")

        success = ManageRequestModel.update_request_status(request_id, new_status, admin_id, payment_status, payment_reference, payment_type)
        
        if success:
            if phone:
                send_whatsapp_status_update(phone, full_name, request_id, new_status)
            
            else:
                print(f"[Status Update] No phone number available to send WhatsApp status update for request {request_id}")

            return jsonify({"message": "Status updated successfully"}), 200
        
        else:
            return jsonify({"error": "Request not found"}), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@manage_request_bp.route("/api/admin/requests/<request_id>", methods=["DELETE"])
@jwt_required()
def delete_request(request_id):
    """
    Delete a specific request and all associated data.
    """
    try:
        # Get admin ID from JWT token
        admin_id = get_jwt_identity()

        success = ManageRequestModel.delete_request(request_id, admin_id)
        if success:
            return jsonify({"message": "Request deleted successfully"}), 200
        else:
            return jsonify({"error": "Request not found or deletion failed"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@manage_request_bp.route("/api/admin/my-requests", methods=["GET"])
@jwt_required()
def get_my_requests():
    """
    Get paginated requests assigned to the logged-in admin with filtering options.
    """
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        search = request.args.get('search')
        college_code = request.args.get('college_code')
        requester_type = request.args.get('requester_type')
        has_others_docs = request.args.get('has_others_docs')
        
        # Parse has_others_docs parameter
        has_others_docs_filter = None
        if has_others_docs is not None:
            has_others_docs_filter = has_others_docs.lower() in ('true', '1', 'yes')
        
        admin_id = get_jwt_identity()

        result = ManageRequestModel.fetch_requests(
            page=page, 
            limit=limit, 
            search=search, 
            admin_id=admin_id,
            college_code=college_code,
            requester_type=requester_type,
            has_others_docs=has_others_docs_filter
        )
        return jsonify({"requests": result["requests"], "total": result["total"]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@manage_request_bp.route("/api/admin/requests/<request_id>/changes", methods=["POST"])
@jwt_required()
def request_changes(request_id):
    """
    Submit a change request and reject the current request.
    """
    try:
        data = request.get_json()
        wrong_requirements = data.get("wrong_requirements", [])
        remarks = data.get("remarks", "")
        file_link = data.get("file_link", None)
        
        # Get admin ID from JWT token
        admin_id = get_jwt_identity()

        success = ManageRequestModel.create_change_request(request_id, admin_id, wrong_requirements, remarks, file_link)
        if success:
            return jsonify({"message": "Request changes submitted and request rejected successfully"}), 200
        else:
            return jsonify({"error": "Failed to submit request changes"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@manage_request_bp.route("/api/admin/auto-assign", methods=["POST"])
@jwt_required()
def auto_assign_requests():
    """
    Auto-assign a number of requests using load balancing across all admins.
    """
    try:
        data = request.get_json()
        number = data.get("number", 1)
        assigner_admin_id = get_jwt_identity()

        assigned_count = ManageRequestModel.auto_assign_requests_load_balanced(number, assigner_admin_id)

        if assigned_count == 0:
            return jsonify({"error": "No requests could be assigned. All admins may be at capacity or no unassigned requests available."}), 400

        return jsonify({"message": f"Successfully auto-assigned {assigned_count} requests using load balancing"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@manage_request_bp.route("/api/admin/manual-assign", methods=["POST"])
@jwt_required()
def manual_assign_requests():
    """
    Manually assign specific requests to the logged-in admin or a specified admin.
    """
    try:
        data = request.get_json()
        request_ids = data.get("request_ids", [])
        admin_id = data.get("admin_id", get_jwt_identity())
        assigner_admin_id = get_jwt_identity()
        assigned_count = 0
        for req_id in request_ids:
            if ManageRequestModel.assign_request_to_admin(req_id, admin_id, assigner_admin_id):
                assigned_count += 1
        return jsonify({"message": f"Manually assigned {assigned_count} requests"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500





@manage_request_bp.route("/api/admin/unassigned-requests", methods=["GET"])
@jwt_required()
def get_unassigned_requests():
    """
    Get unassigned requests for manual assignment with filtering and search.
    """
    try:
        conn = g.db_conn
        cur = conn.cursor()
        
        # Get query parameters
        search = request.args.get('search')
        college_code = request.args.get('college_code')
        requester_type = request.args.get('requester_type')
        
        # Build the base query
        query = """
            SELECT r.request_id, r.full_name, r.requested_at, r.college_code
            FROM requests r
            WHERE r.status = 'PENDING'
            AND r.request_id NOT IN (SELECT request_id FROM request_assignments)
        """
        params = []
        

        # Add search condition
        if search:
            query += " AND (r.full_name ILIKE %s OR r.student_id ILIKE %s OR r.email ILIKE %s OR r.contact_number ILIKE %s OR r.request_id ILIKE %s)"
            search_param = f"%{search}%"
            params.extend([search_param] * 5)
        
        # Add college_code filter
        if college_code and college_code != 'all':
            query += " AND r.college_code = %s"
            params.append(college_code)
        
        query += " ORDER BY r.requested_at ASC LIMIT 50"
        
        cur.execute(query, params)
        unassigned = cur.fetchall()
        
        # Get auth letter IDs to determine requester type
        cur.execute("SELECT id FROM auth_letters")
        auth_letter_ids = {row[0] for row in cur.fetchall()}
        
        requests = []
        for req in unassigned:
            requester_type_val = "Outsider" if req[0] in auth_letter_ids else "Student"
            
            # Apply requester_type filter after getting auth letter data
            if requester_type and requester_type != 'all':
                if requester_type != requester_type_val:
                    continue
                    
            requests.append({
                "request_id": req[0],
                "full_name": req[1],
                "requested_at": req[2].strftime("%Y-%m-%d %H:%M:%S") if req[2] else None,
                "college_code": req[3],
                "requester_type": requester_type_val
            })
        
        cur.close()
        return jsonify({"requests": requests}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@manage_request_bp.route("/api/admin/unassigned-requests/filters", methods=["GET"])
@jwt_required()
def get_unassigned_requests_filters():
    """
    Get available filter options for unassigned requests.
    """
    try:
        conn = g.db_conn
        cur = conn.cursor()
        
        # Get unique college codes
        cur.execute("""
            SELECT DISTINCT college_code
            FROM requests
            WHERE status = 'PENDING'
            AND request_id NOT IN (SELECT request_id FROM request_assignments)
            AND college_code IS NOT NULL
            ORDER BY college_code
        """)
        college_codes = [row[0] for row in cur.fetchall()]
        
        cur.close()
        
        return jsonify({
            "college_codes": college_codes,
            "requester_types": ["Student", "Outsider"]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@manage_request_bp.route("/api/admin/assignment-progress", methods=["GET"])
@jwt_required()
def get_assignment_progress():
    """
    Get assignment progress for the logged-in admin.
    """
    try:
        admin_id = get_jwt_identity()
        progress = ManageRequestModel.get_assignment_progress(admin_id)
        return jsonify(progress), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@manage_request_bp.route("/api/admin/admins-progress", methods=["GET"])
@jwt_required()
def get_admins_progress():
    """
    Get assignment progress for all admins using optimized single query.
    """
    try:
        conn = g.db_conn
        cur = conn.cursor()

        # Single query to get all admins' progress, max_requests, and profile pictures
        cur.execute("""
            SELECT a.email,
                   a.profile_picture,
                   COALESCE(asp.value::int, 10) as max_requests,
                   COALESCE(prog.total, 0) as total,
                   COALESCE(prog.completed, 0) as completed
            FROM admins a
            LEFT JOIN admin_settings asp ON a.email = asp.admin_id AND asp.key = 'max_requests'
            LEFT JOIN (
                SELECT ra.admin_id,
                       COUNT(*) as total,
                       COUNT(CASE WHEN r.status = 'RELEASED' THEN 1 END) as completed
                FROM request_assignments ra
                LEFT JOIN requests r ON ra.request_id = r.request_id
                GROUP BY ra.admin_id
            ) prog ON a.email = prog.admin_id
            ORDER BY a.email
        """)

        admins_progress = [
            {
                "admin_id": row[0],
                "profile_picture": row[1],
                "completed": row[4],
                "total": row[3],
                "max_requests": row[2]
            }
            for row in cur.fetchall()
        ]
        cur.close()
        return jsonify({"admins": admins_progress}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@manage_request_bp.route("/api/admin/admin-requests/<admin_id>", methods=["GET"])
@jwt_required()
def get_admin_requests(admin_id):
    """
    Get all requests assigned to a specific admin.
    """
    try:
        requests = ManageRequestModel.get_assigned_requests_for_admin(admin_id)
        return jsonify({"requests": requests}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500






@manage_request_bp.route("/api/admin/admin-max-requests/<admin_id>", methods=["GET"])
@jwt_required()
def get_admin_max_requests(admin_id):
    """
    Get the max requests for a specific admin.
    """
    try:
        max_requests = ManageRequestModel.get_admin_max_requests(admin_id)
        return jsonify({"max": max_requests}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@manage_request_bp.route("/api/admin/admin-max-requests/<admin_id>", methods=["PUT"])
@jwt_required()
def set_admin_max_requests(admin_id):
    """
    Set the max requests for a specific admin.
    """
    try:
        data = request.get_json()
        max_requests = data.get("max", 10)
        ManageRequestModel.set_admin_max_requests(admin_id, max_requests)
        return jsonify({"message": "Admin max requests updated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@manage_request_bp.route("/api/admin/unassign", methods=["POST"])
@jwt_required()
def unassign_request():
    """
    Unassign a request from an admin.
    """
    try:
        data = request.get_json()
        request_id = data.get("request_id")
        admin_id = data.get("admin_id")
        if not request_id or not admin_id:
            return jsonify({"error": "request_id and admin_id are required"}), 400

        success = ManageRequestModel.unassign_request_from_admin(request_id, admin_id)
        if success:
            return jsonify({"message": "Request unassigned successfully"}), 200
        else:
            return jsonify({"error": "Request not found or not assigned to this admin"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500




@manage_request_bp.route("/api/admin/requests/<request_id>", methods=["GET"])
@jwt_required()
def get_single_request(request_id):
    """
    Get a single request by ID with all details.
    """
    try:
        request_data = ManageRequestModel.get_request_by_id(request_id)
        if request_data:
            return jsonify(request_data), 200
        else:
            return jsonify({"error": "Request not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@manage_request_bp.route("/api/admin/requests/<request_id>/changes", methods=["GET"])
@jwt_required()
def get_request_changes(request_id):
    """
    Get all changes for a specific request.
    """
    try:
        changes = ManageRequestModel.get_request_changes(request_id)
        return jsonify({"changes": changes}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500




@manage_request_bp.route("/api/admin/requests/<request_id>/documents/<doc_id>/status", methods=["PUT"])
@jwt_required()
def toggle_document_status(request_id, doc_id):
    """
    Toggle the completion status of a document in a request.
    """
    try:
        # Get admin ID from JWT token
        admin_id = get_jwt_identity()

        success, result = ManageRequestModel.toggle_document_completion(request_id, doc_id, admin_id)
        if success:
            return jsonify({
                "message": "Document status toggled successfully",
                "is_done": result
            }), 200
        else:
            return jsonify({"error": result}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@manage_request_bp.route("/api/admin/requests/<request_id>/others_documents/<doc_id>/status", methods=["PUT"])
@jwt_required()
def toggle_others_document_status(request_id, doc_id):
    """
    Toggle the completion status of an others document in a request.
    """
    try:
        # Get admin ID from JWT token
        admin_id = get_jwt_identity()

        success, result = ManageRequestModel.toggle_others_document_completion(request_id, doc_id, admin_id)
        if success:
            return jsonify({
                "message": "Others document status toggled successfully",
                "is_done": result
            }), 200
        else:
            return jsonify({"error": result}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@manage_request_bp.route("/api/admin/requests/filters", methods=["GET"])
@jwt_required()
def get_requests_filters():
    """
    Get available filter options for requests.
    """
    try:
        conn = g.db_conn
        cur = conn.cursor()
        
        # Get unique college codes
        cur.execute("""
            SELECT DISTINCT college_code
            FROM requests
            WHERE college_code IS NOT NULL
            ORDER BY college_code
        """)
        college_codes = [row[0] for row in cur.fetchall()]
        
        cur.close()
        
        return jsonify({
            "college_codes": college_codes,
            "requester_types": ["Student", "Outsider"],
            "others_docs_options": ["Has Others Documents", "No Others Documents"]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@manage_request_bp.route("/api/admin/request-admin/<request_id>", methods=["GET"])
@jwt_required()
def get_request_admin(request_id):
    """
    Get the admin information assigned to a specific request.
    """
    try:
        admin_info = ManageRequestModel.get_admin_info_by_request_id(request_id)
        if admin_info:
            return jsonify(admin_info), 200
        else:
            return jsonify({"error": "Request not found or not assigned to any admin"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
