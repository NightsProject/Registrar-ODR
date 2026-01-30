from . import document_list_bp
from flask import render_template, session, redirect, url_for, jsonify
from .models import DocumentList

@document_list_bp.route("/api/view-documents", methods=["GET"])
def get_request_page_data():

    try:
    
        documents = DocumentList.get_all_documents()

        return jsonify({
            "documents": documents
        })

    except Exception as e:
        print(f"Error in /api/view-documents: {e}")
        return jsonify({
            "status": "error",
            "message": "An unexpected error occurred while fetching documents data."
        }), 500

    