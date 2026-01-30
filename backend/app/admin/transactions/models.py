from flask import current_app
from app import db_pool


class TransactionsModel:
  @staticmethod
  def get_transactions(page=1, limit=20, start_date=None, end_date=None, search=None, sort='desc'):
    conn = db_pool.getconn()
    cur = conn.cursor()
    try:
      base_query = """
        SELECT 
            r.request_id, 
            r.student_id, 
            r.full_name, 
            r.total_cost, 
            r.payment_status, 
            r.payment_date, 
            r.admin_fee_amount,
            (SELECT MAX(payment_date) FROM request_documents WHERE request_id = r.request_id AND payment_status = TRUE) as latest_doc_date,
            (SELECT SUM(d.cost * rd.quantity) 
             FROM request_documents rd 
             JOIN documents d ON rd.doc_id = d.doc_id 
             WHERE rd.request_id = r.request_id AND rd.payment_status = TRUE) as paid_docs_cost
        FROM requests r
        WHERE TRUE
      """

      params = []
      if start_date:
        base_query += " AND r.requested_at >= %s"
        params.append(start_date)
      if end_date:
        base_query += " AND r.requested_at <= %s"
        params.append(end_date)
      
      # Include partial payments: either fully paid or has paid documents
      base_query += " AND (r.payment_status = TRUE OR EXISTS (SELECT 1 FROM request_documents rd WHERE rd.request_id = r.request_id AND rd.payment_status = TRUE))"

      if search:
        # Search by request id, student id or full_name
        base_query += " AND (CAST(r.request_id AS TEXT) ILIKE %s OR r.student_id ILIKE %s OR r.full_name ILIKE %s)"
        search_term = f"%{search}%"
        params.extend([search_term, search_term, search_term])

      sort_order = 'DESC' if sort == 'desc' else 'ASC'
      count_query = f"SELECT COUNT(*) FROM ({base_query}) as q"
      cur.execute(count_query, tuple(params))
      total = cur.fetchone()[0]

      total_pages = (total + limit - 1) // limit if limit > 0 else 1

      offset = (page - 1) * limit
      paginated_query = f"{base_query} ORDER BY r.requested_at {sort_order} LIMIT %s OFFSET %s"
      params.extend([limit, offset])
      cur.execute(paginated_query, tuple(params))
      rows = cur.fetchall()

      results = []
      for row in rows:
        # Determine payment date: if main status is true, use main date, else use latest doc date
        payment_date = row[5]
        latest_doc_date = row[7]
        final_payment_date = payment_date if row[4] else latest_doc_date
        
        # Calculate amount paid
        paid_docs_cost = float(row[8]) if row[8] else 0.0
        admin_fee = float(row[6]) if row[6] else 0.0
        total_paid = paid_docs_cost + admin_fee

        results.append({
          'transaction_id': row[0],
          'request_id': row[0],
          'student_id': row[1],
          'full_name': row[2],
          'amount': total_paid,
          'paid': bool(row[4]),
          'payment_date': final_payment_date.isoformat() if final_payment_date else None,
          'admin_fee': admin_fee,
          'is_partial': not bool(row[4])
        })

      return {
        'transactions': results,
        'total': total,
        'total_pages': total_pages
      }
    except Exception as e:
      current_app.logger.error(f"Error fetching transactions: {e}")
      return {
        'transactions': [],
        'total': 0,
        'error': str(e)
      }
    finally:
      cur.close()
      db_pool.putconn(conn)

  @staticmethod
  def get_summary_stats(start_date=None, end_date=None, search=None):
    conn = db_pool.getconn()
    cur = conn.cursor()
    try:
      base_query = """
        FROM requests r
        WHERE TRUE
      """
      params = []
      
      if start_date:
        base_query += " AND r.requested_at >= %s"
        params.append(start_date)
      if end_date:
        base_query += " AND r.requested_at <= %s"
        params.append(end_date)
      if search:
        base_query += " AND (CAST(r.request_id AS TEXT) ILIKE %s OR r.student_id ILIKE %s OR r.full_name ILIKE %s)"
        search_term = f"%{search}%"
        params.extend([search_term, search_term, search_term])

      # Total Amount (Paid only - Full + Partial)
      query_paid = f"""
        SELECT COALESCE(SUM(
            (SELECT COALESCE(SUM(d.cost * rd.quantity), 0) 
             FROM request_documents rd 
             JOIN documents d ON rd.doc_id = d.doc_id 
             WHERE rd.request_id = r.request_id AND rd.payment_status = TRUE)
            + COALESCE(r.admin_fee_amount, 0)
        ), 0)
        {base_query} 
        AND (r.payment_status = TRUE OR EXISTS (SELECT 1 FROM request_documents rd WHERE rd.request_id = r.request_id AND rd.payment_status = TRUE))
      """
      cur.execute(query_paid, tuple(params))
      total_amount = cur.fetchone()[0]

      # Total Transactions (Count of all matching filters)
      query_count = f"SELECT COUNT(*) {base_query}"
      cur.execute(query_count, tuple(params))
      total_count = cur.fetchone()[0]

      # Total Paid Requests (Full + Partial)
      query_paid_count = f"""
        SELECT COUNT(*) {base_query} 
        AND (r.payment_status = TRUE OR EXISTS (SELECT 1 FROM request_documents rd WHERE rd.request_id = r.request_id AND rd.payment_status = TRUE))
      """
      cur.execute(query_paid_count, tuple(params))
      total_paid = cur.fetchone()[0]

      return {
        'total_amount_completed': float(total_amount),
        'total_transactions': total_count,
        'total_paid': total_paid
      }
    finally:
      cur.close()
      db_pool.putconn(conn)