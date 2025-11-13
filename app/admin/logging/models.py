from flask import g
from app import db_pool

class LoggingModel:
    @staticmethod
    def get_all_logs():
        """Fetch all logs with their details."""
        conn = db_pool.getconn()
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT log_id, admin_id, action, details, timestamp
                FROM logs
                ORDER BY timestamp DESC
            """)
            logs = cur.fetchall()
            return [
                {
                    "log_id": log[0],
                    "admin_id": log[1],
                    "action": log[2],
                    "details": log[3],
                    "timestamp": log[4].strftime("%Y-%m-%d %H:%M:%S") if log[4] else None
                }
                for log in logs
            ]
        finally:
            cur.close()
            db_pool.putconn(conn)
