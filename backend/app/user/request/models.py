from flask import g
from app import db_pool
import random
from psycopg2 import extras
import os

class Request:
   
    #Dummy function to simulate fetching student data from a Dummy DB called odr: 'students' table
    @staticmethod
    def get_student_data(student_id):
        """
        Fetch student details from the local dummy 'students' table.
        Returns a dictionary with student info or None if not found.
        """
        conn = db_pool.getconn()
        cur = conn.cursor()

        try:

            cur.execute("""
                SELECT student_id, full_name, contact_number, email, liability_status, college_code
                FROM students
                WHERE student_id = %s
            """, (student_id,))

            row = cur.fetchone()

            if not row:
                return None

            student_data = {
                "student_id": row[0],
                "full_name": row[1],
                "contact_number": row[2],
                "email": row[3],
                "liability_status": bool(row[4]),
                "college_code": row[5]
            }

            print(f"Fetched student data: {student_data}")  
            return student_data

        except Exception as e:
            print(f"Error fetching student data: {e}")
            return None

        finally:
            cur.close()
            db_pool.putconn(conn)

    #Generate unique request ID
    @staticmethod
    def generate_unique_request_id():
        """
        Generates a unique request ID in the format R0000000.
        Randomly generates numbers and ensures they do not exist in the DB.
        """
        conn = db_pool.getconn()
        cur = conn.cursor()

        try:
            while True:
                # Generate random 7-digit number and prefix with 'R'
                random_number = random.randint(0, 9999999)
                request_id = f"R{random_number:07d}"

                # Check if ID exists in database
                cur.execute("SELECT 1 FROM requests WHERE request_id = %s", (request_id,))
                if not cur.fetchone():  # Unique ID found
                    return request_id

        except Exception as e:
            print(f"Error generating unique request ID: {e}")
            return None

        finally:
            cur.close()
            db_pool.putconn(conn)
            
   #store requested documents to db
    @staticmethod
    def store_requested_documents(request_id, document_ids, quantity_list):
        """
        Stores the requested documents along with their quantities into the request_documents table.
        Deletes all existing documents for the request_id before inserting new ones.
        """
        conn = db_pool.getconn()
        cur = conn.cursor()

        try:
            # Delete all existing documents for this request_id
            cur.execute("""
                DELETE FROM request_documents
                WHERE request_id = %s
            """, (request_id,))

            for doc_id, quantity in zip(document_ids, quantity_list):
                cur.execute("""
                    INSERT INTO request_documents (request_id, doc_id, quantity)
                    VALUES (%s, %s, %s)
                """, (request_id, doc_id, quantity))
            conn.commit()
            return True

        except Exception as e:
            print(f"Error storing requested documents: {e}")
            conn.rollback()
            return False

        finally:
            cur.close()
            db_pool.putconn(conn)



    #fetch requirements needed by document IDs (for UploadRequirements step)
    @staticmethod
    def get_requirements_by_document_ids(document_ids):
        """
        Fetch all unique requirements for selected documents.
        Requirements are deduplicated - same requirement appearing in multiple documents 
        will only appear once in the result.

        Args:
            document_ids (list): List of document IDs

        Returns:
            dict: {"requirements": [{"req_id": "REQ0001", "requirement_name": "Birth Certificate", "doc_names": ["Document 1", "Document 2"]}, ...]}
        """
        if not document_ids:
            return {"requirements": []}

        conn = db_pool.getconn()
        cur = conn.cursor()

        try:
            # Create placeholders for the IN clause
            placeholders = ','.join(['%s'] * len(document_ids))
            query = f"""
                SELECT r.req_id, r.requirement_name, STRING_AGG(dl.doc_name, ', ' ORDER BY dl.doc_name) as doc_names
                FROM document_requirements dr
                JOIN requirements r ON dr.req_id = r.req_id
                JOIN documents dl ON dr.doc_id = dl.doc_id
                WHERE dr.doc_id IN ({placeholders})
                GROUP BY r.req_id, r.requirement_name
                ORDER BY r.requirement_name;
            """
            cur.execute(query, tuple(document_ids))
            rows = cur.fetchall()

            # Extract req_id, requirement_name, and doc_names (comma-separated list)
            requirement_list = [
                {
                    "req_id": row[0], 
                    "requirement_name": row[1],
                    "doc_names": row[2].split(', ') if row[2] else []
                } 
                for row in rows
            ] if rows else []
            return {"requirements": requirement_list}

        except Exception as e:
            print(f"Error fetching requirements for documents {document_ids}: {e}")
            return {"requirements": []}

        finally:
            cur.close()
            db_pool.putconn(conn)
            
    @staticmethod
    def store_requirement_files(request_id, requirements):
        """
        Stores requirement files for a request.
        Args:
            request_id (str): The request ID.
            requirements (list of dict): Each dict contains 'requirement_id' and 'file_path'.
        Returns:
            tuple: (success: bool, message: str)
        """
        if not request_id or not requirements or not isinstance(requirements, list):
            return False, "Invalid data provided."

        conn = db_pool.getconn()
        cur = conn.cursor()

        try:
            insert_values = []
            for req in requirements:
                requirement_id = req.get("requirement_id")
                file_path = req.get("file_path")
                if not requirement_id or not file_path:
                    continue
                insert_values.append((request_id, requirement_id, file_path))

            if not insert_values:
                return False, "No valid requirement files provided."

            # Bulk insert with ON CONFLICT
            cur.executemany("""
                INSERT INTO request_requirements_links (request_id, requirement_id, file_path)
                VALUES (%s, %s, %s)
                ON CONFLICT (request_id, requirement_id)
                DO UPDATE SET file_path = EXCLUDED.file_path, uploaded_at = NOW()
            """, insert_values)

            conn.commit()
            return True, "Requirement files submitted successfully."

        except Exception as e:
            conn.rollback()
            print(f"Error submitting requirement files: {e}")
            return False, "Failed to submit requirement files."

        finally:
            cur.close()
            db_pool.putconn(conn)
        



    @staticmethod
    def submit_request(request_id, student_id, full_name, contact_number, email, preferred_contact, payment_status, total_cost, admin_fee, college_code, remarks=None, order_type=None):
        """
        Submit a complete request with all student information and details.
        This method consolidates multiple database operations into one transaction.
        """
        conn = db_pool.getconn()
        cur = conn.cursor()


        try:
            # Use the admin_fee passed from frontend
            admin_fee_amount = float(admin_fee) if admin_fee else 0.0
            print(f"Using admin fee from frontend: {admin_fee_amount}")

            # Use INSERT ... ON CONFLICT DO UPDATE for upsert behavior
            cur.execute("""
                INSERT INTO requests (
                    request_id, student_id, full_name, contact_number, email,
                    preferred_contact, payment_status, total_cost, remarks, order_type, status, college_code, admin_fee_amount
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'PENDING', %s, %s)
                ON CONFLICT (request_id) DO UPDATE SET
                    student_id = EXCLUDED.student_id,
                    full_name = EXCLUDED.full_name,
                    contact_number = EXCLUDED.contact_number,
                    email = EXCLUDED.email,
                    preferred_contact = EXCLUDED.preferred_contact,
                    payment_status = EXCLUDED.payment_status,
                    total_cost = EXCLUDED.total_cost,
                    remarks = EXCLUDED.remarks,
                    order_type = EXCLUDED.order_type,
                    college_code = EXCLUDED.college_code,
                    admin_fee_amount = EXCLUDED.admin_fee_amount,
                    status = 'PENDING'
            """, (request_id, student_id, full_name, contact_number, email, 
                  preferred_contact, payment_status, total_cost, remarks, order_type, college_code, admin_fee_amount))
            
            conn.commit()

            print(f"Request {request_id} submitted successfully with admin fee: {admin_fee_amount}")
            return True

        except Exception as e:
            print(f"Error submitting request: {e}")
            conn.rollback()
            return False

        finally:
            cur.close()
            db_pool.putconn(conn)

    @staticmethod
    def get_active_requests_by_student(student_id):
        """
        Fetch all active requests for a student (status != 'RELEASED').
        Returns a list of requests with their documents and current status.
        Also includes custom documents from others_docs table.
        
        Args:
            student_id (str): The student ID to query
            
        Returns:
            list: List of dictionaries containing request details
        """
        conn = db_pool.getconn()
        cur = conn.cursor()

        try:
            # OPTIMIZED: Single query with LEFT JOIN to fetch all data at once
            # Eliminates N+1 query problem by fetching custom documents in the main query
            cur.execute("""
                SELECT 
                    r.request_id,
                    r.status,
                    r.total_cost,
                    r.remarks,
                    r.requested_at,
                    r.college_code,
                    COALESCE(doc_docs.documents, 'No documents') as documents,
                    COALESCE(doc_docs.regular_doc_count, 0) as regular_doc_count,
                    COALESCE(custom_docs.custom_documents_json, '[]'::json) as custom_documents
                FROM requests r

                LEFT JOIN (
                    SELECT 
                        rd.request_id,
                        STRING_AGG(
                            DISTINCT CONCAT(dl.doc_name, ' (', rd.quantity, ')'),
                            ', ' ORDER BY CONCAT(dl.doc_name, ' (', rd.quantity, ')')
                        ) AS documents,
                        SUM(rd.quantity) AS regular_doc_count
                    FROM request_documents rd
                    INNER JOIN documents dl ON rd.doc_id = dl.doc_id
                    GROUP BY rd.request_id
                ) doc_docs ON r.request_id = doc_docs.request_id

                LEFT JOIN (
                    SELECT 
                        request_id,
                        json_agg(
                            json_build_object(
                                'id', id,
                                'doc_name', document_name,
                                'description', document_description,
                                'created_at', to_char(created_at, 'YYYY-MM-DD HH24:MI:SS')
                            )
                        ) as custom_documents_json
                    FROM others_docs
                    GROUP BY request_id
                ) custom_docs ON r.request_id = custom_docs.request_id

                WHERE r.student_id = %s AND r.status != 'RELEASED'
                ORDER BY r.requested_at DESC
            """, (student_id,))
            
            rows = cur.fetchall()
            active_requests = []
            
            for row in rows:
                request_id = row[0]
                
                # Parse custom documents from JSON
                custom_documents = row[8] if row[8] and row[8] != '[]' else []
                custom_doc_count = len(custom_documents) if isinstance(custom_documents, list) else 0

                # Calculate total document count (regular + custom)
                regular_doc_count = row[7] or 0
                total_doc_count = int(regular_doc_count) + custom_doc_count

                request_data = {
                    "request_id": row[0],
                    "status": row[1],
                    "total_cost": float(row[2]) if row[2] else 0.0,
                    "remarks": row[3] or "",
                    "requested_at": row[4].strftime("%Y-%m-%d %H:%M:%S") if row[4] else "",
                    "college_code": row[5],
                    "documents": row[6] or "No documents",
                    "document_count": total_doc_count,
                    "regular_doc_count": int(regular_doc_count),
                    "custom_documents": custom_documents
                }
                active_requests.append(request_data)

            return active_requests
            
        except Exception as e:
            print(f"Error fetching active requests for student {student_id}: {e}")
            return []
            
        finally:
            cur.close()
            db_pool.putconn(conn)

    @staticmethod
    def store_custom_documents(request_id, student_id, custom_documents):
        """
        Store custom documents in the others_docs table.
        
        Args:
            request_id (str): The request ID
            student_id (str): The student ID
            custom_documents (list): List of custom document objects with doc_name and description
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not custom_documents:
            return True

        conn = db_pool.getconn()
        cur = conn.cursor()

        try:
            insert_values = []
            for doc in custom_documents:
                if isinstance(doc, dict) and 'doc_name' in doc and 'description' in doc:
                    insert_values.append((
                        request_id, 
                        student_id, 
                        doc['doc_name'], 
                        doc['description']
                    ))

            if not insert_values:
                return False

            cur.executemany("""
                INSERT INTO others_docs (request_id, student_id, document_name, document_description)
                VALUES (%s, %s, %s, %s)
            """, insert_values)

            conn.commit()
            return True

        except Exception as e:
            print(f"Error storing custom documents: {e}")
            conn.rollback()
            return False

        finally:
            cur.close()
            db_pool.putconn(conn)

    @staticmethod
    def get_custom_documents(request_id):
        """
        Fetch custom documents for a specific request.
        
        Args:
            request_id (str): The request ID
            
        Returns:
            list: List of custom document dictionaries
        """
        conn = db_pool.getconn()
        cur = conn.cursor()

        try:
            cur.execute("""
                SELECT id, document_name, document_description, created_at
                FROM others_docs
                WHERE request_id = %s
                ORDER BY created_at ASC
            """, (request_id,))
            
            rows = cur.fetchall()
            
            custom_docs = []
            for row in rows:
                custom_docs.append({
                    "id": row[0],
                    "doc_name": row[1],
                    "description": row[2],
                    "created_at": row[3].strftime("%Y-%m-%d %H:%M:%S") if row[3] else ""
                })
            
            return custom_docs

        except Exception as e:
            print(f"Error fetching custom documents for request {request_id}: {e}")
            return []

        finally:
            cur.close()
            db_pool.putconn(conn)
