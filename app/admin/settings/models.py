from flask import g
from app import db_pool
import json

class OpenRequestRestriction:
    @staticmethod
    def get_settings():
        """Fetch current settings."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("SELECT start_time, end_time, available_days FROM open_request_restriction WHERE id = 1")
            row = cur.fetchone()
            if row:
                return {
                    "start_time": str(row[0]),
                    "end_time": str(row[1]),
                    "available_days": row[2]
                }
            return None
        finally:
            cur.close()

    @staticmethod
    def update_settings(start_time, end_time, available_days):
        """Update settings."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO open_request_restriction (id, start_time, end_time, available_days)
                VALUES (1, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    start_time = EXCLUDED.start_time,
                    end_time = EXCLUDED.end_time,
                    available_days = EXCLUDED.available_days
            """, (start_time, end_time, json.dumps(available_days)))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            print(f"Error updating settings: {e}")
            return False
        finally:
            cur.close()

class Admin:
    @staticmethod
    def get_all():
        """Fetch all admins."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("SELECT email, role FROM admins ORDER BY email")
            admins = cur.fetchall()
            return [{"email": admin[0], "role": admin[1]} for admin in admins]
        finally:
            cur.close()

    @staticmethod
    def add(email, role):
        """Add a new admin."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("INSERT INTO admins (email, role) VALUES (%s, %s)", (email, role))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            print(f"Error adding admin: {e}")
            return False
        finally:
            cur.close()

    @staticmethod
    def update(email, role):
        """Update an admin's role."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("UPDATE admins SET role = %s WHERE email = %s", (role, email))
            conn.commit()
            return cur.rowcount > 0
        finally:
            cur.close()

    @staticmethod
    def delete(email):
        """Delete an admin."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("DELETE FROM admins WHERE email = %s", (email,))
            conn.commit()
            return cur.rowcount > 0
        finally:
            cur.close()

    @staticmethod
    def get_by_email(email):
        """Fetch an admin by email."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("SELECT email, role FROM admins WHERE email = %s", (email,))
            admin = cur.fetchone()
            if admin:
                return {"email": admin[0], "role": admin[1]}
            return None
        finally:
            cur.close()
