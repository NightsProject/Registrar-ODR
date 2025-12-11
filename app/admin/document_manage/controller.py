from . import document_management_bp
from flask import jsonify, g, request
import psycopg2

@document_management_bp.route('/get-documents', methods=['GET'])
def get_documents():
    try:
        # Use connection from the pool
        conn = g.db_conn
        cursor = conn.cursor()
        cursor.execute("SELECT doc_id, doc_name, description, logo_link, cost FROM documents;")
        documents = cursor.fetchall()
        cursor.close()

        document_list = [
            {
                "doc_id": doc[0],
                "doc_name": doc[1],
                "description": doc[2],
                "logo_link": doc[3],
                "cost": float(doc[4])
            }
            for doc in documents
        ]
        return jsonify(document_list)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@document_management_bp.route('/get-document-requirements', methods=['GET'])
def get_document_requirements():
    try:
        conn = g.db_conn
        cursor = conn.cursor()
        cursor.execute("""
            SELECT dr.doc_id, r.requirement_name
            FROM document_requirements dr
            JOIN requirements r ON dr.req_id = r.req_id;
        """)
        document_requirements = cursor.fetchall()
        cursor.close()

        document_requirements_list = [
            {"doc_id": doc[0], "requirement_name": doc[1]}
            for doc in document_requirements
        ]
        return jsonify(document_requirements_list)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@document_management_bp.route('/get-document-requirements/<string:doc_id>', methods=['GET'])
def get_document_requirements_by_id(doc_id):
    try:
        conn = g.db_conn
        cursor = conn.cursor()
        cursor.execute("SELECT doc_id, req_id FROM document_requirements WHERE doc_id = %s;", (doc_id,))
        document_requirements = cursor.fetchall()
        cursor.close()

        document_requirements_list = [
            {"doc_id": doc[0], "req_id": doc[1]}
            for doc in document_requirements
        ]
        return jsonify(document_requirements_list)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@document_management_bp.route('/get-documents-with-requirements', methods=['GET'])
def get_documents_with_requirements():
    try:
        conn = g.db_conn
        cursor = conn.cursor()

        # Fetch all documents - INCLUDING the hidden field
        cursor.execute("SELECT doc_id, doc_name, description, logo_link, cost, hidden FROM documents;")
        documents = cursor.fetchall()

        document_list = []

        for doc in documents:
            doc_id, doc_name, description, logo_link, cost, hidden = doc

            # Fetch requirement names for this document
            cursor.execute("""
                SELECT r.requirement_name
                FROM document_requirements dr
                JOIN requirements r ON dr.req_id = r.req_id
                WHERE dr.doc_id = %s;
            """, (doc_id,))
            req_rows = cursor.fetchall()
            req_names = [r[0] for r in req_rows]

            document_list.append({
                "doc_id": doc_id,
                "doc_name": doc_name,
                "description": description,
                "logo_link": logo_link,
                "cost": float(cost),
                "requirements": req_names,
                "hidden": hidden  
            })

        cursor.close()
        return jsonify(document_list), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@document_management_bp.route('/add-documents', methods=['POST'])
def add_document():
    try:
        conn = g.db_conn
        cursor = conn.cursor()
        data = request.get_json()

        doc_name = data.get("doc_name")
        description = data.get("description")
        cost = data.get("cost")
        requirements = data.get("requirements", [])

        if not all([doc_name, description, cost]):
            return jsonify({"error": "Missing required fields"}), 400

        cursor.execute("SELECT doc_id FROM documents ORDER BY doc_id DESC LIMIT 1;")
        last_doc = cursor.fetchone()
        new_doc_id = f"DOC{int(last_doc[0].replace('DOC', '')) + 1:04d}" if last_doc else "DOC0001"

        cursor.execute("""
            INSERT INTO documents (doc_id, doc_name, description, cost)
            VALUES (%s, %s, %s, %s);
        """, (new_doc_id, doc_name, description, cost))

        for req_name in requirements:
            cursor.execute("SELECT req_id FROM requirements WHERE requirement_name = %s;", (req_name,))
            existing = cursor.fetchone()

            if existing:
                req_id = existing[0]
            else:
                cursor.execute("SELECT req_id FROM requirements ORDER BY req_id DESC LIMIT 1;")
                last_req = cursor.fetchone()
                req_id = f"REQ{int(last_req[0].replace('REQ', '')) + 1:04d}" if last_req else "REQ0001"

                cursor.execute("""
                    INSERT INTO requirements (req_id, requirement_name)
                    VALUES (%s, %s);
                """, (req_id, req_name))

            cursor.execute("""
                INSERT INTO document_requirements (doc_id, req_id)
                VALUES (%s, %s);
            """, (new_doc_id, req_id))

        conn.commit()
        return jsonify({"message": "Document added successfully", "doc_id": new_doc_id}), 201

    except psycopg2.IntegrityError:
        conn.rollback()
        return jsonify({"error": "Duplicate document or invalid data."}), 400
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@document_management_bp.route('/edit-document/<string:doc_id>', methods=['PUT'])
def edit_document(doc_id):
    try:
        conn = g.db_conn
        cursor = conn.cursor()
        data = request.get_json()

        doc_name = data.get("doc_name")
        description = data.get("description")
        cost = data.get("cost")
        requirements = data.get("requirements", [])

        # update the main document info
        cursor.execute("""
            UPDATE documents
            SET doc_name = %s, description = %s, cost = %s
            WHERE doc_id = %s;
        """, (doc_name, description, cost, doc_id))

        # clear old requirements
        cursor.execute("DELETE FROM document_requirements WHERE doc_id = %s;", (doc_id,))

        # re-insert requirements
        for req_name in requirements:
            cursor.execute("SELECT req_id FROM requirements WHERE requirement_name = %s;", (req_name,))
            existing = cursor.fetchone()

            if existing:
                req_id = existing[0]
            else:
                cursor.execute("SELECT req_id FROM requirements ORDER BY req_id DESC LIMIT 1;")
                last_req = cursor.fetchone()
                req_id = f"REQ{int(last_req[0].replace('REQ', '')) + 1:04d}" if last_req else "REQ0001"

                cursor.execute("""
                    INSERT INTO requirements (req_id, requirement_name)
                    VALUES (%s, %s);
                """, (req_id, req_name))

            cursor.execute("""
                INSERT INTO document_requirements (doc_id, req_id)
                VALUES (%s, %s);
            """, (doc_id, req_id))

        conn.commit()
        return jsonify({"message": "Document updated successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@document_management_bp.route('/delete-document/<string:doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    try:
        conn = g.db_conn
        cursor = conn.cursor()

        # First, remove any linked requirements in document_requirements
        cursor.execute("DELETE FROM document_requirements WHERE doc_id = %s;", (doc_id,))

        # Then remove the document itself
        cursor.execute("DELETE FROM documents WHERE doc_id = %s;", (doc_id,))

        conn.commit()
        return jsonify({"message": f"Document {doc_id} deleted successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@document_management_bp.route('/get-requirements', methods=['GET'])
def get_requirements():
    try:
        conn = g.db_conn
        cursor = conn.cursor()
        cursor.execute("SELECT req_id, requirement_name FROM requirements;")
        requirements = cursor.fetchall()
        cursor.close()

        requirements_list = [
            {"req_id": req[0], "requirement_name": req[1]}
            for req in requirements
        ]
        return jsonify(requirements_list)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@document_management_bp.route('/delete-requirement/<string:req_id>', methods=['DELETE'])
def delete_requirement(req_id):
    try:
        conn = g.db_conn
        cursor = conn.cursor()

        # First, remove any references in document_requirements
        cursor.execute("DELETE FROM document_requirements WHERE req_id = %s;", (req_id,))

        # Then remove the requirement itself
        cursor.execute("DELETE FROM requirements WHERE req_id = %s;", (req_id,))

        conn.commit()
        return jsonify({"message": f"Requirement {req_id} deleted successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@document_management_bp.route('/add-requirement', methods=['POST'])
def add_requirement():
    try:
        conn = g.db_conn
        cursor = conn.cursor()
        data = request.get_json()
        name = data.get("requirement_name")

        if not name or not name.strip():
            return jsonify({"error": "Requirement name cannot be empty"}), 400
        
        cursor.execute("SELECT req_id FROM requirements WHERE LOWER(requirement_name) = LOWER(%s);", (name.strip(),))
        existing = cursor.fetchone()
        if existing:
            return jsonify({"error": "Requirement name already exists"}), 400


        # Generate new req_id
        cursor.execute("SELECT req_id FROM requirements ORDER BY req_id DESC LIMIT 1;")
        last_req = cursor.fetchone()
        new_req_id = f"REQ{int(last_req[0].replace('REQ', '')) + 1:04d}" if last_req else "REQ0001"

        cursor.execute("""
            INSERT INTO requirements (req_id, requirement_name)
            VALUES (%s, %s);
        """, (new_req_id, name))

        conn.commit()
        return jsonify({"message": "Requirement added", "req_id": new_req_id}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@document_management_bp.route('/check-req-exist/<string:req_id>', methods=['GET'])
def check_req_exist(req_id):
    """
    Check if a requirement is linked to any requests.
    Returns {"exists": true, "count": N} if linked, 
    else {"exists": false, "count": 0}.
    """
    try:
        conn = g.db_conn
        cursor = conn.cursor()

        cursor.execute(
            "SELECT COUNT(*) FROM request_requirements_links WHERE requirement_id = %s;",
            (req_id,)
        )
        count = cursor.fetchone()[0]

        return jsonify({"exists": count > 0, "count": count}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()

@document_management_bp.route('/check-req/<string:req_id>', methods=['GET'])
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
        conn = g.db_conn
        cursor = conn.cursor()

        # Check in requests
        cursor.execute(
            "SELECT COUNT(*) FROM request_requirements_links WHERE requirement_id = %s;",
            (req_id,)
        )
        req_count = cursor.fetchone()[0]

        # Check in documents
        cursor.execute(
            "SELECT COUNT(*) FROM document_requirements WHERE req_id = %s;",
            (req_id,)
        )
        doc_count = cursor.fetchone()[0]

        return jsonify({
            "in_requests": {"exists": req_count > 0, "count": req_count},
            "in_documents": {"exists": doc_count > 0, "count": doc_count}
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@document_management_bp.route('/check-doc-exist/<string:doc_id>', methods=['GET'])
def check_doc_exist(doc_id):
    """
    Check if a document is linked to any requests.
    Returns {"exists": true, "count": N} if linked, else {"exists": false, "count": 0}.
    """
    try:
        conn = g.db_conn
        cursor = conn.cursor()

        cursor.execute(
            "SELECT COUNT(*) FROM request_documents WHERE doc_id = %s;",
            (doc_id,)
        )
        count = cursor.fetchone()[0]

        return jsonify({"exists": count > 0, "count": count}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()

@document_management_bp.route('/edit-requirement/<string:req_id>', methods=['PUT'])
def edit_requirement(req_id):
    """
    Edit a requirement's name. Returns the updated requirement.
    """
    try:
        data = request.get_json()
        new_name = data.get("requirement_name")

        if not new_name or not new_name.strip():
            return jsonify({"error": "Requirement name cannot be empty"}), 400

        conn = g.db_conn
        cursor = conn.cursor()

        # Check for duplicate name in other requirements
        cursor.execute(
            "SELECT req_id FROM requirements WHERE LOWER(requirement_name) = LOWER(%s) AND req_id != %s;",
            (new_name.strip(), req_id)
        )
        duplicate = cursor.fetchone()
        if duplicate:
            return jsonify({"error": "Requirement name already exists"}), 400

        # Check if the requirement exists
        cursor.execute("SELECT req_id FROM requirements WHERE req_id = %s;", (req_id,))
        existing = cursor.fetchone()
        if not existing:
            return jsonify({"error": f"Requirement {req_id} not found"}), 404

        # Update the requirement name
        cursor.execute(
            "UPDATE requirements SET requirement_name = %s WHERE req_id = %s;",
            (new_name.strip(), req_id)
        )
        conn.commit()

        return jsonify({
            "message": f"Requirement {req_id} updated successfully",
            "req_id": req_id,
            "requirement_name": new_name.strip()
        }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()

@document_management_bp.route('/hide-document/<string:doc_id>', methods=['PATCH'])
def hide_document(doc_id):
    try:
        conn = g.db_conn
        cursor = conn.cursor()

        # Flip hidden flag to TRUE
        cursor.execute("""
            UPDATE documents
            SET hidden = TRUE
            WHERE doc_id = %s;
        """, (doc_id,))

        conn.commit()
        return jsonify({"message": f"Document {doc_id} hidden successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()

@document_management_bp.route('/toggle-hide-document/<string:doc_id>', methods=['PATCH'])
def toggle_hide_document(doc_id):
    try:
        conn = g.db_conn
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE documents
            SET hidden = NOT hidden
            WHERE doc_id = %s;
        """, (doc_id,))

        conn.commit()
        return jsonify({"message": f"Document {doc_id} hidden status toggled successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()

