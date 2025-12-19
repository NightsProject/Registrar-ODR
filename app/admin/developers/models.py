from flask import g
from app import db_pool
import json

class TestModeSettings:
    @staticmethod
    def get_test_mode():
        """Get current test mode setting."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("SELECT test_mode FROM open_request_restriction WHERE id = 1")
            row = cur.fetchone()
            return bool(row[0]) if row else False
        except Exception as e:
            print(f"Error fetching test mode: {e}")
            return False
        finally:
            cur.close()

    @staticmethod
    def update_test_mode(test_mode):
        """Update test mode setting."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                UPDATE open_request_restriction
                SET test_mode = %s
                WHERE id = 1;
            """, (test_mode,))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            print(f"Error updating test mode: {e}")
            return False
        finally:
            cur.close()

class Feedback:
    @staticmethod
    def create(name, email, feedback_type, description, steps_to_reproduce=None):
        """Create new feedback entry."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO feedback (name, email, feedback_type, description, steps_to_reproduce)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING feedback_id
            """, (name, email, feedback_type, description, steps_to_reproduce))
            feedback_id = cur.fetchone()[0]
            conn.commit()
            return feedback_id
        except Exception as e:
            conn.rollback()
            print(f"Error creating feedback: {e}")
            return None
        finally:
            cur.close()

    @staticmethod
    def get_all():
        """Get all feedback entries."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT feedback_id, name, email, feedback_type, description, 
                       steps_to_reproduce, submitted_at, status
                FROM feedback 
                ORDER BY submitted_at DESC
            """)
            rows = cur.fetchall()
            feedback_list = []
            for row in rows:
                feedback_list.append({
                    "feedback_id": row[0],
                    "name": row[1],
                    "email": row[2],
                    "feedback_type": row[3],
                    "description": row[4],
                    "steps_to_reproduce": row[5],
                    "submitted_at": row[6].strftime("%Y-%m-%d %H:%M:%S") if row[6] else "",
                    "status": row[7]
                })
            return feedback_list
        except Exception as e:
            print(f"Error fetching feedback: {e}")
            return []
        finally:
            cur.close()

    @staticmethod
    def update_status(feedback_id, status):
        """Update feedback status."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                UPDATE feedback 
                SET status = %s 
                WHERE feedback_id = %s
            """, (status, feedback_id))
            conn.commit()
            return cur.rowcount > 0
        except Exception as e:
            conn.rollback()
            print(f"Error updating feedback status: {e}")
            return False
        finally:
            cur.close()

    @staticmethod
    def delete(feedback_id):
        """Delete feedback entry."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("DELETE FROM feedback WHERE feedback_id = %s", (feedback_id,))
            conn.commit()
            return cur.rowcount > 0
        except Exception as e:
            conn.rollback()
            print(f"Error deleting feedback: {e}")
            return False
        finally:
            cur.close()

class TestRegistration:
    @staticmethod
    def create_student(student_data):
        """Create or update student record."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO students (student_id, full_name, contact_number, email, 
                                    firstname, lastname, college_code, liability_status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (student_id) DO UPDATE SET
                    full_name = EXCLUDED.full_name,
                    contact_number = EXCLUDED.contact_number,
                    email = EXCLUDED.email,
                    firstname = EXCLUDED.firstname,
                    lastname = EXCLUDED.lastname,
                    college_code = EXCLUDED.college_code
            """, (
                student_data['student_id'],
                student_data['full_name'],
                student_data['contact_number'],
                student_data['email'],
                student_data['firstname'],
                student_data['lastname'],
                student_data['college_code'],
                False  # liability_status default
            ))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            print(f"Error creating/updating student: {e}")
            return False
        finally:
            cur.close()

    @staticmethod
    def create_admin(admin_data):
        """Create or update admin record."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO admins (email, role)
                VALUES (%s, %s)
                ON CONFLICT (email) DO UPDATE SET
                    role = EXCLUDED.role
            """, (admin_data['email'], admin_data['role']))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            print(f"Error creating/updating admin: {e}")
            return False
        finally:
            cur.close()

    @staticmethod
    def get_student(student_id):
        """Get student by ID."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT student_id, full_name, contact_number, email, 
                       firstname, lastname, college_code
                FROM students WHERE student_id = %s
            """, (student_id,))
            row = cur.fetchone()
            if row:
                return {
                    "student_id": row[0],
                    "full_name": row[1],
                    "contact_number": row[2],
                    "email": row[3],
                    "firstname": row[4],
                    "lastname": row[5],
                    "college_code": row[6]
                }
            return None
        except Exception as e:
            print(f"Error fetching student: {e}")
            return None
        finally:
            cur.close()

    @staticmethod
    def get_admin(email):
        """Get admin by email."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("SELECT email, role FROM admins WHERE email = %s", (email,))
            row = cur.fetchone()
            if row:
                return {
                    "email": row[0],
                    "role": row[1]
                }
            return None
        except Exception as e:
            print(f"Error fetching admin: {e}")
            return None
        finally:
            cur.close()

