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
                SELECT student_id, full_name, contact_number, email, liability_status
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
                "liability_status": bool(row[4])
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
            
    #store request_id and student_id to db
    @staticmethod
    def store_request(request_id, student_id):
        """
        Stores the request_id and student_id into the requests table.
        """
        conn = db_pool.getconn()
        cur = conn.cursor()

        try:
            cur.execute("""
                INSERT INTO requests (request_id, student_id)
                VALUES (%s, %s)
            """, (request_id, student_id))
            conn.commit()
            return True

        except Exception as e:
            print(f"Error storing request data: {e}")
            conn.rollback()
            return False

        finally:
            cur.close()
            db_pool.putconn(conn)
            
   #store student full name, contact number, email to db
    @staticmethod
    def store_student_info(request_id, student_id, full_name, contact_number, email):
        """
        Stores or updates the student's full name, contact number, and email
        in the requests table based on request_id.
        """
        conn = db_pool.getconn()
        cur = conn.cursor()

        try:
            cur.execute("""
                INSERT INTO requests (request_id, student_id, full_name, contact_number, email)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (request_id) DO UPDATE
                SET full_name = EXCLUDED.full_name,
                    contact_number = EXCLUDED.contact_number,
                    email = EXCLUDED.email,
                    student_id = EXCLUDED.student_id
            """, (request_id, student_id, full_name, contact_number, email))
            conn.commit()
            return True

        except Exception as e:
            print(f"Error storing student info: {e}")
            conn.rollback()
            return False

        finally:
            cur.close()
            db_pool.putconn(conn)

    #store preferred contact to db
    @staticmethod
    def store_preferred_contact(request_id, preferred_contact):
        """
        Stores or updates the preferred contact method in the requests table.
        """
        conn = db_pool.getconn()
        cur = conn.cursor()

        try:
            cur.execute("""
                UPDATE requests
                SET preferred_contact = %s
                WHERE request_id = %s
            """, (preferred_contact, request_id))
            conn.commit()
            return True

        except Exception as e:
            print(f"Error storing preferred contact: {e}")
            conn.rollback()
            return False

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
            
    @staticmethod
    def get_uploaded_files(request_id):
        """
        Fetch previously uploaded requirement files for a given request.
        Returns a dict: {requirement_id: file_path}
        """
        conn = db_pool.getconn()
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT requirement_id, file_path
                FROM request_requirements_links
                WHERE request_id = %s
            """, (request_id,))
            rows = cur.fetchall()
            return {row[0]: row[1] for row in rows}
        finally:
            cur.close()
            db_pool.putconn(conn)
            
            
    @staticmethod
    def delete_requirement_file(request_id, requirement_id):
        """
        Delete a requirement file from Supabase and DB.
        """
        from supabase import create_client, Client
        from config import SUPABASE_URL, SUPABASE_ANON_KEY

        conn = db_pool.getconn()
        cur = conn.cursor()
        try:
            # Get file URL
            cur.execute("""
                SELECT file_path FROM request_requirements_links
                WHERE request_id = %s AND requirement_id = %s
            """, (request_id, requirement_id))
            row = cur.fetchone()
            if row:
                file_path = row[0]
                # Extract file path from URL for deletion in Supabase
                # URL Format is https://supabase-url.supabase.co/storage/v1/object/public/requirements-odr/request_id/req_id_filename
                # Extract path after 'requirements-odr/'
                from urllib.parse import urlparse
                parsed = urlparse(file_path)
                if parsed.path and 'requirements-odr' in parsed.path:
                    path_parts = parsed.path.split('requirements-odr/', 1)
                    if len(path_parts) > 1:
                        file_path_in_bucket = path_parts[1]
                        supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
                        supabase.storage.from_('requirements-odr').remove([file_path_in_bucket])

                # Delete from DB
                cur.execute("""
                    DELETE FROM request_requirements_links
                    WHERE request_id = %s AND requirement_id = %s
                """, (request_id, requirement_id))
                conn.commit()
            return True, "File deleted"
        except Exception as e:
            conn.rollback()
            print(f"Error deleting file: {e}")
            return False, "Error deleting file"
        finally:
            cur.close()
            db_pool.putconn(conn)
            
   #fetch requirements needed by request id
    @staticmethod
    def get_requirements_by_request_id(request_id):
        """
        Fetch all unique requirements for the documents in a given request.

        Args:
            request_id (str): The request ID (e.g., "R0000123")

        Returns:
            dict: {"requirements": [{"req_id": "REQ0001", "requirement_name": "Birth Certificate"}, ...]}
        """
        if not request_id:
            return {"requirements": []}

        conn = db_pool.getconn()
        cur = conn.cursor()

        try:
            query = """
                SELECT DISTINCT r.req_id, r.requirement_name
                FROM request_documents rd
                JOIN document_requirements dr ON rd.doc_id = dr.doc_id
                JOIN requirements r ON dr.req_id = r.req_id
                WHERE rd.request_id = %s
                ORDER BY r.requirement_name;
            """
            cur.execute(query, (request_id,))
            rows = cur.fetchall()

            # Extract req_id and requirement_name
            requirement_list = [{"req_id": row[0], "requirement_name": row[1]} for row in rows] if rows else []
            return {"requirements": requirement_list}

        except Exception as e:
            print(f"Error fetching requirements for request {request_id}: {e}")
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
            
    # get contact number and email by student id from requests table
    @staticmethod
    def get_contact_info_by_student_id(student_id):
        """
        Fetch contact number and email for a given student ID from the requests table.

        Args:
            student_id (str): The student ID.

        Returns:
            dict: A dictionary with 'contact_number' and 'email' if found, else None.
        """
        conn = db_pool.getconn()  # assuming you have a connection pool
        cur = conn.cursor()

        try:
            query = """
                SELECT contact_number, email
                FROM requests
                WHERE student_id = %s
                ORDER BY requested_at DESC
                LIMIT 1
            """
            cur.execute(query, (student_id,))
            result = cur.fetchone()
            if result:
                return {"contact_number": result[0], "email": result[1]}
            else:
                return None
        except Exception as e:
            print(f"Error fetching contact info: {e}")
            return None
        finally:
            cur.close()
            db_pool.putconn(conn)

    #mark request as complete
    @staticmethod
    def mark_request_complete(request_id, total_cost):
        """
        Marks a request as complete in the requests table and stores the total cost.
        """
        conn = db_pool.getconn()
        cur = conn.cursor()

        try:
            cur.execute("""
                UPDATE requests
                SET status = 'SUBMITTED', completed_at = NOW(), total_cost = %s
                WHERE request_id = %s
            """, (total_cost, request_id))
            conn.commit()

        except Exception as e:
            print(f"Error marking request as complete: {e}")
            conn.rollback()

        finally:
            cur.close()
            db_pool.putconn(conn)
