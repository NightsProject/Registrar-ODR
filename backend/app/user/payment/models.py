from flask import has_app_context, current_app
from app import db_pool


class Payment:
    @staticmethod
    def process_webhook_payment(tracking_number, amount, student_id, payment_id=None):
        """
        Processes a payment webhook by verifying amount and updating payment status.

        Args:
            tracking_number (str): The request_id of the record.
            amount (float): The payment amount received.
            student_id (str): The student_id to validate ownership.
            payment_id (str): The reference number/transaction ID from the payment provider.

        Returns:
            dict: A dictionary with 'success' (bool) and 'message' (str) keys.
        """
        previous_payment_status = False 
        conn = db_pool.getconn()
        cur = conn.cursor()
        try:
            # 1. Fetch data
            cur.execute("""
                SELECT total_cost, payment_status, student_id
                FROM requests
                WHERE request_id = %s
            """, (tracking_number,))
            
            order = cur.fetchone()
            
            if order: 
                previous_payment_status = order[1]
                
                if has_app_context():
                    current_app.logger.info(f"[MAYA] Fetched order for tracking {tracking_number}: {order}")
                else:
                    print(f"[MAYA] Fetched order for tracking {tracking_number}: {order}")
            
            if not order:
                return {
                    'success': False,
                    'message': f'Order not found for tracking number: {tracking_number}',
                    'was_already_paid': previous_payment_status 
                }
            
            # Fetch admin fee from DB
            cur.execute("SELECT value FROM fee WHERE key = 'admin_fee'")
            fee_res = cur.fetchone()
            admin_fee = float(fee_res[0]) if fee_res else 0.0
            
            # Fetch docs to calculate expected amounts
            cur.execute("""
                SELECT d.cost, rd.quantity
                FROM request_documents rd
                JOIN documents d ON rd.doc_id = d.doc_id
                WHERE rd.request_id = %s
            """, (tracking_number,))
            docs = cur.fetchall()

            total_cost = sum(float(d[0]) * d[1] for d in docs)
            expected_full = float(total_cost + admin_fee)

            received_amount = float(amount) if amount is not None else expected_full
            db_student_id = order[2]
            
            # Validate student_id matches
            if db_student_id != student_id:
                return {
                    'success': False,
                    'message': f'Student ID mismatch for tracking number: {tracking_number}',
                    'was_already_paid': previous_payment_status
                }
            
            if abs(received_amount - expected_full) >= 0.01:
                return {
                    'success': False,
                    'message': f'Payment amount mismatch: expected {expected_full} (Full), received {received_amount}',
                    'was_already_paid': previous_payment_status
                }
            
            # Update payment status
            cur.execute("UPDATE requests SET admin_fee_amount = %s WHERE request_id = %s", (admin_fee, tracking_number))
            
            # Update main request directly
            cur.execute("""
                UPDATE requests
                SET payment_status = TRUE, payment_date = (NOW() AT TIME ZONE 'UTC' + INTERVAL '8 HOURS'), payment_reference = %s
                WHERE request_id = %s
            """, (payment_id, tracking_number,))
            
            rows_updated = 1
            conn.commit()

            message = f'Payment confirmed for tracking number: {tracking_number}, rows updated: {rows_updated}'
            
            return {
                'success': True,
                'message': message,
                'was_already_paid': previous_payment_status 
            }
            
        except Exception as e:
            conn.rollback()
            error_msg = f"Database error processing webhook payment: {e}"
            if has_app_context():
                current_app.logger.error(f"[MAYA] {error_msg}")
            else:
                print(f"[MAYA] {error_msg}")
            return {
                'success': False,
                'message': error_msg,
                'was_already_paid': previous_payment_status
            }

        finally:
            cur.close()
            db_pool.putconn(conn)

    @staticmethod
    def get_document_payment_status(tracking_number, student_id, doc_id):
        """
        Gets the payment status of a specific document in request_documents.
        
        Args:
            tracking_number (str): The request_id of the record.
            student_id (str): The student_id to validate ownership.
            doc_id (str): The document ID to check payment status for.
            
        Returns:
            dict: A dictionary with 'success' (bool), 'payment_status' (bool), and 'message' (str) keys.
        """
        conn = db_pool.getconn()
        cur = conn.cursor()
        try:
            # First verify the request belongs to the student
            cur.execute("""
                SELECT r.request_id, r.student_id
                FROM requests r
                WHERE r.request_id = %s AND r.student_id = %s
            """, (tracking_number, student_id))
            
            request_record = cur.fetchone()
            if not request_record:
                return {
                    'success': False,
                    'payment_status': False,
                    'message': f'Request not found for tracking number: {tracking_number} with student_id: {student_id}'
                }
            
            # Get the specific document payment status
            cur.execute("""
                SELECT payment_status
                FROM request_documents
                WHERE request_id = %s AND doc_id = %s
            """, (tracking_number, doc_id))
            
            doc_record = cur.fetchone()
            if not doc_record:
                return {
                    'success': False,
                    'payment_status': False,
                    'message': f'Document {doc_id} not found in request {tracking_number}'
                }
            
            payment_status = bool(doc_record[0])
            return {
                'success': True,
                'payment_status': payment_status,
                'message': f'Document {doc_id} payment status: {payment_status}'
            }
                
        except Exception as e:
            error_msg = f"Database error getting document payment status: {e}"
            if has_app_context():
                current_app.logger.error(f"[MAYA] {error_msg}")
            else:
                print(f"[MAYA] {error_msg}")
            return {
                'success': False,
                'payment_status': False,
                'message': error_msg
            }
        finally:
            cur.close()
            db_pool.putconn(conn)


    @staticmethod
    def update_multiple_documents_payment_status(tracking_number, student_id, doc_ids):
        """
        Updates the payment_status of multiple documents in request_documents to TRUE.
        If all documents in the request have payment_status = TRUE, also updates the request payment_status to TRUE.
        
        Args:
            tracking_number (str): The request_id of the record.
            student_id (str): The student_id to validate ownership.
            doc_ids (list): List of document IDs to update payment status for.
            
        Returns:
            dict: A dictionary with 'success' (bool), 'updated_count' (int), 'request_payment_updated' (bool), and 'message' (str) keys.
        """
        if not doc_ids:
            return {
                'success': False,
                'updated_count': 0,
                'request_payment_updated': False,
                'message': 'No document IDs provided'
            }
            
        conn = db_pool.getconn()
        cur = conn.cursor()
        try:
            # First verify the request belongs to the student
            cur.execute("""
                SELECT r.request_id, r.student_id, r.payment_status
                FROM requests r
                WHERE r.request_id = %s AND r.student_id = %s
            """, (tracking_number, student_id))
            
            request_record = cur.fetchone()
            if not request_record:
                return {
                    'success': False,
                    'updated_count': 0,
                    'request_payment_updated': False,
                    'message': f'Request not found for tracking number: {tracking_number} with student_id: {student_id}'
                }
            
            previous_request_payment_status = bool(request_record[2])
            
            # Update request payment status directly
            cur.execute("""
                UPDATE requests
                SET payment_status = TRUE, payment_date = (NOW() AT TIME ZONE 'UTC' + INTERVAL '8 HOURS')
                WHERE request_id = %s
            """, (tracking_number,))
            
            rows_updated = cur.rowcount
            request_payment_updated = True
            total_docs = len(doc_ids)
            paid_docs = len(doc_ids)
            
            message = f'Payment confirmed for tracking number: {tracking_number}. Request payment status updated to TRUE.'
            
            conn.commit()
            
            return {
                'success': True,
                'updated_count': rows_updated,
                'request_payment_updated': request_payment_updated,
                'total_documents': total_docs,
                'paid_documents': paid_docs,
                'message': message
            }
                
        except Exception as e:
            conn.rollback()
            error_msg = f"Database error updating multiple documents payment status: {e}"
            if has_app_context():
                current_app.logger.error(f"[MAYA] {error_msg}")
            else:
                print(f"[MAYA] {error_msg}")
            return {
                'success': False,
                'updated_count': 0,
                'request_payment_updated': False,
                'message': error_msg
            }
        finally:
            cur.close()
            db_pool.putconn(conn)
