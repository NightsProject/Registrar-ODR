from flask import g
from app import db_pool


class ManageRequestModel:
    @staticmethod
    def get_all_requests():
        """Fetch all requests with their details."""
        conn = db_pool.getconn()
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
                    SELECT r.requirement_name, rrl.file_url
                    FROM request_requirements_links rrl
                    JOIN requirements r ON rrl.requirement_id = r.req_id
                    WHERE rrl.request_id = %s
                """, (request_id,))
                files = cur.fetchall()
                request_data["uploaded_files"] = [{"requirement": file[0], "file_url": file[1]} for file in files]

                # Fetch recent logs
                recent_logs = ManageRequestModel.get_recent_logs_for_request(request_id, limit=1)
                request_data["recent_log"] = recent_logs[0] if recent_logs else None

                detailed_requests.append(request_data)
            return detailed_requests
        finally:
            cur.close()
            db_pool.putconn(conn)

    @staticmethod
    def update_request_status(request_id, new_status, admin_id=None):
        """Update the status of a specific request and log the change."""
        conn = db_pool.getconn()
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
            db_pool.putconn(conn)

    @staticmethod
    def get_recent_logs_for_request(request_id, limit=1):
        """Get the most recent log entries for a specific request."""
        conn = db_pool.getconn()
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
            db_pool.putconn(conn)
