from flask import g
from collections import defaultdict
from psycopg2 import extras

class ManageRequestModel:


    @staticmethod
    def fetch_requests(
        page=1,
        limit=20,
        search=None,
        admin_id=None,
        college_code=None,
        requester_type=None,
        has_others_docs=None
    ):
        """
        OPTIMIZED & SAFE: Paginated request fetch with JSON aggregation.
        Fully aligned with schema and resilient to SELECT changes.
        """
        conn = g.db_conn
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)

        try:
            offset = (page - 1) * limit
            params = []
            where_clauses = []

            if admin_id:
                where_clauses.append("ra.admin_id = %s")
                params.append(admin_id)

            if search:
                where_clauses.append("""
                    (
                        r.full_name ILIKE %s OR
                        r.student_id ILIKE %s OR
                        r.email ILIKE %s OR
                        r.contact_number ILIKE %s OR
                        CAST(r.request_id AS TEXT) ILIKE %s
                    )
                """)
                search_param = f"%{search}%"
                params.extend([search_param] * 5)

            if college_code:
                where_clauses.append("r.college_code = %s")
                params.append(college_code)

            if requester_type == "outsider":
                where_clauses.append("EXISTS (SELECT 1 FROM auth_letters WHERE id = r.request_id)")
            elif requester_type == "student":
                where_clauses.append("NOT EXISTS (SELECT 1 FROM auth_letters WHERE id = r.request_id)")

            if has_others_docs is not None:
                clause = "EXISTS" if has_others_docs else "NOT EXISTS"
                where_clauses.append(f"""
                    {clause} (
                        SELECT 1 FROM others_docs od
                        WHERE od.request_id = r.request_id
                    )
                """)

            where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

            # ----------------------------
            # MAIN QUERY
            # ----------------------------
            cur.execute(f"""
                WITH request_data AS (
                    SELECT
                        r.request_id,
                        r.student_id,
                        r.full_name,
                        r.contact_number,
                        r.email,
                        r.preferred_contact,
                        r.status,
                        r.requested_at,
                        r.remarks,
                        r.total_cost,
                        r.payment_status,
                        ra.admin_id AS assigned_admin_id,
                        a.profile_picture AS assigned_admin_profile_picture
                    FROM requests r
                    LEFT JOIN request_assignments ra ON r.request_id = ra.request_id
                    LEFT JOIN admins a ON ra.admin_id = a.email
                    {where_sql}
                    ORDER BY r.requested_at DESC
                    LIMIT %s OFFSET %s
                ),

                documents_data AS (
                    SELECT
                        rd.request_id,
                        json_agg(
                            json_build_object(
                                'doc_id', rd.doc_id,
                                'name', d.doc_name,
                                'quantity', rd.quantity,
                                'cost', d.cost,
                                'is_done', rd.is_done
                            )
                            ORDER BY d.doc_name
                        ) AS documents
                    FROM request_documents rd
                    JOIN documents d ON d.doc_id = rd.doc_id
                    WHERE rd.request_id IN (SELECT request_id FROM request_data)
                    GROUP BY rd.request_id
                ),

                requirements_data AS (
                    SELECT
                        rd.request_id,
                        json_agg(DISTINCT req.requirement_name) AS requirements
                    FROM request_documents rd
                    JOIN document_requirements dr ON dr.doc_id = rd.doc_id
                    JOIN requirements req ON req.req_id = dr.req_id
                    WHERE rd.request_id IN (SELECT request_id FROM request_data)
                    GROUP BY rd.request_id
                ),

                files_data AS (
                    SELECT
                        rrl.request_id,
                        json_agg(
                            json_build_object(
                                'requirement', req.requirement_name,
                                'file_path', rrl.file_path
                            )
                            ORDER BY rrl.uploaded_at
                        ) AS uploaded_files
                    FROM request_requirements_links rrl
                    JOIN requirements req ON req.req_id = rrl.requirement_id
                    WHERE rrl.request_id IN (SELECT request_id FROM request_data)
                    GROUP BY rrl.request_id
                ),

                recent_logs AS (
                    SELECT DISTINCT ON (request_id)
                        request_id,
                        admin_id,
                        action,
                        details,
                        timestamp
                    FROM logs
                    WHERE request_id IN (SELECT request_id FROM request_data)
                    ORDER BY request_id, timestamp DESC
                )

                SELECT
                    rd.*,
                    COALESCE(d.documents, '[]'::json) AS documents,
                    COALESCE(req.requirements, '[]'::json) AS requirements,
                    COALESCE(f.uploaded_files, '[]'::json) AS uploaded_files,
                    l.admin_id AS log_admin_id,
                    l.action AS log_action,
                    l.details AS log_details,
                    l.timestamp AS log_timestamp
                FROM request_data rd
                LEFT JOIN documents_data d ON rd.request_id = d.request_id
                LEFT JOIN requirements_data req ON rd.request_id = req.request_id
                LEFT JOIN files_data f ON rd.request_id = f.request_id
                LEFT JOIN recent_logs l ON rd.request_id = l.request_id
                ORDER BY rd.requested_at DESC
            """, params + [limit, offset])

            rows = cur.fetchall()

            # ----------------------------
            # TOTAL COUNT
            # ----------------------------
            cur.execute(f"""
                SELECT COUNT(*)
                FROM requests r
                LEFT JOIN request_assignments ra ON r.request_id = ra.request_id
                {where_sql}
            """, params)

            total = cur.fetchone()["count"]

            # ----------------------------
            # FINAL ASSEMBLY (SAFE)
            # ----------------------------
            results = []
            for r in rows:
                recent_log = None
                if r["log_admin_id"]:
                    recent_log = {
                        "admin_id": r["log_admin_id"],
                        "action": r["log_action"],
                        "details": r["log_details"],
                        "timestamp": r["log_timestamp"].strftime("%Y-%m-%d %H:%M:%S")
                        if r["log_timestamp"] else None
                    }

                results.append({
                    "request_id": r["request_id"],
                    "student_id": r["student_id"],
                    "full_name": r["full_name"],
                    "contact_number": r["contact_number"],
                    "email": r["email"],
                    "preferred_contact": r["preferred_contact"],
                    "status": r["status"],
                    "requested_at": r["requested_at"].strftime("%Y-%m-%d %H:%M:%S")
                    if r["requested_at"] else None,
                    "remarks": r["remarks"],
                    "total_cost": r["total_cost"],
                    "payment_status": r["payment_status"],
                    "assigned_admin_id": r["assigned_admin_id"],
                    "assigned_admin_profile_picture": r["assigned_admin_profile_picture"],
                    "documents": r["documents"],
                    "requirements": r["requirements"],
                    "uploaded_files": r["uploaded_files"],
                    "recent_log": recent_log
                })

            return {"requests": results, "total": total}

        except Exception as e:
            print(f"Error in optimized fetch_requests: {e}")
            return ManageRequestModel.fetch_requests_original(
                page, limit, search, admin_id, college_code, requester_type, has_others_docs
            )
        finally:
            cur.close()
            
    @staticmethod
    def fetch_requests_original(page=1, limit=20, search=None, admin_id=None, college_code=None, requester_type=None, has_others_docs=None):
        """
        Original method kept as fallback if optimized version fails.
        """
        conn = g.db_conn
        cur = conn.cursor()
        try:
            offset = (page - 1) * limit

            # --------------------------
            # 1. Base query with filters
            # --------------------------
            params = []
            where_clauses = []

            if admin_id:
                where_clauses.append("ra.admin_id = %s")
                params.append(admin_id)

            if search:
                where_clauses.append("(r.full_name ILIKE %s OR r.student_id ILIKE %s OR r.email ILIKE %s OR r.contact_number ILIKE %s OR r.request_id ILIKE %s)")
                search_param = f"%{search}%"
                params.extend([search_param] * 5)

            if college_code:
                where_clauses.append("r.college_code = %s")
                params.append(college_code)

            if requester_type:
                if requester_type == "outsider":
                    where_clauses.append("r.request_id IN (SELECT id FROM auth_letters)")
                elif requester_type == "student":
                    where_clauses.append("r.request_id NOT IN (SELECT id FROM auth_letters)")

            if has_others_docs is not None:
                if has_others_docs:
                    where_clauses.append("r.request_id IN (SELECT DISTINCT request_id FROM others_docs)")
                else:
                    where_clauses.append("r.request_id NOT IN (SELECT DISTINCT request_id FROM others_docs)")

            where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

            # --------------------------
            # 2. Fetch paginated requests
            # --------------------------
            if admin_id:
                join_assignments = "JOIN request_assignments ra ON r.request_id = ra.request_id"
            else:
                join_assignments = ""

            cur.execute(f"""
                SELECT r.request_id, r.student_id, r.full_name, r.contact_number, r.email,
                       r.preferred_contact, r.status, r.requested_at,r.remarks,
                       r.total_cost, r.payment_status,
                       ra.admin_id as assigned_admin_id,
                       a.profile_picture as assigned_admin_profile_picture
                FROM requests r
                LEFT JOIN request_assignments ra ON r.request_id = ra.request_id
                LEFT JOIN admins a ON ra.admin_id = a.email
                {where_sql}
                ORDER BY r.requested_at DESC
                LIMIT %s OFFSET %s
            """, params + [limit, offset])
            rows = cur.fetchall()

            if not rows:
                return {"requests": [], "total": 0}

            request_ids = [r[0] for r in rows]
            placeholders = ','.join(['%s'] * len(request_ids))

            # --------------------------
            # 3. Total count
            # --------------------------
            cur.execute(f"""
                SELECT COUNT(*)
                FROM requests r
                {join_assignments}
                {where_sql}
            """, params)
            total_count = cur.fetchone()[0]

            # --------------------------
            # 4. Bulk fetch documents
            # --------------------------
            cur.execute(f"""
                SELECT rd.request_id, rd.doc_id, d.doc_name, rd.quantity, d.cost, rd.is_done
                FROM request_documents rd
                JOIN documents d ON rd.doc_id = d.doc_id
                WHERE rd.request_id IN ({placeholders})
            """, request_ids)
            docs_map = defaultdict(list)
            for rid, doc_id, name, qty, cost, is_done in cur.fetchall():
                docs_map[rid].append({"doc_id": doc_id, "name": name, "quantity": qty, "cost": cost, "is_done": is_done})

            # --------------------------
            # 5. Bulk fetch requirements
            # --------------------------
            cur.execute(f"""
                SELECT rd.request_id, r.requirement_name
                FROM request_documents rd
                JOIN document_requirements dr ON rd.doc_id = dr.doc_id
                JOIN requirements r ON dr.req_id = r.req_id
                WHERE rd.request_id IN ({placeholders})
            """, request_ids)
            reqs_map = defaultdict(list)
            for rid, req_name in cur.fetchall():
                reqs_map[rid].append(req_name)

            # --------------------------
            # 6. Bulk fetch uploaded files
            # --------------------------
            cur.execute(f"""
                SELECT rrl.request_id, r.requirement_name, rrl.file_path
                FROM request_requirements_links rrl
                JOIN requirements r ON rrl.requirement_id = r.req_id
                WHERE rrl.request_id IN ({placeholders})
            """, request_ids)
            files_map = defaultdict(list)
            for rid, req_name, path in cur.fetchall():
                files_map[rid].append({"requirement": req_name, "file_path": path})

            # --------------------------
            # 7. Bulk fetch recent logs
            # --------------------------
            cur.execute(f"""
                SELECT DISTINCT ON (request_id) request_id, admin_id, action, details, timestamp
                FROM logs
                WHERE request_id IN ({placeholders})
                ORDER BY request_id, timestamp DESC
            """, request_ids)
            logs_map = {}
            for rid, log_admin, action, details, ts in cur.fetchall():
                logs_map[rid] = {
                    "admin_id": log_admin,
                    "action": action,
                    "details": details,
                    "timestamp": ts.strftime("%Y-%m-%d %H:%M:%S") if ts else None
                }

            # --------------------------
            # 8. Assemble results
            # --------------------------
            results = []
            for r in rows:
                rid = r[0]
                results.append({
                    "request_id": rid,
                    "student_id": r[1],
                    "full_name": r[2],
                    "contact_number": r[3],
                    "email": r[4],
                    "preferred_contact": r[5],
                    "status": r[6],
                    "requested_at": r[7].strftime("%Y-%m-%d %H:%M:%S") if r[7] else None,
                    "remarks": r[8],
                    "total_cost": r[9],
                    "payment_status": r[10],
                    "assigned_admin_id": r[11],
                    "assigned_admin_profile_picture": r[12],
                    "documents": docs_map[rid],
                    "requirements": reqs_map[rid],
                    "uploaded_files": files_map[rid],
                    "recent_log": logs_map.get(rid)
                })

            return {"requests": results, "total": total_count}
        finally:
            cur.close()


    @staticmethod
    def update_request_status(request_id, new_status, admin_id=None, payment_status=None, payment_reference="", payment_type=None):
        """Update the status of a specific request and log the change."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            if payment_status is not None:
                cur.execute("""
                    UPDATE requests
                    SET status = %s, payment_status = %s, payment_reference = %s, payment_type = %s
                    WHERE request_id = %s
                """, (new_status, payment_status, payment_reference, payment_type, request_id))
            else:
                cur.execute("""
                    UPDATE requests
                    SET status = %s
                    WHERE request_id = %s
                """, (new_status, request_id))

            if cur.rowcount > 0 and admin_id:
                # Log the status change
                cur.execute("""
                    INSERT INTO logs (admin_id, action, details, request_id)
                    VALUES (%s, %s, %s, %s)
                """, (admin_id, 'Status Change', f'Changed status of request {request_id} to {new_status}', request_id))
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
                SELECT admin_id, action, details, timestamp, request_id
                FROM logs
                WHERE request_id = %s
                ORDER BY timestamp DESC
                LIMIT %s
            """, (request_id, limit))
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
    def assign_request_to_admin(request_id, admin_id, assigner_admin_id):
        """Assign a request to an admin, respecting max_requests limit."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            # Check if the admin is already at max capacity
            cur.execute("""
                SELECT COUNT(*)
                FROM request_assignments
                WHERE admin_id = %s
            """, (admin_id,))
            current_assigned = cur.fetchone()[0]

            # Get max_requests for the admin
            max_requests = ManageRequestModel.get_admin_max_requests(admin_id)

            if current_assigned >= max_requests:
                print(f"Admin {admin_id} is already at max capacity ({max_requests})")
                return False  # Cannot assign more

            cur.execute("""
                INSERT INTO request_assignments (request_id, admin_id)
                VALUES (%s, %s)
                ON CONFLICT (request_id) DO UPDATE SET admin_id = EXCLUDED.admin_id, assigned_at = NOW()
            """, (request_id, admin_id))
            # Log the assignment
            cur.execute("""
                INSERT INTO logs (admin_id, action, details, request_id)
                VALUES (%s, %s, %s, %s)
            """, (assigner_admin_id, 'Request Assignment', f'Assigned request {request_id} to admin {admin_id}', request_id))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            print(f"Error assigning request {request_id} to admin {admin_id}: {e}")
            return False
        finally:
            cur.close()

    @staticmethod
    def auto_assign_requests_load_balanced(n, assigner_admin_id):
        """Auto-assign the next N unassigned PENDING requests to admins using load balancing."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            # Get all admins with their current load and max_requests
            cur.execute("""
                SELECT a.email,
                       COALESCE(asp.value::int, 10) as max_requests,
                       COALESCE(assigned.count, 0) as current_assigned
                FROM admins a
                LEFT JOIN admin_settings asp ON a.email = asp.admin_id AND asp.key = 'max_requests'
                LEFT JOIN (
                    SELECT admin_id, COUNT(*) as count
                    FROM request_assignments
                    GROUP BY admin_id
                ) assigned ON a.email = assigned.admin_id
                WHERE a.role != 'none'
                ORDER BY a.email
            """)
            admins = cur.fetchall()

            # Calculate available capacity for each admin
            admin_capacities = []
            for admin in admins:
                admin_id, max_requests, current_assigned = admin
                available = max_requests - current_assigned
                if available > 0:
                    admin_capacities.append((admin_id, available))

            if not admin_capacities:
                return 0  # No admins with available capacity

            # Get the next N unassigned PENDING requests
            cur.execute("""
                SELECT request_id
                FROM requests
                WHERE status = 'PENDING'
                AND request_id NOT IN (SELECT request_id FROM request_assignments)
                ORDER BY requested_at ASC
                LIMIT %s
            """, (n,))
            unassigned_requests = cur.fetchall()

            if not unassigned_requests:
                return 0  # No requests to assign

            # Distribute requests using round-robin load balancing
            assigned_count = 0
            request_index = 0
            admin_index = 0

            while assigned_count < len(unassigned_requests) and admin_capacities:
                admin_id, available = admin_capacities[admin_index % len(admin_capacities)]

                # Assign one request to this admin if they have capacity
                if available > 0:
                    req_id = unassigned_requests[request_index][0]
                    cur.execute("""
                        INSERT INTO request_assignments (request_id, admin_id)
                        VALUES (%s, %s)
                    """, (req_id, admin_id))
                    # Log the assignment
                    cur.execute("""
                        INSERT INTO logs (admin_id, action, details, request_id)
                        VALUES (%s, %s, %s, %s)
                    """, (assigner_admin_id, 'Request Assignment', f'Auto-assigned request {req_id} to admin {admin_id}', req_id))

                    assigned_count += 1
                    request_index += 1
                    # Reduce available capacity
                    admin_capacities[admin_index % len(admin_capacities)] = (admin_id, available - 1)

                admin_index += 1

                # Remove admins with no capacity left
                admin_capacities = [(aid, av) for aid, av in admin_capacities if av > 0]

            conn.commit()
            return assigned_count
        except Exception as e:
            conn.rollback()
            print(f"Error auto-assigning requests with load balancing: {e}")
            return 0
        finally:
            cur.close()



    @staticmethod
    def get_assigned_requests_for_admin(admin_id):
        """Get all requests assigned to an admin with completion status."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT r.request_id, r.full_name, r.status, ra.assigned_at
                FROM requests r
                JOIN request_assignments ra ON r.request_id = ra.request_id
                WHERE ra.admin_id = %s
                ORDER BY ra.assigned_at DESC
            """, (admin_id,))
            assigned_requests = cur.fetchall()

            result = []
            for req in assigned_requests:
                result.append({
                    "request_id": req[0],
                    "full_name": req[1],
                    "status": req[2],
                    "assigned_at": req[3].strftime("%Y-%m-%d %H:%M:%S") if req[3] else None
                })

            return result
        finally:
            cur.close()

    @staticmethod
    def get_assignment_progress(admin_id):
        """Get progress: completed (DOC-READY) vs total assigned."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            # Total assigned
            cur.execute("""
                SELECT COUNT(*)
                FROM request_assignments
                WHERE admin_id = %s
            """, (admin_id,))
            total_assigned = cur.fetchone()[0]

            # Completed (DOC-READY)
            cur.execute("""
                SELECT COUNT(*)
                FROM requests r
                JOIN request_assignments ra ON r.request_id = ra.request_id
                WHERE ra.admin_id = %s AND r.status = 'DOC-READY'
            """, (admin_id,))
            completed = cur.fetchone()[0]

            return {"completed": completed, "total": total_assigned}
        finally:
            cur.close()


    @staticmethod
    def is_assigned(request_id):
        """Check if a request is assigned."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT COUNT(*)
                FROM request_assignments
                WHERE request_id = %s
            """, (request_id,))
            count = cur.fetchone()[0]
            return count > 0
        finally:
            cur.close()

    @staticmethod
    def get_admin_info_by_request_id(request_id):
        """Get the admin information assigned to a specific request."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT admin_id
                FROM request_assignments 
                WHERE request_id = %s
            """, (request_id,))
            result = cur.fetchone()
            if result:
                return {
                    "admin_id": result[0],
                }
            return None
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
                INSERT INTO logs (admin_id, action, details, request_id)
                VALUES (%s, %s, %s, %s)
            """, (admin_id, 'Request Deletion', f'Deleted request {request_id} and all associated data', request_id))

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
            
            # Delete changes
            cur.execute("""
                DELETE FROM changes
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





    @staticmethod
    def create_change_request(request_id, admin_id, wrong_requirements, remarks, file_link=None):
        """Create a change request and set request status to REJECTED."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            # Insert into changes table - one row for each requirement ID
            for requirement_id in wrong_requirements:
                cur.execute("""
                    INSERT INTO changes (request_id, admin_id, requirement_id, remarks, file_link, status)
                    VALUES (%s, %s, %s, %s, %s, 'pending')
                """, (request_id, admin_id, requirement_id, remarks, file_link))
            
            # Update request status to REJECTED
            cur.execute("""
                UPDATE requests
                SET status = 'REJECTED'
                WHERE request_id = %s
            """, (request_id,))
            
            # Log the action
            cur.execute("""
                INSERT INTO logs (admin_id, action, details, request_id)
                VALUES (%s, 'Request Changes', %s, %s)
            """, (admin_id, f'Requested changes for {request_id}. Status set to REJECTED.', request_id))
            
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            print(f"Error creating change request: {e}")
            return False
        finally:
            cur.close()




    @staticmethod
    def get_admin_max_requests(admin_id):
        """Get the max requests for a specific admin."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("SELECT value FROM admin_settings WHERE admin_id = %s AND key = 'max_requests'", (admin_id,))
            row = cur.fetchone()
            return int(row[0]) if row else 10
        finally:
            cur.close()

    @staticmethod
    def set_admin_max_requests(admin_id, max_requests):
        """Set the max requests for a specific admin."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO admin_settings (admin_id, key, value)
                VALUES (%s, 'max_requests', %s)
                ON CONFLICT (admin_id, key) DO UPDATE SET value = EXCLUDED.value
            """, (admin_id, str(max_requests)))
            conn.commit()
        finally:
            cur.close()





    @staticmethod
    def get_request_changes(request_id):
        """Fetch all changes for a specific request."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT c.change_id, c.admin_id, c.requirement_id, c.remarks, c.file_link, c.status, c.created_at, c.updated_at,
                       r.requirement_name
                FROM changes c
                LEFT JOIN requirements r ON c.requirement_id = r.req_id
                WHERE c.request_id = %s
                ORDER BY c.created_at DESC
            """, (request_id,))
            changes = cur.fetchall()
            
            return [
                {
                    "change_id": change[0],
                    "admin_id": change[1],
                    "requirement_id": change[2],
                    "requirement_name": change[8] or "Unknown Requirement",
                    "remarks": change[3],
                    "file_link": change[4],
                    "status": change[5],
                    "created_at": change[6].strftime("%Y-%m-%d %H:%M:%S") if change[6] else None,
                    "updated_at": change[7].strftime("%Y-%m-%d %H:%M:%S") if change[7] else None
                }
                for change in changes
            ]
        finally:
            cur.close()
    
    @staticmethod
    def get_request_by_id(request_id):
        """
        OPTIMIZED: Fetch a single request by ID with all details using JSON aggregation.
        Fully aligned with current PostgreSQL schema.
        """
        conn = g.db_conn
        cur = conn.cursor(cursor_factory=extras.RealDictCursor)

        try:
            cur.execute("""
                WITH request_base AS (
                    SELECT
                        r.request_id,
                        r.student_id,
                        r.full_name,
                        r.contact_number,
                        r.email,
                        r.preferred_contact,
                        r.status,
                        r.requested_at,
                        r.remarks,
                        r.total_cost,
                        r.payment_status,
                        r.college_code,
                        r.order_type,
                        r.payment_date,
                        r.payment_reference,
                        r.payment_type
                    FROM requests r
                    WHERE r.request_id = %s
                ),

                auth_letter_data AS (
                    SELECT
                        al.id AS request_id,
                        'Outsider' AS requester_type,
                        json_build_object(
                            'id', al.id,
                            'file_url', al.file_url,
                            'requester_name', al.requester_name,
                            'number', al.number
                        ) AS authorization_letter
                    FROM auth_letters al
                    WHERE al.id = %s
                ),

                documents_data AS (
                    SELECT
                        rd.request_id,
                        json_agg(
                            json_build_object(
                                'doc_id', rd.doc_id,
                                'name', d.doc_name,
                                'quantity', rd.quantity,
                                'cost', d.cost,
                                'requires_payment_first', d.requires_payment_first,
                                'is_done', rd.is_done
                            )
                            ORDER BY d.doc_name
                        ) AS documents
                    FROM request_documents rd
                    JOIN documents d ON d.doc_id = rd.doc_id
                    WHERE rd.request_id = %s
                    GROUP BY rd.request_id
                ),

                requirements_data AS (
                    SELECT
                        t.request_id,
                        json_agg(t.requirement_name ORDER BY t.requirement_name) AS requirements,
                        json_agg(
                            json_build_object(
                                'req_id', t.req_id,
                                'name', t.requirement_name
                            )
                            ORDER BY t.requirement_name
                        ) AS all_requirements
                    FROM (
                        SELECT DISTINCT
                            rd.request_id,
                            r.req_id,
                            r.requirement_name
                        FROM request_documents rd
                        JOIN document_requirements dr ON dr.doc_id = rd.doc_id
                        JOIN requirements r ON r.req_id = dr.req_id
                        WHERE rd.request_id = %s
                    ) t
                    GROUP BY t.request_id
                ),

                uploaded_files_data AS (
                    SELECT
                        rrl.request_id,
                        json_agg(
                            json_build_object(
                                'requirement', req.requirement_name,
                                'file_path', rrl.file_path
                            )
                            ORDER BY rrl.uploaded_at
                        ) AS uploaded_files
                    FROM request_requirements_links rrl
                    JOIN requirements req ON req.req_id = rrl.requirement_id
                    WHERE rrl.request_id = %s
                    GROUP BY rrl.request_id
                ),

                others_docs_data AS (
                    SELECT
                        od.request_id,
                        json_agg(
                            json_build_object(
                                'id', od.id,
                                'name', od.document_name,
                                'description', od.document_description,
                                'created_at', to_char(od.created_at, 'YYYY-MM-DD HH24:MI:SS'),
                                'is_done', od.is_done
                            )
                            ORDER BY od.created_at
                        ) AS others_documents
                    FROM others_docs od
                    WHERE od.request_id = %s
                    GROUP BY od.request_id
                )

                SELECT
                    rb.*,
                    COALESCE(auth.requester_type, 'Student') AS requester_type,
                    auth.authorization_letter,
                    COALESCE(doc.documents, '[]'::json) AS documents,
                    COALESCE(req.requirements, '[]'::json) AS requirements,
                    COALESCE(req.all_requirements, '[]'::json) AS all_requirements,
                    COALESCE(files.uploaded_files, '[]'::json) AS uploaded_files,
                    COALESCE(others.others_documents, '[]'::json) AS others_documents
                FROM request_base rb
                LEFT JOIN auth_letter_data auth ON auth.request_id = rb.request_id
                LEFT JOIN documents_data doc ON doc.request_id = rb.request_id
                LEFT JOIN requirements_data req ON req.request_id = rb.request_id
                LEFT JOIN uploaded_files_data files ON files.request_id = rb.request_id
                LEFT JOIN others_docs_data others ON others.request_id = rb.request_id
            """, (request_id,) * 6)

            result = cur.fetchone()
            if not result:
                return None

            request_data = dict(result)

            # Normalize datetime
            if request_data.get("requested_at"):
                request_data["requested_at"] = request_data["requested_at"].strftime("%Y-%m-%d %H:%M:%S")

            # Attach logs & changes
            recent_logs = ManageRequestModel.get_recent_logs_for_request(request_id, limit=1)
            request_data["recent_log"] = recent_logs[0] if recent_logs else None
            request_data["changes"] = ManageRequestModel.get_request_changes(request_id)

            return request_data

        except Exception as e:
            print(f"Error in optimized get_request_by_id: {e}")
            return ManageRequestModel.get_request_by_id_original(request_id)

        finally:
            cur.close()

    @staticmethod
    def get_request_by_id_original(request_id):
        """
        Original method kept as fallback if optimized version fails.
        """
        conn = g.db_conn
        cur = conn.cursor()

        try:
            cur.execute("""
                SELECT request_id, student_id, full_name, contact_number, email, preferred_contact, status, requested_at, remarks, total_cost, payment_status, college_code, order_type, payment_date, payment_reference, payment_type
                FROM requests
                WHERE request_id = %s
            """, (request_id,))
            req = cur.fetchone()

            if not req:
                return None

            request_data = {
                "request_id": req[0],
                "student_id": req[1],
                "full_name": req[2],
                "contact_number": req[3],
                "email": req[4],
                "preferred_contact": req[5],
                "status": req[6],
                "requested_at": req[7].strftime("%Y-%m-%d %H:%M:%S") if req[7] else None,
                "remarks": req[8],
                "total_cost": req[9],
                "payment_status": req[10],
                "college_code": req[11],
                "pickup_option": req[12],
                "payment_date": req[13],
                "payment_reference": req[14],
                "payment_type": req[15]
            }

            # Check if request exists in auth_letters table to determine requester type
            cur.execute("""
                SELECT id, file_url, requester_name
                FROM auth_letters
                WHERE id = %s
            """, (request_id,))
            auth_letter = cur.fetchone()
            
            if auth_letter:
                request_data["requester_type"] = "Outsider"
                request_data["authorization_letter"] = {
                    "id": auth_letter[0],
                    "file_url": auth_letter[1],
                    "requester_name": auth_letter[2]
                }
            else:
                request_data["requester_type"] = "Student"
                request_data["authorization_letter"] = None

            # Fetch requested documents with cost and payment requirements
            cur.execute("""
                SELECT rd.doc_id, d.doc_name, rd.quantity, d.cost, d.requires_payment_first, rd.is_done
                FROM request_documents rd
                JOIN documents d ON rd.doc_id = d.doc_id
                WHERE rd.request_id = %s
            """, (request_id,))
            docs = cur.fetchall()
            request_data["documents"] = [{"doc_id": doc[0], "name": doc[1], "quantity": doc[2], "cost": doc[3], "requires_payment_first": doc[4], "is_done": doc[5]} for doc in docs]


            # Fetch requirements
            cur.execute("""
                SELECT DISTINCT r.req_id, r.requirement_name
                FROM request_documents rd
                JOIN document_requirements dr ON rd.doc_id = dr.doc_id
                JOIN requirements r ON dr.req_id = r.req_id
                WHERE rd.request_id = %s
            """, (request_id,))
            reqs = cur.fetchall()
            request_data["requirements"] = [req[1] for req in reqs]
            request_data["all_requirements"] = [{"req_id": req[0], "name": req[1]} for req in reqs]

            # Fetch uploaded files
            cur.execute("""
                SELECT r.requirement_name, rrl.file_path
                FROM request_requirements_links rrl
                JOIN requirements r ON rrl.requirement_id = r.req_id
                WHERE rrl.request_id = %s
            """, (request_id,))
            files = cur.fetchall()
            request_data["uploaded_files"] = [{"requirement": file[0], "file_path": file[1]} for file in files]

            # Fetch others documents (custom documents)
            cur.execute("""
                SELECT id, document_name, document_description, created_at, is_done
                FROM others_docs
                WHERE request_id = %s
                ORDER BY created_at ASC
            """, (request_id,))
            others_docs = cur.fetchall()
            request_data["others_documents"] = [
                {
                    "id": doc[0], 
                    "name": doc[1], 
                    "description": doc[2], 
                    "created_at": doc[3].strftime("%Y-%m-%d %H:%M:%S") if doc[3] else None,
                    "is_done": doc[4]
                } 
                for doc in others_docs
            ]

            # Fetch recent logs
            recent_logs = ManageRequestModel.get_recent_logs_for_request(request_id, limit=1)
            request_data["recent_log"] = recent_logs[0] if recent_logs else None

            # Fetch changes for this request
            request_data["changes"] = ManageRequestModel.get_request_changes(request_id)

            return request_data
        finally:
            cur.close()


    @staticmethod
    def unassign_request_from_admin(request_id, admin_id):
        """Unassign a request from an admin."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                DELETE FROM request_assignments
                WHERE request_id = %s AND admin_id = %s
            """, (request_id, admin_id))
            conn.commit()
            return cur.rowcount > 0  # Return True if a row was deleted
        except Exception as e:
            conn.rollback()
            print(f"Error unassigning request {request_id} from admin {admin_id}: {e}")
            return False
        finally:
            cur.close()


    @staticmethod
    def toggle_document_completion(request_id, doc_id, admin_id):
        """Toggle the is_done status of a document in a request."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            # First, get the current status
            cur.execute("""
                SELECT is_done
                FROM request_documents
                WHERE request_id = %s AND doc_id = %s
            """, (request_id, doc_id))
            result = cur.fetchone()
            
            if not result:
                return False, "Document not found"
            
            current_status = result[0]
            new_status = not current_status
            
            # Update the status
            cur.execute("""
                UPDATE request_documents
                SET is_done = %s
                WHERE request_id = %s AND doc_id = %s
            """, (new_status, request_id, doc_id))
            
            if cur.rowcount > 0:
                # Log the action
                cur.execute("""
                    INSERT INTO logs (admin_id, action, details, request_id)
                    VALUES (%s, %s, %s, %s)
                """, (admin_id, 'Document Status Toggled', 
                      f'Toggled document {doc_id} completion status to {"completed" if new_status else "not completed"} for request {request_id}', 
                      request_id))
                conn.commit()
                return True, new_status
            else:
                return False, "Failed to update document status"
        except Exception as e:
            conn.rollback()
            print(f"Error toggling document completion for request {request_id}, doc {doc_id}: {e}")
            return False, str(e)
        finally:
            cur.close()

    @staticmethod
    def toggle_others_document_completion(request_id, doc_id, admin_id):
        """Toggle the is_done status of an others document in a request."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            # First, get the current status
            cur.execute("""
                SELECT is_done
                FROM others_docs
                WHERE id = %s AND request_id = %s
            """, (doc_id, request_id))
            result = cur.fetchone()
            
            if not result:
                return False, "Others document not found"
            
            current_status = result[0]
            new_status = not current_status
            
            # Update the status
            cur.execute("""
                UPDATE others_docs
                SET is_done = %s
                WHERE id = %s AND request_id = %s
            """, (new_status, doc_id, request_id))
            
            if cur.rowcount > 0:
                # Log the action
                cur.execute("""
                    INSERT INTO logs (admin_id, action, details, request_id)
                    VALUES (%s, %s, %s, %s)
                """, (admin_id, 'Others Document Status Toggled', 
                      f'Toggled others document {doc_id} completion status to {"completed" if new_status else "not completed"} for request {request_id}', 
                      request_id))
                conn.commit()
                return True, new_status
            else:
                return False, "Failed to update others document status"
        except Exception as e:
            conn.rollback()
            print(f"Error toggling others document completion for request {request_id}, doc {doc_id}: {e}")
            return False, str(e)
        finally:
            cur.close()
