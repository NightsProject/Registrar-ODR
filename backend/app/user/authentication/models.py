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
                "SELECT full_name, contact_number, liability_status, college_code FROM students WHERE student_id = %s",
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
                    "phone_number": None,
                    "college_code": None
                }

            full_name, contact_number, liability_status, college_code = row
            return {
                "exists": True,
                "full_name": full_name,
                "has_liability": liability_status,
                "phone_number": contact_number,
                "college_code": college_code
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
    def check_student_name_exists(firstname, lastname, skip_liability_check=False):
        """
        Verify if the student exists by matching firstname + lastname (case-insensitive).
        Returns a dict with:
            exists: True/False
            has_liability: True/False (skipped if skip_liability_check=True)
            phone_number: str or None
            student_id: str or None
            full_name: str or None
        """
        try:
            conn = get_connection()
            cur = conn.cursor()

            # Case-insensitive search using LOWER() function

            cur.execute(
                "SELECT student_id, contact_number, liability_status, firstname, lastname, college_code FROM students WHERE LOWER(firstname) = LOWER(%s) AND LOWER(lastname) = LOWER(%s)",
                (firstname, lastname)
            )
            row = cur.fetchone()

            cur.close()
            conn.close()

            if not row:
                return {
                    "exists": False,
                    "has_liability": False,
                    "phone_number": None,
                    "student_id": None,
                    "full_name": None,
                    "college_code": None
                }

            student_id, contact_number, liability_status, db_firstname, db_lastname, college_code = row
            full_name = f"{db_firstname} {db_lastname}"
            
            # Skip liability check for outsider users
            has_liability = False if skip_liability_check else liability_status
            
            return {
                "exists": True,
                "has_liability": has_liability,
                "phone_number": contact_number,
                "student_id": student_id,
                "full_name": full_name,
                "college_code": college_code
            }

        except Exception as e:
            print(f"Database error while verifying student name: {e}")
            return {
                "exists": False,
                "has_liability": False,
                "phone_number": None,
                "student_id": None,
                "full_name": None
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
    def save_otp(student_id, otp_hash, has_liability, session):
        """
        Save OTP hash to session (temporary) or database later.
        """
        session["otp"] = otp_hash
        session["student_id"] = student_id
        session["has_liability"] = has_liability

    @staticmethod
    def verify_otp(otp_input, session):
        entered_hash = hashlib.sha256(str(otp_input).encode()).hexdigest()
        stored_hash = session.get("otp")

        if not stored_hash or entered_hash != stored_hash:
            return {
                "verified": False,
                "has_liability": False
            }

        return {
            "verified": True,
            "has_liability": session.get("has_liability", False),
            "student_id": session.get("student_id")
        }

    

    @staticmethod
    def store_authletter(request_id, firstname, lastname, file_url, number, requester_name):
        """
        Insert or update the authorization letter record in the DB using request_id as primary key.
        """
        try:
            conn = db_pool.getconn()
            cur = conn.cursor()

            # Upsert: if already exists, replace URL
            cur.execute("""
                INSERT INTO auth_letters (id, firstname, lastname, file_url, number, requester_name)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id)
                DO UPDATE SET file_url = EXCLUDED.file_url
            """, (request_id, firstname, lastname, file_url, number, requester_name))

            conn.commit()
            cur.close()
            db_pool.putconn(conn)
            return True, "Authorization letter uploaded successfully."

        except Exception as e:
            print(f"DB error storing auth letter: {e}")
            return False, "Database error storing authorization letter."

