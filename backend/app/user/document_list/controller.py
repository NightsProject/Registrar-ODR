from . import document_list_bp
from flask import render_template, session, redirect, url_for, jsonify, current_app
from .models import DocumentList
from app.services.logging_service import log_document_action, log_error

@document_list_bp.route("/api/view-documents", methods=["GET"])
def get_request_page_data():

    try:
    
        documents = DocumentList.get_all_documents()
        
        # Log document list access
        log_document_action(
            action="document_list_accessed",
            document_id="all",
            details=f"Retrieved {len(documents)} documents"
        )

        return jsonify({
            "documents": documents
        })

    except Exception as e:
        log_error("get_request_page_data", str(e), "Failed to fetch documents")
        return jsonify({
            "status": "error",
            "message": "An unexpected error occurred while fetching documents data."
        }), 500

    