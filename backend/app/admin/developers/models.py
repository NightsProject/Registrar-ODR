
from flask import g
from app import db_pool
import json
import psycopg2
from psycopg2 import extras


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
        """Update test mode setting with automatic transfer or cleanup."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            # Get current test mode state
            cur.execute("SELECT test_mode FROM open_request_restriction WHERE id = 1")
            current_state = cur.fetchone()
            old_test_mode = bool(current_state[0]) if current_state else False
            
            # Update test mode setting
            cur.execute("""
                UPDATE open_request_restriction
                SET test_mode = %s
                WHERE id = 1;
            """, (test_mode,))
            
            # If turning test mode ON, transfer data from test tables to main tables
            if not old_test_mode and test_mode:
                print("Test mode turned ON - executing transfer operation")
                transfer_result = TestModeSettings.transfer_test_data()
                if not transfer_result:
                    conn.rollback()
                    return False
            
            # If turning test mode OFF, cleanup test-originated records from main tables
            elif old_test_mode and not test_mode:
                print("Test mode turned OFF - executing cleanup operation")
                cleanup_result = TestModeSettings.cleanup_test_origin_data()
                if not cleanup_result:
                    conn.rollback()
                    return False
            
            conn.commit()
            print(f"Test mode updated to {test_mode}")
            return True
        except Exception as e:
            conn.rollback()
            print(f"Error updating test mode: {e}")
            return False
        finally:
            cur.close()

    @staticmethod
    def transfer_test_data():
        """Transfer all data from test tables to main tables."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            # Transfer students from test_students to students
            cur.execute("""
                INSERT INTO students (student_id, full_name, contact_number, email, 
                                    firstname, lastname, college_code, liability_status, is_test_origin)
                SELECT student_id, full_name, contact_number, email, 
                       firstname, lastname, college_code, liability_status, TRUE
                FROM test_students
                ON CONFLICT (student_id) DO UPDATE SET
                    full_name = EXCLUDED.full_name,
                    contact_number = EXCLUDED.contact_number,
                    email = EXCLUDED.email,
                    firstname = EXCLUDED.firstname,
                    lastname = EXCLUDED.lastname,
                    college_code = EXCLUDED.college_code,
                    is_test_origin = TRUE
            """)
            
            # Transfer admins from test_admins to admins
            cur.execute("""
                INSERT INTO admins (email, role, profile_picture, is_test_origin)
                SELECT email, role, profile_picture, TRUE
                FROM test_admins
                ON CONFLICT (email) DO UPDATE SET
                    role = EXCLUDED.role,
                    profile_picture = EXCLUDED.profile_picture,
                    is_test_origin = TRUE
            """)
            
            return True
        except Exception as e:
            print(f"Error transferring test data: {e}")
            return False
        finally:
            cur.close()

    @staticmethod
    def cleanup_test_origin_data():
        """Delete test-originated records from main tables."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            # Delete test-originated students
            cur.execute("DELETE FROM students WHERE is_test_origin = TRUE")
            
            # Delete test-originated admins
            cur.execute("DELETE FROM admins WHERE is_test_origin = TRUE")
        
            return True
        except Exception as e:
            print(f"Error cleaning up test origin data: {e}")
            return False
        finally:
            cur.close()

    @staticmethod
    def validate_student_id_uniqueness(student_id):
        """Check if student ID is unique across students and test_students tables."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            # Check in main students table
            cur.execute("SELECT COUNT(*) FROM students WHERE student_id = %s", (student_id,))
            main_count = cur.fetchone()[0]
            
            # Check in test_students table
            cur.execute("SELECT COUNT(*) FROM test_students WHERE student_id = %s", (student_id,))
            test_count = cur.fetchone()[0]
            
            return (main_count + test_count) == 0
        except Exception as e:
            print(f"Error validating student ID uniqueness: {e}")
            return False
        finally:
            cur.close()

    @staticmethod
    def validate_email_uniqueness(email):
        """Check if email is unique across tables  admins, test_admins)."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            # Check in main admins table
            cur.execute("SELECT COUNT(*) FROM admins WHERE email = %s", (email,))
            admins_count = cur.fetchone()[0]
            
            # Check in test_admins table
            cur.execute("SELECT COUNT(*) FROM test_admins WHERE email = %s", (email,))
            test_admins_count = cur.fetchone()[0]
            
            total_count = admins_count + test_admins_count
            return total_count == 0
        except Exception as e:
            print(f"Error validating email uniqueness: {e}")
            return False
        finally:
            cur.close()


class Feedback:
    @staticmethod
    def create(name, email, feedback_type, description, steps_to_reproduce=None):
        """Create new feedback entry with test mode tracking."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            # Get current test mode state
            test_mode = TestModeSettings.get_test_mode()
            
            cur.execute("""
                INSERT INTO feedback (name, email, feedback_type, description, steps_to_reproduce)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING feedback_id
            """, (name, email, feedback_type, description, steps_to_reproduce))
            feedback_id = cur.fetchone()[0]
            conn.commit()
            print(f"Feedback {feedback_id} created with test_origin = {test_mode}")
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
        """Create student record with dual registration (test + main tables if test mode ON)."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            # Get current test mode state
            test_mode = TestModeSettings.get_test_mode()
            
            # Validate student ID uniqueness across both students and test_students tables
            if not TestModeSettings.validate_student_id_uniqueness(student_data['student_id']):
                raise ValueError("Student ID already exists in students or test_students tables")
    
            # Register in test_students table first
            cur.execute("""
                INSERT INTO test_students (student_id, full_name, contact_number, email, 
                                          firstname, lastname, college_code, liability_status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (student_id) DO UPDATE SET
                    full_name = EXCLUDED.full_name,
                    contact_number = EXCLUDED.contact_number,
                    email = EXCLUDED.email,
                    firstname = EXCLUDED.firstname,
                    lastname = EXCLUDED.lastname,
                    college_code = EXCLUDED.college_code,
                    updated_at = NOW()
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
            
            # If test mode is ON, also register in main students table
            if test_mode:
                cur.execute("""
                    INSERT INTO students (student_id, full_name, contact_number, email, 
                                          firstname, lastname, college_code, liability_status, is_test_origin)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                    ON CONFLICT (student_id) DO UPDATE SET
                        full_name = EXCLUDED.full_name,
                        contact_number = EXCLUDED.contact_number,
                        email = EXCLUDED.email,
                        firstname = EXCLUDED.firstname,
                        lastname = EXCLUDED.lastname,
                        college_code = EXCLUDED.college_code,
                        is_test_origin = TRUE
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
            print(f"Student {student_data['student_id']} registered in {'both' if test_mode else 'test only'} tables")
            return True
        except ValueError as ve:
            conn.rollback()
            raise ve  # Re-raise validation errors
        except Exception as e:
            conn.rollback()
            print(f"Error creating/updating student: {e}")
            return False
        finally:
            cur.close()

    @staticmethod
    def create_admin(admin_data):
        """Create admin record with dual registration (test + main tables if test mode ON)."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            # Get current test mode state
            test_mode = TestModeSettings.get_test_mode()
            
            # Register in test_admins table first
            cur.execute("""
                INSERT INTO test_admins (email, role, profile_picture)
                VALUES (%s, %s, %s)
                ON CONFLICT (email) DO UPDATE SET
                    role = EXCLUDED.role,
                    profile_picture = EXCLUDED.profile_picture,
                    updated_at = NOW()
            """, (admin_data['email'], admin_data['role'], admin_data.get('profile_picture', '')))
            
            # If test mode is ON, also register in main admins table
            if test_mode:
                cur.execute("""
                    INSERT INTO admins (email, role, profile_picture, is_test_origin)
                    VALUES (%s, %s, %s, TRUE)
                    ON CONFLICT (email) DO UPDATE SET
                        role = EXCLUDED.role,
                        profile_picture = EXCLUDED.profile_picture,
                        is_test_origin = TRUE
                """, (admin_data['email'], admin_data['role'], admin_data.get('profile_picture', '')))
            
            conn.commit()
            print(f"Admin {admin_data['email']} registered in {'both' if test_mode else 'test only'} tables")
            return True
        except ValueError as ve:
            conn.rollback()
            raise ve  # Re-raise validation errors
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

    @staticmethod
    def check_student_exists(student_id):
        """Check if student ID already exists."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("SELECT COUNT(*) FROM students WHERE student_id = %s", (student_id,))
            count = cur.fetchone()[0]
            return count > 0
        except Exception as e:
            print(f"Error checking student existence: {e}")
            return False
        finally:
            cur.close()

