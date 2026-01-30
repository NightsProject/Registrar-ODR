from flask import g
from app import db_pool

class Tracking:
    @staticmethod
    def get_record_by_tracking_number(tracking_number):
        """
        Fetches a request record from the database using tracking_number.

        Args:
            tracking_number (str): The request_id of the record.

        Returns:
            dict: A dictionary containing the tracking data if found, otherwise None.
        """
        conn = db_pool.getconn()
        cur = conn.cursor()

        try:
            # Query to get the main request details
            cur.execute("""
                SELECT status, total_cost, contact_number, payment_status, order_type, remarks, student_id
                FROM requests
                WHERE request_id = %s
            """, (tracking_number,))

            record = cur.fetchone()

            if not record:
                return None

            # Fetch admin fee from DB
            cur.execute("SELECT value FROM fee WHERE key = 'admin_fee'")
            fee_res = cur.fetchone()
            admin_fee = float(fee_res[0]) if fee_res else 0.0

            # Calculate total amount based on all documents
            cur.execute("""
                SELECT d.cost, rd.quantity, d.requires_payment_first
                FROM request_documents rd
                JOIN documents d ON rd.doc_id = d.doc_id
                WHERE rd.request_id = %s
            """, (tracking_number,))
            
            docs = cur.fetchall()
            total_cost = sum(float(d[0]) * d[1] for d in docs)
            amount_due = total_cost + admin_fee
            
            requires_payment_first = any(d[2] for d in docs)
            
            # If the main request is already paid, override amount due to 0
            if record[3]:  # payment_status from requests table
                amount_due = 0.0

            min_amount_due = amount_due

            # Map database columns to frontend keys
            tracking_data = {
                "status": record[0],
                "amountDue": amount_due,
                "minimumAmountDue": min_amount_due,
                "contact_number": record[2],
                "paymentStatus": record[3],
                "orderType": record[4],
                "remarks": record[5],
                "trackingNumber": tracking_number,
                "studentId": record[6],
                "requiresPaymentFirst": requires_payment_first
            }
            
            return tracking_data

        except Exception as e:
            print(f"Error fetching tracking data: {e}")
            return None
        finally:
            cur.close()
            db_pool.putconn(conn)

    @staticmethod
    def get_requested_documents(tracking_number):
        """
        Fetches the requested documents for a given tracking number.


        Args:
            tracking_number (str): The request_id of the record.
        Returns:
            list: A list of dictionaries containing document details (name, quantity) if found, otherwise None.
        """
        conn = db_pool.getconn()
        cur = conn.cursor()


        try:
            # Query to get the requested documents with names and quantities
            print(f"Fetching documents for tracking number: {tracking_number}")

            cur.execute("""
                SELECT d.doc_name, rd.quantity, d.cost, d.requires_payment_first, rd.payment_status
                FROM request_documents rd
                JOIN documents d ON rd.doc_id = d.doc_id
                WHERE rd.request_id = %s
            """, (tracking_number,))


            records = cur.fetchall()

            print(f"Fetched records for documents: {records}")

            if not records:
                return None


            # Map to list of dicts
            documents = [
                {
                    "name": record[0],
                    "quantity": record[1],
                    "cost": float(record[2]),
                    "requires_payment_first": record[3],
                    "payment_status": record[4]
                }
                for record in records
            ]

            return documents
        
        except Exception as e:
            print(f"Error fetching tracking data: {e}")
            return None
        finally:
            cur.close()
            db_pool.putconn(conn)

    @staticmethod
    def set_order_type(request_id, order_type):
        """
        Sets the order_type for a request.
        """
        conn = db_pool.getconn()
        cur = conn.cursor()

        try:
            cur.execute("""
                UPDATE requests
                SET order_type = %s
                WHERE request_id = %s
            """, (order_type, request_id))
            conn.commit()
            return True

        except Exception as e:
            print(f"Error setting order type: {e}")
            conn.rollback()
            return False

        finally:
            cur.close()
            db_pool.putconn(conn)


    @staticmethod
    def get_student_id_by_tracking_number(tracking_number):
        """
        Fetches the student_id associated with a tracking number.
        """
        conn = db_pool.getconn()
        cur = conn.cursor()
        try:
            cur.execute("SELECT student_id FROM requests WHERE request_id = %s", (tracking_number,))
            row = cur.fetchone()
            return row[0] if row else None
        except Exception as e:
            print(f"Error fetching student_id: {e}")
            return None
        finally:
            cur.close()
            db_pool.putconn(conn)


    @staticmethod
    def get_request_changes_by_tracking_number(tracking_number):
        """
        Fetches the requested changes for a given tracking number.

        Args:
            tracking_number (str): The request_id of the record.
        Returns:
            dict: Dictionary containing consolidated remarks and list of changes, or None if not found.
        """
        conn = db_pool.getconn()
        cur = conn.cursor()

        try:

            # Query to get the changes with requirement names and remarks
            print(f"Fetching changes for tracking number: {tracking_number}")

            cur.execute("""
                SELECT c.change_id, c.remarks, c.status, c.created_at, c.updated_at,
                       c.file_link, r.requirement_name
                FROM changes c
                LEFT JOIN requirements r ON c.requirement_id = r.req_id
                WHERE c.request_id = %s
                ORDER BY c.created_at DESC
            """, (tracking_number,))

            records = cur.fetchall()

            print(f"Fetched records for changes: {records}")

            if not records:
                return None


            # Map to list of dicts
            changes = [
                {
                    "change_id": record[0],
                    "remarks": record[1],
                    "status": record[2],
                    "requirement_name": record[6] or "Unknown Requirement",
                    "created_at": record[3].strftime("%Y-%m-%d %H:%M:%S") if record[3] else None,
                    "updated_at": record[4].strftime("%Y-%m-%d %H:%M:%S") if record[4] else None,
                    "file_link": record[5]  # Add file_link to the response
                }
                for record in records
            ]

            # Get consolidated remarks - use the first change's remarks that has content
            consolidated_remark = None
            for change in changes:
                if change.get('remarks') and change['remarks'].strip():
                    consolidated_remark = change['remarks']
                    break
            
            # If no specific remarks, use a generic message
            if not consolidated_remark:
                if len(changes) == 1:
                    consolidated_remark = "Changes required for this request."
                else:
                    consolidated_remark = f"{len(changes)} changes required for this request."


            return {
                "remarks": consolidated_remark,
                "changes": changes,
                "has_changes": len(changes) > 0
            }
        
        except Exception as e:
            print(f"Error fetching changes data: {e}")
            return None
        finally:
            cur.close()
            db_pool.putconn(conn)






    @staticmethod
    def save_change_file(tracking_number, change_id, file_data_base64, file_name, file_type, student_id):
        """
        Saves an uploaded file for a change request using Supabase storage.
        Only allows file uploads for REJECTED status requests.
        Updates change status to uploaded and request status to PENDING when all files are uploaded.
        
        Args:
            tracking_number (str): The tracking number of the request
            change_id (str): The change ID to associate the file with
            file_data_base64 (str): Base64 encoded file data
            file_name (str): Name of the file
            file_type (str): MIME type of the file
            student_id (str): Student ID for verification
            
        Returns:
            bool: True if successful, False otherwise
        """

        from app.services.supabase_file_service import supabase_file_service
        
        conn = db_pool.getconn()
        cur = conn.cursor()

        try:
            # Check if request status is REJECTED before allowing file upload
            cur.execute("""
                SELECT status FROM requests WHERE request_id = %s
            """, (tracking_number,))
            
            request_record = cur.fetchone()
            if not request_record:
                print(f"Request {tracking_number} not found")
                return False
            
            request_status = request_record[0]
            if request_status != "REJECTED":
                print(f"File upload not allowed for status: {request_status}. Only REJECTED requests allow file uploads.")
                return False

            # Validate file data and parameters
            if not all([file_data_base64, file_name, file_type]):
                print("Missing required file information")
                return False

            # Validate file size (max 10MB)
            try:
                import base64
                file_data = base64.b64decode(file_data_base64)
                if len(file_data) > 10 * 1024 * 1024:  # 10MB
                    print("File size exceeds 10MB limit")
                    return False
            except Exception as e:
                print(f"Invalid file data: {e}")
                return False

            # Validate file type
            allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
            if file_type not in allowed_types:
                print(f"File type {file_type} not allowed. Only PDF, JPG, JPEG, PNG allowed.")
                return False

            # Check if file already exists for this change
            cur.execute("""
                SELECT file_link FROM changes WHERE change_id = %s AND request_id = %s
            """, (change_id, tracking_number))
            
            existing_file = cur.fetchone()
            if existing_file and existing_file[0]:
                print(f"File already uploaded for change {change_id}")
                return False
            
            # Upload file to Supabase
            success, message, file_url = supabase_file_service.upload_change_file(
                tracking_number=tracking_number,
                change_id=change_id,
                file_data_base64=file_data_base64,
                original_filename=file_name,
                content_type=file_type
            )
            
            if not success:
                print(f"Supabase upload failed: {message}")
                return False
            
            # Update the changes table with Supabase file URL and change status to uploaded
            cur.execute("""
                UPDATE changes 
                SET file_link = %s, status = 'uploaded', updated_at = CURRENT_TIMESTAMP
                WHERE change_id = %s AND request_id = %s
            """, (file_url, change_id, tracking_number))
            
            if cur.rowcount > 0:
                # Check if all changes for this request now have files uploaded
                all_completed = Tracking.check_all_changes_completed(tracking_number, cur)
                
                if all_completed:
                    # All files uploaded - update request status from REJECTED to PENDING
                    status_updated = Tracking.update_request_and_changes_status(tracking_number, cur)
                    if not status_updated:
                        print(f"Warning: Failed to update status for request {tracking_number} even though all files are uploaded")
                        # Don't return False here, as the file upload was successful
                    
                conn.commit()
                print(f"Successfully uploaded file for change {change_id} in request {tracking_number}")
                return True
            else:
                # If no rows updated, the change doesn't exist
                print(f"Change {change_id} not found for request {tracking_number}")
                return False
                
        except Exception as e:
            print(f"Error saving change file: {e}")
            try:
                conn.rollback()
            except:
                pass  # Connection might already be closed
            return False
        finally:
            try:
                cur.close()
                db_pool.putconn(conn)
            except:
                pass  # Connection might already be closed or invalid


    @staticmethod
    def check_all_changes_completed(tracking_number, cursor=None):
        """
        Check if all changes for a request have files uploaded.
        
        Args:
            tracking_number (str): The tracking number of the request
            cursor (cursor, optional): Database cursor for transaction consistency
            
        Returns:
            bool: True if all changes have files, False otherwise
        """
        if cursor:
            # Use provided cursor for transaction consistency
            cursor.execute("""
                SELECT COUNT(*) as total_changes,
                       COUNT(CASE WHEN file_link IS NOT NULL AND file_link != '' THEN 1 END) as completed_changes
                FROM changes
                WHERE request_id = %s
            """, (tracking_number,))
            
            result = cursor.fetchone()
            if not result or result[0] == 0:
                return False  # No changes found
                
            total_changes = result[0]
            completed_changes = result[1]
            
            print(f"Request {tracking_number}: {completed_changes}/{total_changes} changes have files uploaded")
            return completed_changes == total_changes
        else:
        
            conn = db_pool.getconn()
            cur = conn.cursor()

            try:
                cur.execute("""
                    SELECT COUNT(*) as total_changes,
                           COUNT(CASE WHEN file_link IS NOT NULL AND file_link != '' THEN 1 END) as completed_changes
                    FROM changes
                    WHERE request_id = %s
                """, (tracking_number,))
                
                result = cur.fetchone()
                if not result or result[0] == 0:
                    return False  # No changes found
                    
                total_changes = result[0]
                completed_changes = result[1]
                
                print(f"Request {tracking_number}: {completed_changes}/{total_changes} changes have files uploaded")
                return completed_changes == total_changes
            except Exception as e:
                print(f"Error checking changes completion: {e}")
                return False
            finally:
                cur.close()
                db_pool.putconn(conn)



    @staticmethod
    def update_request_and_changes_status(tracking_number, cursor):
        """
        Update request status from REJECTED to PENDING and all change statuses from pending to uploaded.
        
        Args:
            tracking_number (str): The tracking number of the request
            cursor (cursor): Database cursor for transaction consistency
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # First update any remaining pending changes to uploaded status
            cursor.execute("""
                UPDATE changes 
                SET status = 'uploaded', updated_at = CURRENT_TIMESTAMP
                WHERE request_id = %s AND status = 'pending'
            """, (tracking_number,))
            
            changes_updated = cursor.rowcount
            
            # Update request status from REJECTED to PENDING
            cursor.execute("""
                UPDATE requests 
                SET status = 'PENDING'
                WHERE request_id = %s AND status = 'REJECTED'
            """, (tracking_number,))
            
            request_updated = cursor.rowcount > 0
            
            if request_updated:
                print(f"Successfully updated request {tracking_number} status from REJECTED to PENDING")
                if changes_updated > 0:
                    print(f"Updated {changes_updated} change(s) from 'pending' to 'uploaded'")
                return True
            else:
                print(f"Failed to update status for request {tracking_number} - request may not be in REJECTED status")
                return False
                
        except Exception as e:
            print(f"Error updating request and change statuses: {e}")
            return False

    @staticmethod
    def update_request_status_only(tracking_number, cursor):
        """
        Update request status from REJECTED to PENDING (only the request status, not change statuses).
        
        Args:
            tracking_number (str): The tracking number of the request
            cursor (cursor): Database cursor for transaction consistency
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Update request status from REJECTED to PENDING
            cursor.execute("""
                UPDATE requests 
                SET status = 'PENDING'
                WHERE request_id = %s AND status = 'REJECTED'
            """, (tracking_number,))
            
            request_updated = cursor.rowcount > 0
            
            if request_updated:
                print(f"Successfully updated request {tracking_number} status from REJECTED to PENDING")
                return True
            else:
                print(f"Failed to update status for request {tracking_number}")
                return False
                
        except Exception as e:
            print(f"Error updating request status: {e}")
            return False
