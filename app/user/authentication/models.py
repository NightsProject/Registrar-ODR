import hashlib
import random
import requests
from ...db_init import get_connection
from app import db_pool


class AuthenticationUser:
    @staticmethod
    def check_student_in_school_system(student_id):
        """
        Checks the local 'students' table to confirm existence and liabilities.
        """
        try:
            conn = get_connection()
            cur = conn.cursor()
            cur.execute(
                "SELECT full_name, contact_number, liability_status FROM students WHERE student_id = %s",
                (student_id,)
            )
            row = cur.fetchone()
            cur.close()
            conn.close()

            if not row:
                return {
                    "exists": False,
                    "full_name": None,
                    "has_liability": False,
                    "phone_number": None
                }

            full_name, contact_number, liability_status = row
            return {
                "exists": True,
                "full_name": full_name,
                "has_liability": liability_status,
                "phone_number": contact_number
            }

        except Exception as e:
            print(f"Database error while checking student: {e}")
            return {
                "exists": False,
                "full_name": None,
                "has_liability": False,
                "phone_number": None
            }

    @staticmethod
    def check_student_name_exists(firstname, lastname):
        """
        Verify if the student exists by matching firstname + lastname.
        Returns a dict with:
            exists: True/False
            has_liability: True/False
            phone_number: str or None
        """
        try:
            conn = get_connection()
            cur = conn.cursor()

            cur.execute(
                "SELECT contact_number, liability_status FROM students WHERE firstname = %s AND lastname = %s",
                (firstname, lastname)
            )
            row = cur.fetchone()

            cur.close()
            conn.close()

            if not row:
                return {
                    "exists": False,
                    "has_liability": False,
                    "phone_number": None
                }

            contact_number, liability_status = row
            return {
                "exists": True,
                "has_liability": liability_status,
                "phone_number": contact_number
            }

        except Exception as e:
            print(f"Database error while verifying student name: {e}")
            return {
                "exists": False,
                "has_liability": False,
                "phone_number": None
            }

    @staticmethod
    def generate_otp():
        """
        Generate a random 6-digit OTP and return both plain and hash.
        """
        otp = random.randint(100000, 999999)
        otp_hash = hashlib.sha256(str(otp).encode()).hexdigest()
        return otp, otp_hash

    @staticmethod
    def save_otp(student_id, otp_hash, session):
        """
        Save OTP hash to session (temporary) or database later.
        """
        session["otp"] = otp_hash
        session["student_id"] = student_id

    @staticmethod
    def verify_otp(otp_input, session):
        """
        Compare entered OTP hash with stored hash.
        """
        entered_hash = hashlib.sha256(str(otp_input).encode()).hexdigest()
        stored_hash = session.get("otp")

        if not stored_hash:
            return False

        return entered_hash == stored_hash
    
    @staticmethod
    def store_authletter(firstname, lastname, file_url, number):
        """
        Insert or update the authorization letter record in the DB.
        """
        try:
            conn = db_pool.getconn()
            cur = conn.cursor()

            # Upsert: if already exists, replace URL
            cur.execute("""
                INSERT INTO auth_letters (firstname, lastname, file_url, number)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (id)
                DO UPDATE SET file_url = EXCLUDED.file_url
            """, (firstname, lastname, file_url, number))

            conn.commit()
            cur.close()
            db_pool.putconn(conn)
            return True, "Authorization letter uploaded successfully."

        except Exception as e:
            print(f"DB error storing auth letter: {e}")
            return False, "Database error storing authorization letter."

