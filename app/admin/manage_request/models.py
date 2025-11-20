from flask import g


class ManageRequestModel:
    @staticmethod
    def get_all_requests():
        """Fetch all requests with their details."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT request_id, student_id, full_name, contact_number, email, preferred_contact, status, requested_at, completed_at, remarks, total_cost, payment_status
                FROM requests
                ORDER BY requested_at DESC
            """)
            requests = cur.fetchall()
            detailed_requests = []
            for req in requests:
                request_id = req[0]
                request_data = {
                    "request_id": request_id,
                    "student_id": req[1],
                    "full_name": req[2],
                    "contact_number": req[3],
                    "email": req[4],
                    "preferred_contact": req[5],
                    "status": req[6],
                    "requested_at": req[7].strftime("%Y-%m-%d %H:%M:%S") if req[7] else None,
                    "completed_at": req[8].strftime("%Y-%m-%d %H:%M:%S") if req[8] else None,
                    "remarks": req[9],
                    "total_cost": req[10],
                    "payment_status": req[11]
                }
                # Fetch requested documents with cost
                cur.execute("""
                    SELECT d.doc_name, rd.quantity, d.cost
                    FROM request_documents rd
                    JOIN documents d ON rd.doc_id = d.doc_id
                    WHERE rd.request_id = %s
                """, (request_id,))
                docs = cur.fetchall()
                request_data["documents"] = [{"name": doc[0], "quantity": doc[1], "cost": doc[2]} for doc in docs]

                # Fetch requirements
                cur.execute("""
                    SELECT DISTINCT r.requirement_name
                    FROM request_documents rd
                    JOIN document_requirements dr ON rd.doc_id = dr.doc_id
                    JOIN requirements r ON dr.req_id = r.req_id
                    WHERE rd.request_id = %s
                """, (request_id,))
                reqs = cur.fetchall()
                request_data["requirements"] = [req[0] for req in reqs]

                # Fetch uploaded files
                cur.execute("""
                    SELECT r.requirement_name, rrl.file_path
                    FROM request_requirements_links rrl
                    JOIN requirements r ON rrl.requirement_id = r.req_id
                    WHERE rrl.request_id = %s
                """, (request_id,))
                files = cur.fetchall()
                request_data["uploaded_files"] = [{"requirement": file[0], "file_path": file[1]} for file in files]

                # Fetch recent logs
                recent_logs = ManageRequestModel.get_recent_logs_for_request(request_id, limit=1)
                request_data["recent_log"] = recent_logs[0] if recent_logs else None

                detailed_requests.append(request_data)
            return detailed_requests
        finally:
            cur.close()

    @staticmethod
    def update_request_status(request_id, new_status, admin_id=None):
        """Update the status of a specific request and log the change."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                UPDATE requests
                SET status = %s, completed_at = CASE WHEN %s IN ('RELEASED', 'REJECTED') THEN NOW() ELSE completed_at END
                WHERE request_id = %s
            """, (new_status, new_status, request_id))

            if cur.rowcount > 0 and admin_id:
                # Log the status change
                cur.execute("""
                    INSERT INTO logs (admin_id, action, details)
                    VALUES (%s, %s, %s)
                """, (admin_id, 'Status Change', f'Changed status of request {request_id} to {new_status}'))
                conn.commit()
                return True
            elif cur.rowcount > 0:
                conn.commit()
                return True
            return False
        finally:
            cur.close()

    @staticmethod
    def get_recent_logs_for_request(request_id, limit=1):
        """Get the most recent log entries for a specific request."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT admin_id, action, details, timestamp
                FROM logs
                WHERE details LIKE %s
                ORDER BY timestamp DESC
                LIMIT %s
            """, (f'%{request_id}%', limit))
            logs = cur.fetchall()
            return [
                {
                    "admin_id": log[0],
                    "action": log[1],
                    "details": log[2],
                    "timestamp": log[3].strftime("%Y-%m-%d %H:%M:%S") if log[3] else None
                }
                for log in logs
            ]
        finally:
            cur.close()

    @staticmethod
    def delete_request(request_id, admin_id):
        """Delete a request and all associated data, and log the deletion."""
        from supabase import create_client, Client
        from config import SUPABASE_URL, SUPABASE_ANON_KEY

        conn = g.db_conn
        cur = conn.cursor()
        try:
            # First, get all uploaded files for this request to delete from Supabase
            cur.execute("""
                SELECT file_path
                FROM request_requirements_links
                WHERE request_id = %s
            """, (request_id,))
            files = cur.fetchall()

            # Delete files from Supabase
            if files:
                supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
                file_paths_to_delete = []
                for file_row in files:
                    file_path = file_row[0]
                    if 'requirements-odr/' in file_path:
                        file_path_in_bucket = file_path.split('requirements-odr/')[1]
                        file_paths_to_delete.append(file_path_in_bucket)

                if file_paths_to_delete:
                    try:
                        supabase.storage.from_('requirements-odr').remove(file_paths_to_delete)
                    except Exception as e:
                        print(f"Error deleting files from Supabase: {e}")
                        # Continue with DB deletion even if Supabase fails

            # Log the deletion
            cur.execute("""
                INSERT INTO logs (admin_id, action, details)
                VALUES (%s, %s, %s)
            """, (admin_id, 'Request Deletion', f'Deleted request {request_id} and all associated data'))

            # Delete request_requirements_links (cascades to request_documents and requests due to FK constraints)
            cur.execute("""
                DELETE FROM request_requirements_links
                WHERE request_id = %s
            """, (request_id,))

            # Delete request_documents
            cur.execute("""
                DELETE FROM request_documents
                WHERE request_id = %s
            """, (request_id,))

            # Finally, delete the request itself
            cur.execute("""
                DELETE FROM requests
                WHERE request_id = %s
            """, (request_id,))

            conn.commit()
            return cur.rowcount > 0  # Return True if at least one row was deleted
        except Exception as e:
            conn.rollback()
            print(f"Error deleting request {request_id}: {e}")
            return False
        finally:
            cur.close()
