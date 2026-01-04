from . import document_management_bp
from flask import jsonify, g, request
from flask_jwt_extended import jwt_required
from .models import DocumentManagementModel


@document_management_bp.route('/get-documents', methods=['GET'])
@jwt_required()
def get_documents():
    try:
        documents = DocumentManagementModel.get_documents()
        return jsonify(documents)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@document_management_bp.route('/get-document-requirements', methods=['GET'])
@jwt_required()
def get_document_requirements():
    try:
        document_requirements = DocumentManagementModel.get_document_requirements()
        return jsonify(document_requirements)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@document_management_bp.route('/get-document-requirements/<string:doc_id>', methods=['GET'])
@jwt_required()
def get_document_requirements_by_id(doc_id):
    try:
        document_requirements = DocumentManagementModel.get_document_requirements_by_id(doc_id)
        return jsonify(document_requirements)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@document_management_bp.route('/get-documents-with-requirements', methods=['GET'])
@jwt_required()
def get_documents_with_requirements():
    try:
        documents = DocumentManagementModel.get_documents_with_requirements()
        return jsonify(documents), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@document_management_bp.route('/add-documents', methods=['POST'])
@jwt_required()
def add_document():
    try:
        data = request.get_json()
        success, message, new_doc_id = DocumentManagementModel.add_document(data)
        
        if success:
            return jsonify({"message": message, "doc_id": new_doc_id}), 201
        elif "Duplicate" in message or "already exists" in message.lower():
            return jsonify({"error": message}), 400
        elif "Missing required fields" in message:
            return jsonify({"error": message}), 400
        else:
            return jsonify({"error": message}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@document_management_bp.route('/edit-document/<string:doc_id>', methods=['PUT'])
@jwt_required()
def edit_document(doc_id):
    try:
        data = request.get_json()
        success, error = DocumentManagementModel.edit_document(doc_id, data)
        
        if success:
            return jsonify({"message": "Document updated successfully"}), 200
        else:
            return jsonify({"error": error}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@document_management_bp.route('/delete-document/<string:doc_id>', methods=['DELETE'])
@jwt_required()
def delete_document(doc_id):
    try:
        success, error = DocumentManagementModel.delete_document(doc_id)
        
        if success:
            return jsonify({"message": f"Document {doc_id} deleted successfully"}), 200
        else:
            return jsonify({"error": error}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@document_management_bp.route('/get-requirements', methods=['GET'])
@jwt_required()
def get_requirements():
    try:
        requirements = DocumentManagementModel.get_requirements()
        return jsonify(requirements)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@document_management_bp.route('/delete-requirement/<string:req_id>', methods=['DELETE'])
@jwt_required()
def delete_requirement(req_id):
    try:
        success, error = DocumentManagementModel.delete_requirement(req_id)
        
        if success:
            return jsonify({"message": f"Requirement {req_id} deleted successfully"}), 200
        else:
            return jsonify({"error": error}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@document_management_bp.route('/add-requirement', methods=['POST'])
@jwt_required()
def add_requirement():
    try:
        data = request.get_json()
        name = data.get("requirement_name")
        success, message, new_req_id = DocumentManagementModel.add_requirement(name)
        
        if success:
            return jsonify({"message": message, "req_id": new_req_id}), 201
        elif "cannot be empty" in message.lower() or "already exists" in message.lower():
            return jsonify({"error": message}), 400
        else:
            return jsonify({"error": message}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@document_management_bp.route('/check-req-exist/<string:req_id>', methods=['GET'])
@jwt_required()
def check_req_exist(req_id):
    """
    Check if a requirement is linked to any requests.
    Returns {"exists": true, "count": N} if linked, 
    else {"exists": false, "count": 0}.
    """
    try:
        result = DocumentManagementModel.check_req_exist(req_id)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@document_management_bp.route('/check-req/<string:req_id>', methods=['GET'])
@jwt_required()
def check_req(req_id):
    """
    Check if a requirement is linked to any requests or documents.
    Returns:
    {
        "in_requests": {"exists": true/false, "count": N},
        "in_documents": {"exists": true/false, "count": N}
    }
    """
    try:
        result = DocumentManagementModel.check_req(req_id)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@document_management_bp.route('/check-doc-exist/<string:doc_id>', methods=['GET'])
@jwt_required()
def check_doc_exist(doc_id):
    """
    Check if a document is linked to any requests.
    Returns {"exists": true, "count": N} if linked, else {"exists": false, "count": 0}.
    """
    try:
        result = DocumentManagementModel.check_doc_exist(doc_id)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@document_management_bp.route('/edit-requirement/<string:req_id>', methods=['PUT'])
@jwt_required()
def edit_requirement(req_id):
    """
    Edit a requirement's name. Returns the updated requirement.
    """
    try:
        data = request.get_json()
        new_name = data.get("requirement_name")
        
        success, error = DocumentManagementModel.edit_requirement(req_id, new_name)
        
        if success:
            return jsonify({
                "message": f"Requirement {req_id} updated successfully",
                "req_id": req_id,
                "requirement_name": new_name.strip()
            }), 200
        elif "cannot be empty" in error.lower():
            return jsonify({"error": error}), 400
        elif "already exists" in error.lower():
            return jsonify({"error": error}), 400
        elif "not found" in error.lower():
            return jsonify({"error": error}), 404
        else:
            return jsonify({"error": error}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@document_management_bp.route('/hide-document/<string:doc_id>', methods=['PATCH'])
@jwt_required()
def hide_document(doc_id):
    try:
        success, error = DocumentManagementModel.hide_document(doc_id)
        
        if success:
            return jsonify({"message": f"Document {doc_id} hidden successfully"}), 200
        else:
            return jsonify({"error": error}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@document_management_bp.route('/toggle-hide-document/<string:doc_id>', methods=['PATCH'])
@jwt_required()
def toggle_hide_document(doc_id):
    try:
        success, error = DocumentManagementModel.toggle_hide_document(doc_id)
        
        if success:
            return jsonify({"message": f"Document {doc_id} hidden status toggled successfully"}), 200
        else:
            return jsonify({"error": error}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

