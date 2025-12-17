

from . import logging_bp
from flask import render_template, session, redirect, url_for, jsonify, request, current_app as app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.decorator import jwt_required_with_role
from .models import LoggingModel
from datetime import datetime, timedelta
import json


@logging_bp.route("/api/admin/logs", methods=["GET"])
@jwt_required()
def get_logs():
    """
    Get logs with advanced filtering, search, and pagination.
    """
    try:
        # Parse query parameters
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 50)), 100)  # Max 100 per page
        sort_by = request.args.get('sort_by', 'timestamp')
        sort_order = request.args.get('sort_order', 'desc')
        search_text = request.args.get('search', '').strip()
        
        # Parse filters
        filters = {}
        if request.args.get('admin_id'):
            filters['admin_id'] = request.args.get('admin_id')
        if request.args.get('log_level'):
            filters['log_level'] = request.args.get('log_level')
        if request.args.get('category'):
            filters['category'] = request.args.get('category')
        if request.args.get('request_id'):
            filters['request_id'] = request.args.get('request_id')
        
        # Date range filters
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        if date_from:
            try:
                filters['date_from'] = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({"error": "Invalid date_from format. Use ISO format."}), 400
        
        if date_to:
            try:
                filters['date_to'] = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({"error": "Invalid date_to format. Use ISO format."}), 400
        
        # Quick date filters (last_24h, last_7d, last_30d)
        quick_filter = request.args.get('quick_filter')
        if quick_filter:
            now = datetime.now()
            if quick_filter == 'last_24h':
                filters['date_from'] = now - timedelta(hours=24)
            elif quick_filter == 'last_7d':
                filters['date_from'] = now - timedelta(days=7)
            elif quick_filter == 'last_30d':
                filters['date_from'] = now - timedelta(days=30)
        
        result = LoggingModel.get_all_logs(
            filters=filters,
            page=page,
            per_page=per_page,
            sort_by=sort_by,
            sort_order=sort_order,
            search_text=search_text if search_text else None
        )
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@logging_bp.route("/api/admin/logs/filter-options", methods=["GET"])
@jwt_required()
def get_filter_options():
    """
    Get available filter options for the logs interface.
    """
    try:
        options = LoggingModel.get_filter_options()
        return jsonify(options), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@logging_bp.route("/api/admin/logs/export", methods=["GET"])
@jwt_required()
def export_logs():
    """
    Export logs in specified format (JSON or CSV).
    """
    try:
        format_type = request.args.get('format', 'json').lower()
        if format_type not in ['json', 'csv']:
            return jsonify({"error": "Format must be 'json' or 'csv'"}), 400
        
        # Parse same filters as get_logs
        filters = {}
        if request.args.get('admin_id'):
            filters['admin_id'] = request.args.get('admin_id')
        if request.args.get('log_level'):
            filters['log_level'] = request.args.get('log_level')
        if request.args.get('category'):
            filters['category'] = request.args.get('category')
        if request.args.get('request_id'):
            filters['request_id'] = request.args.get('request_id')
        
        # Date range filters
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        if date_from:
            try:
                filters['date_from'] = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({"error": "Invalid date_from format."}), 400
        
        if date_to:
            try:
                filters['date_to'] = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({"error": "Invalid date_to format."}), 400
        
        search_text = request.args.get('search', '').strip()
        
        export_data = LoggingModel.export_logs(
            filters=filters,
            search_text=search_text if search_text else None,
            format=format_type
        )
        
        # Set appropriate headers for file download
        filename = f"logs_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{format_type}"
        
        if format_type == 'json':
            response = app.response_class(
                export_data,
                mimetype='application/json',
                headers={'Content-Disposition': f'attachment; filename={filename}'}
            )
        else:  # CSV
            response = app.response_class(
                export_data,
                mimetype='text/csv',
                headers={'Content-Disposition': f'attachment; filename={filename}'}
            )
        
        return response
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@logging_bp.route("/api/admin/logs", methods=["POST"])
@jwt_required()
def create_log():
    """
    Create a new log entry.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Get current admin info
        admin_id = get_jwt_identity()
        
        # Required fields
        action = data.get('action')
        if not action:
            return jsonify({"error": "Action is required"}), 400
        
        # Optional fields
        details = data.get('details')
        request_id = data.get('request_id')
        log_level = data.get('log_level', 'INFO')
        category = data.get('category', 'SYSTEM')
        ip_address = request.environ.get('HTTP_X_REAL_IP', request.remote_addr)
        user_agent = request.headers.get('User-Agent')
        session_id = session.get('session_id')
        
        log_id = LoggingModel.create_log(
            admin_id=admin_id,
            action=action,
            details=details,
            request_id=request_id,
            log_level=log_level,
            category=category,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id
        )
        
        if log_id:
            return jsonify({"log_id": log_id, "message": "Log created successfully"}), 201
        else:
            return jsonify({"error": "Failed to create log"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
