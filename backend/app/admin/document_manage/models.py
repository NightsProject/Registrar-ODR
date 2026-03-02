from app import db_pool


class DocumentManagementModel:
    """Model class for document management database operations."""
    
    @staticmethod
    def get_documents():
        """Fetch all documents from the database."""
        conn = db_pool.getconn()
        cursor = conn.cursor()
        try:
            cursor.execute("""
                SELECT doc_id, doc_name, description, logo_link, cost, requires_payment_first
                FROM documents;
            """)
            documents = cursor.fetchall()
            return [
                {
                    "doc_id": doc[0],
                    "doc_name": doc[1],
                    "description": doc[2],
                    "logo_link": doc[3],
                    "cost": float(doc[4]),
                    "requires_payment_first": doc[5]
                }
                for doc in documents
            ]
        finally:
            cursor.close()
            db_pool.putconn(conn)

    @staticmethod
    def get_document_requirements():
        """Fetch all document requirements with joined requirement names."""
        conn = db_pool.getconn()
        cursor = conn.cursor()
        try:
            cursor.execute("""
                SELECT dr.doc_id, r.requirement_name
                FROM document_requirements dr
                JOIN requirements r ON dr.req_id = r.req_id;
            """)
            document_requirements = cursor.fetchall()
            return [
                {"doc_id": doc[0], "requirement_name": doc[1]}
                for doc in document_requirements
            ]
        finally:
            cursor.close()
            db_pool.putconn(conn)

    @staticmethod
    def get_document_requirements_by_id(doc_id):
        """Fetch requirements for a specific document."""
        conn = db_pool.getconn()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT doc_id, req_id FROM document_requirements WHERE doc_id = %s;", (doc_id,))
            document_requirements = cursor.fetchall()
            return [
                {"doc_id": doc[0], "req_id": doc[1]}
                for doc in document_requirements
            ]
        finally:
            cursor.close()
            db_pool.putconn(conn)

    @staticmethod
    def get_documents_with_requirements():
        """Fetch all documents with their requirements."""
        conn = db_pool.getconn()
        cursor = conn.cursor()
        try:
            # Fetch all documents - INCLUDING the hidden field
            cursor.execute("SELECT doc_id, doc_name, description, logo_link, cost, hidden, requires_payment_first FROM documents;")
            documents = cursor.fetchall()

            document_list = []

            for doc in documents:
                doc_id, doc_name, description, logo_link, cost, hidden, requires_payment_first = doc

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
                    "hidden": hidden,
                    "requires_payment_first": requires_payment_first
                })

            return document_list
        finally:
            cursor.close()
            db_pool.putconn(conn)

    @staticmethod
    def add_document(data):
        """
        Add a new document with requirements.
        Returns tuple: (success, result_or_error_message, new_doc_id or None)
        """
        conn = db_pool.getconn()
        cursor = conn.cursor()
        try:
            doc_name = data.get("doc_name")
            description = data.get("description")
            cost = data.get("cost")
            requirements = data.get("requirements", [])
            requires_payment_first = data.get("requires_payment_first", False)

            if not doc_name or not description or cost is None:
                return (False, "Missing required fields", None)

            cursor.execute("SELECT doc_id FROM documents ORDER BY doc_id DESC LIMIT 1;")
            last_doc = cursor.fetchone()
            new_doc_id = f"DOC{int(last_doc[0].replace('DOC', '')) + 1:04d}" if last_doc else "DOC0001"

            cursor.execute("""
                INSERT INTO documents (doc_id, doc_name, description, cost, requires_payment_first)
                VALUES (%s, %s, %s, %s, %s);
            """, (new_doc_id, doc_name, description, cost, requires_payment_first))

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
            return (True, "Document added successfully", new_doc_id)
        except Exception as e:
            conn.rollback()
            return (False, str(e), None)
        finally:
            cursor.close()
            db_pool.putconn(conn)

    @staticmethod
    def edit_document(doc_id, data):
        """
        Edit an existing document and its requirements.
        Returns tuple: (success, error_message or None)
        """
        conn = db_pool.getconn()
        cursor = conn.cursor()
        try:
            doc_name = data.get("doc_name")
            description = data.get("description")
            cost = data.get("cost")
            requirements = data.get("requirements", [])
            requires_payment_first = data.get("requires_payment_first", False)

            # Update the main document info
            cursor.execute("""
                UPDATE documents
                SET doc_name = %s, description = %s, cost = %s, requires_payment_first = %s
                WHERE doc_id = %s;
            """, (doc_name, description, cost, requires_payment_first, doc_id))

            # Clear old requirements
            cursor.execute("DELETE FROM document_requirements WHERE doc_id = %s;", (doc_id,))

            # Re-insert requirements
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
            return (True, None)
        except Exception as e:
            conn.rollback()
            return (False, str(e))
        finally:
            cursor.close()
            db_pool.putconn(conn)

    @staticmethod
    def delete_document(doc_id):
        """
        Delete a document and its linked requirements.
        Returns tuple: (success, error_message or None)
        """
        conn = db_pool.getconn()
        cursor = conn.cursor()
        try:
            # First, remove any linked requirements in document_requirements
            cursor.execute("DELETE FROM document_requirements WHERE doc_id = %s;", (doc_id,))

            # Then remove the document itself
            cursor.execute("DELETE FROM documents WHERE doc_id = %s;", (doc_id,))

            conn.commit()
            return (True, None)
        except Exception as e:
            conn.rollback()
            return (False, str(e))
        finally:
            cursor.close()
            db_pool.putconn(conn)

    @staticmethod
    def get_requirements():
        """Fetch all requirements from the database."""
        conn = db_pool.getconn()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT req_id, requirement_name FROM requirements;")
            requirements = cursor.fetchall()
            return [
                {"req_id": req[0], "requirement_name": req[1]}
                for req in requirements
            ]
        finally:
            cursor.close()
            db_pool.putconn(conn)

    @staticmethod
    def delete_requirement(req_id):
        """
        Delete a requirement and its references.
        Returns tuple: (success, error_message or None)
        """
        conn = db_pool.getconn()
        cursor = conn.cursor()
        try:
            # First, remove any references in document_requirements
            cursor.execute("DELETE FROM document_requirements WHERE req_id = %s;", (req_id,))

            # Then remove the requirement itself
            cursor.execute("DELETE FROM requirements WHERE req_id = %s;", (req_id,))

            conn.commit()
            return (True, None)
        except Exception as e:
            conn.rollback()
            return (False, str(e))
        finally:
            cursor.close()
            db_pool.putconn(conn)

    @staticmethod
    def add_requirement(name):
        """
        Add a new requirement.
        Returns tuple: (success, result_or_error_message, new_req_id or None)
        """
        conn = db_pool.getconn()
        cursor = conn.cursor()
        try:
            if not name or not name.strip():
                return (False, "Requirement name cannot be empty", None)
            
            cursor.execute("SELECT req_id FROM requirements WHERE LOWER(requirement_name) = LOWER(%s);", (name.strip(),))
            existing = cursor.fetchone()
            if existing:
                return (False, "Requirement name already exists", None)

            # Generate new req_id
            cursor.execute("SELECT req_id FROM requirements ORDER BY req_id DESC LIMIT 1;")
            last_req = cursor.fetchone()
            new_req_id = f"REQ{int(last_req[0].replace('REQ', '')) + 1:04d}" if last_req else "REQ0001"

            cursor.execute("""
                INSERT INTO requirements (req_id, requirement_name)
                VALUES (%s, %s);
            """, (new_req_id, name))

            conn.commit()
            return (True, "Requirement added", new_req_id)
        except Exception as e:
            conn.rollback()
            return (False, str(e), None)
        finally:
            cursor.close()
            db_pool.putconn(conn)

    @staticmethod
    def check_req_exist(req_id):
        """
        Check if a requirement is linked to any requests.
        Returns dict: {"exists": bool, "count": int}
        """
        conn = db_pool.getconn()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT COUNT(*) FROM request_requirements_links WHERE requirement_id = %s;",
                (req_id,)
            )
            count = cursor.fetchone()[0]
            return {"exists": count > 0, "count": count}
        finally:
            cursor.close()
            db_pool.putconn(conn)

    @staticmethod
    def check_req(req_id):
        """
        Check if a requirement is linked to any requests or documents.
        Returns dict: {"in_requests": {"exists": bool, "count": int}, "in_documents": {"exists": bool, "count": int}}
        """
        conn = db_pool.getconn()
        cursor = conn.cursor()
        try:
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

            return {
                "in_requests": {"exists": req_count > 0, "count": req_count},
                "in_documents": {"exists": doc_count > 0, "count": doc_count}
            }
        finally:
            cursor.close()
            db_pool.putconn(conn)

    @staticmethod
    def check_doc_exist(doc_id):
        """
        Check if a document is linked to any requests.
        Returns dict: {"exists": bool, "count": int}
        """
        conn = db_pool.getconn()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT COUNT(*) FROM request_documents WHERE doc_id = %s;",
                (doc_id,)
            )
            count = cursor.fetchone()[0]
            return {"exists": count > 0, "count": count}
        finally:
            cursor.close()
            db_pool.putconn(conn)

    @staticmethod
    def edit_requirement(req_id, new_name):
        """
        Edit a requirement's name.
        Returns tuple: (success, error_message or None)
        """
        conn = db_pool.getconn()
        cursor = conn.cursor()
        try:
            if not new_name or not new_name.strip():
                return (False, "Requirement name cannot be empty")

            # Check for duplicate name in other requirements
            cursor.execute(
                "SELECT req_id FROM requirements WHERE LOWER(requirement_name) = LOWER(%s) AND req_id != %s;",
                (new_name.strip(), req_id)
            )
            duplicate = cursor.fetchone()
            if duplicate:
                return (False, "Requirement name already exists")

            # Check if the requirement exists
            cursor.execute("SELECT req_id FROM requirements WHERE req_id = %s;", (req_id,))
            existing = cursor.fetchone()
            if not existing:
                return (False, f"Requirement {req_id} not found")

            # Update the requirement name
            cursor.execute(
                "UPDATE requirements SET requirement_name = %s WHERE req_id = %s;",
                (new_name.strip(), req_id)
            )
            conn.commit()
            return (True, None)
        except Exception as e:
            conn.rollback()
            return (False, str(e))
        finally:
            cursor.close()
            db_pool.putconn(conn)

    @staticmethod
    def hide_document(doc_id):
        """
        Hide a document by setting hidden = TRUE.
        Returns tuple: (success, error_message or None)
        """
        conn = db_pool.getconn()
        cursor = conn.cursor()
        try:
            cursor.execute("""
                UPDATE documents
                SET hidden = TRUE
                WHERE doc_id = %s;
            """, (doc_id,))
            conn.commit()
            return (True, None)
        except Exception as e:
            conn.rollback()
            return (False, str(e))
        finally:
            cursor.close()
            db_pool.putconn(conn)

    @staticmethod
    def toggle_hide_document(doc_id):
        """
        Toggle the hidden status of a document.
        Returns tuple: (success, error_message or None)
        """
        conn = db_pool.getconn()
        cursor = conn.cursor()
        try:
            cursor.execute("""
                UPDATE documents
                SET hidden = NOT hidden
                WHERE doc_id = %s;
            """, (doc_id,))
            conn.commit()
            return (True, None)
        except Exception as e:
            conn.rollback()
            return (False, str(e))
        finally:
            cursor.close()
            db_pool.putconn(conn)

