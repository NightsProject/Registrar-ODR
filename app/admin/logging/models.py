
from flask import g
from app import db_pool
from psycopg2 import sql
import json

class LoggingModel:
    @staticmethod
    def get_all_logs(filters=None, page=1, per_page=50, sort_by='timestamp', sort_order='desc', search_text=None):
        """
        Fetch logs with advanced filtering, search, and pagination.
        
        Args:
            filters: dict containing filter criteria (admin_id, log_level, category, date_from, date_to, request_id)
            page: page number for pagination
            per_page: number of items per page
            sort_by: column to sort by
            sort_order: 'asc' or 'desc'
            search_text: text to search in action and details
        """
        conn = db_pool.getconn()
        cur = conn.cursor()
        try:
            # Build the base query
            base_query = """
                SELECT log_id, admin_id, action, details, timestamp, request_id, 
                       log_level, category, ip_address, session_id, created_at
                FROM logs
            """
            
            # Build WHERE clause
            where_conditions = []
            params = []
            
            if filters:
                if filters.get('admin_id'):
                    where_conditions.append("admin_id = %s")
                    params.append(filters['admin_id'])
                
                if filters.get('log_level'):
                    where_conditions.append("log_level = %s")
                    params.append(filters['log_level'])
                
                if filters.get('category'):
                    where_conditions.append("category = %s")
                    params.append(filters['category'])
                
                if filters.get('request_id'):
                    where_conditions.append("request_id = %s")
                    params.append(filters['request_id'])
                
                if filters.get('date_from'):
                    where_conditions.append("timestamp >= %s")
                    params.append(filters['date_from'])
                
                if filters.get('date_to'):
                    where_conditions.append("timestamp <= %s")
                    params.append(filters['date_to'])
            
            # Add text search
            if search_text:
                where_conditions.append("""
                    to_tsvector('english', action || ' ' || COALESCE(details, '')) @@ plainto_tsquery('english', %s)
                """)
                params.append(search_text)
            
            # Build the full query
            if where_conditions:
                query = base_query + " WHERE " + " AND ".join(where_conditions)
            else:
                query = base_query
            
            # Add sorting
            valid_sort_columns = {
                'timestamp': 'timestamp',
                'created_at': 'created_at',
                'admin_id': 'admin_id',
                'action': 'action',
                'log_level': 'log_level',
                'category': 'category',
                'request_id': 'request_id'
            }
            
            sort_column = valid_sort_columns.get(sort_by, 'timestamp')
            sort_direction = 'DESC' if sort_order.lower() == 'desc' else 'ASC'
            
            query += f" ORDER BY {sort_column} {sort_direction}"
            
            # Add pagination
            offset = (page - 1) * per_page
            query += " LIMIT %s OFFSET %s"
            params.extend([per_page, offset])
            
            # Execute query
            cur.execute(query, params)
            logs = cur.fetchall()
            
            # Get total count for pagination
            count_query = "SELECT COUNT(*) FROM logs"
            if where_conditions:
                count_query += " WHERE " + " AND ".join(where_conditions)
            
            if search_text and not filters:
                # If only search_text was provided, add it to count query
                count_query += " WHERE to_tsvector('english', action || ' ' || COALESCE(details, '')) @@ plainto_tsquery('english', %s)"
                cur.execute(count_query, [search_text])
            else:
                cur.execute(count_query, params[:-2])  # Remove limit and offset from params
            
            total_count = cur.fetchone()[0]
            
            return {
                "logs": [
                    {
                        "log_id": log[0],
                        "admin_id": log[1],
                        "action": log[2],
                        "details": log[3],
                        "timestamp": log[4].strftime("%Y-%m-%d %H:%M:%S") if log[4] else None,
                        "request_id": log[5],
                        "log_level": log[6],
                        "category": log[7],
                        "ip_address": log[8],
                        "session_id": log[9],
                        "created_at": log[10].strftime("%Y-%m-%d %H:%M:%S") if log[10] else None
                    }
                    for log in logs
                ],
                "total_count": total_count,
                "page": page,
                "per_page": per_page,
                "total_pages": (total_count + per_page - 1) // per_page
            }
        finally:
            cur.close()
            db_pool.putconn(conn)
    
    @staticmethod
    def get_filter_options():
        """Get available filter options for the UI."""
        conn = db_pool.getconn()
        cur = conn.cursor()
        try:
            # Get unique admin_ids
            cur.execute("SELECT DISTINCT admin_id FROM logs ORDER BY admin_id")
            admin_ids = [row[0] for row in cur.fetchall()]
            
            # Get unique log_levels
            cur.execute("SELECT DISTINCT log_level FROM logs ORDER BY log_level")
            log_levels = [row[0] for row in cur.fetchall()]
            
            # Get unique categories
            cur.execute("SELECT DISTINCT category FROM logs ORDER BY category")
            categories = [row[0] for row in cur.fetchall()]
            
            return {
                "admin_ids": admin_ids,
                "log_levels": log_levels,
                "categories": categories
            }
        finally:
            cur.close()
            db_pool.putconn(conn)
    
    @staticmethod
    def create_log(admin_id, action, details=None, request_id=None, log_level='INFO', 
                   category='SYSTEM', ip_address=None, user_agent=None, session_id=None):
        """Create a new log entry."""
        conn = db_pool.getconn()
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO logs (admin_id, action, details, request_id, log_level, 
                                category, ip_address, user_agent, session_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING log_id
            """, (admin_id, action, details, request_id, log_level, category, 
                  ip_address, user_agent, session_id))
            
            log_id = cur.fetchone()[0]
            conn.commit()
            return log_id
        except Exception as e:
            conn.rollback()
            print(f"Error creating log: {e}")
            return None
        finally:
            cur.close()
            db_pool.putconn(conn)
    
    @staticmethod
    def export_logs(filters=None, search_text=None, format='json'):
        """Export logs in specified format."""
        conn = db_pool.getconn()
        cur = conn.cursor()
        try:
            # Get logs data (same logic as get_all_logs but without pagination)
            result = LoggingModel.get_all_logs(
                filters=filters,
                page=1,
                per_page=10000,  # Large number to get all results
                search_text=search_text
            )
            
            logs_data = result['logs']
            
            if format.lower() == 'json':
                return json.dumps(logs_data, indent=2)
            elif format.lower() == 'csv':
                # Simple CSV export
                csv_lines = ['log_id,admin_id,action,details,timestamp,request_id,log_level,category']
                for log in logs_data:
                    row = [
                        str(log['log_id']),
                        log['admin_id'] or '',
                        log['action'] or '',
                        (log['details'] or '').replace(',', ';').replace('\n', ' '),
                        log['timestamp'] or '',
                        log['request_id'] or '',
                        log['log_level'] or '',
                        log['category'] or ''
                    ]
                    csv_lines.append(','.join([f'"{field}"' for field in row]))
                return '\n'.join(csv_lines)
            else:
                raise ValueError("Unsupported format. Use 'json' or 'csv'.")
        finally:
            cur.close()
            db_pool.putconn(conn)
