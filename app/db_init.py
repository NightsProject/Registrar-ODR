import psycopg2
from psycopg2 import sql, extras
from config import DB_NAME, DB_USERNAME, DB_PASSWORD, DB_HOST, DB_PORT
from dotenv import load_dotenv
import datetime




def create_database():
   """Connects to the default 'postgres' DB and creates DB_NAME if it doesn't exist."""
   load_dotenv('.env')
   conn = psycopg2.connect(
       dbname=DB_NAME,  # connect to default DB first
       user=DB_USERNAME,
       password=DB_PASSWORD,
       host=DB_HOST,
       port=DB_PORT
   )
   conn.autocommit = True
   cur = conn.cursor()


   cur.execute("SELECT 1 FROM pg_database WHERE datname=%s", (DB_NAME,))
   exists = cur.fetchone()


   if not exists:
       cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(DB_NAME)))
       print(f"Database '{DB_NAME}' created.")
   else:
       print(f"Database '{DB_NAME}' already exists.")


   cur.close()
   conn.close()




def get_connection():
   """Connect to the target database."""
   return psycopg2.connect(
       dbname=DB_NAME,
       user=DB_USERNAME,
       password=DB_PASSWORD,
       host=DB_HOST,
       port=DB_PORT
   )




def execute_query(query, params=None):
   """Helper to execute a single query safely."""
   conn = get_connection()
   cur = conn.cursor()
   try:
       cur.execute(query, params)
       conn.commit()
   except Exception as e:
       print(f"Error executing query: {e}")
   finally:
       cur.close()
       conn.close()




# ==========================
# TABLE INITIALIZERS
# ==========================


#dummy student table
def ready_students_table():
   query = """
   CREATE TABLE IF NOT EXISTS students (
       student_id VARCHAR(20) PRIMARY KEY,
       full_name VARCHAR(100) NOT NULL,
       contact_number VARCHAR(20),
       email VARCHAR(100),
       liability_status BOOLEAN DEFAULT FALSE
   )
   """
   execute_query(query)




def ready_requirements_table():
   query = """
   CREATE TABLE IF NOT EXISTS requirements (
       req_id VARCHAR(10) PRIMARY KEY,
       requirement_name VARCHAR(255) NOT NULL
   )
   """
   execute_query(query)




def ready_documents_table():
   query = """
   CREATE TABLE IF NOT EXISTS documents (
       doc_id VARCHAR(10) PRIMARY KEY,
       doc_name VARCHAR(255) NOT NULL,
       description VARCHAR(255),
       logo_link VARCHAR(255),
       cost NUMERIC(10,2) DEFAULT 0.00 
   )
   """
   execute_query(query)


#mapping table between documents and requirements
def ready_document_requirements_table():
   query = """
   CREATE TABLE IF NOT EXISTS document_requirements (
       doc_id VARCHAR(10) REFERENCES documents(doc_id) ON DELETE CASCADE,
       req_id VARCHAR(10) REFERENCES requirements(req_id) ON DELETE CASCADE,
       PRIMARY KEY (doc_id, req_id)
   )
   """
   execute_query(query)


def ready_requests_table():
   query = """
   CREATE TABLE IF NOT EXISTS requests (
       request_id VARCHAR(15) PRIMARY KEY,
       student_id VARCHAR(20) REFERENCES students(student_id) ON DELETE CASCADE,
       full_name VARCHAR(100),
       contact_number VARCHAR(20),
       email VARCHAR(100),
       preferred_contact VARCHAR(50),
       status VARCHAR(50) DEFAULT 'UNCONFIRMED' CHECK (status IN ('UNCONFIRMED', 'SUBMITTED', 'PENDING', 'IN-PROGRESS', 'DOC-READY', 'RELEASED', 'REJECTED')),
       payment_status BOOLEAN DEFAULT FALSE,
       total_cost NUMERIC(10,2) DEFAULT 0.00,
       requested_at TIMESTAMP DEFAULT NOW(),
       completed_at TIMESTAMP NULL,
       remarks VARCHAR(255)
   )
   """
   execute_query(query)


#mapping table between requests and requested documents for each request and quantity
def ready_request_documents_table():
   query = """
   CREATE TABLE IF NOT EXISTS request_documents (
       request_id VARCHAR(15) REFERENCES requests(request_id) ON DELETE CASCADE,
       doc_id VARCHAR(10) REFERENCES documents(doc_id) ON DELETE CASCADE,
       quantity INTEGER DEFAULT 1,
       PRIMARY KEY (request_id, doc_id)
   )
   """
   execute_query(query)


#mapping table between requests and requirements with uploaded file paths
def ready_request_requirements_links_table():
   query = """
   CREATE TABLE IF NOT EXISTS request_requirements_links (
       request_id VARCHAR(15) REFERENCES requests(request_id) ON DELETE CASCADE,
       requirement_id VARCHAR(10) REFERENCES requirements(req_id) ON DELETE CASCADE,
       file_url VARCHAR(255) NOT NULL,
       uploaded_at TIMESTAMP DEFAULT NOW(),
       PRIMARY KEY (request_id, requirement_id)
   )
   """
   execute_query(query)




# ==========================
# SAMPLE DATA (OPTIONAL)
# ==========================


def insert_sample_data():
   conn = get_connection()
   cur = conn.cursor()
   try:
       # Students
       student_values = [
           ("2025-1011", "Juan Dela Cruz", "09171234567", "juan@example.com", False),
           ("2025-1012", "Maria Clara", "09179876543", "maria@example.com", True),
           ("2025-1013", "Maria Juan", "09179876543", "maria@example.com", True),
           ("2025-1014", "Maria Mendoza", "09179876543", "maria@example.com", True),
           ("2025-1015", "Maria Cruz", "09179876543", "maria@example.com", True),
           ("2025-1017", "Maria Juan", "09179876543", "maria@example.com", False),
           ("2025-1018", "Maria Mendoza", "09179876543", "maria@example.com", False),
           ("2025-1019", "Maria Cruz", "09179876543", "maria@example.com", True)
       ]
       extras.execute_values(
           cur,
           """
           INSERT INTO students (student_id, full_name, contact_number, email, liability_status)
           VALUES %s
           ON CONFLICT (student_id) DO NOTHING
           """,
           student_values
       )


       # Requirements
       req_values = [
           ("REQ0001", "Valid ID"),
           ("REQ0002", "Proof of Address"),
           ("REQ0003", "Recent Photograph")
       ]
       cur.executemany(
           "INSERT INTO requirements (req_id, requirement_name) VALUES (%s, %s) ON CONFLICT DO NOTHING",
           req_values
       )


       # Documents
       doc_values = [
           ("DOC0001", "Certificate of Residency", "Issued by Barangay for proof of residence", "https://example.com/logos/residency.png", 50.00),
           ("DOC0002", "Barangay Clearance", "Clearance certificate for local residents", "https://example.com/logos/clearance.png", 75.00),
           ("DOC0003", "Business Permit", "Required for business registration", "https://example.com/logos/business.png", 100.00)
       ]


       cur.executemany(
           "INSERT INTO documents (doc_id, doc_name, description, logo_link, cost) VALUES (%s, %s, %s, %s, %s) ON CONFLICT DO NOTHING",
           doc_values
       )


       # Document ↔ Requirement mapping
       doc_req_values = [
           ("DOC0001", "REQ0001"),
           ("DOC0001", "REQ0002"),
           ("DOC0002", "REQ0001"),
           ("DOC0003", "REQ0001"),
           ("DOC0003", "REQ0003")
       ]
       cur.executemany(
           "INSERT INTO document_requirements (doc_id, req_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
           doc_req_values
       )


       # Get current timestamp
       now = datetime.datetime.now()

       # Requests
       request_values = [
           ("R0000001", "2025-1011", "Juan Dela Cruz", "09171234567", "juan@example.com", "Email", "SUBMITTED", True, 125.00, now, None, "Request submitted successfully"),
           ("R0000002", "2025-1012", "Maria Clara", "09179876543", "maria@example.com", "SMS", "PENDING", False, 75.00, now, None, "Awaiting payment"),
           ("R0000003", "2025-1013", "Maria Juan", "09179876543", "maria@example.com", "Email", "IN-PROGRESS", True, 150.00, now, None, "Processing documents"),
           ("R0000004", "2025-1014", "Maria Mendoza", "09179876543", "maria@example.com", "SMS", "DOC-READY", True, 100.00, now, None, "Documents ready for pickup"),
           ("R0000005", "2025-1015", "Maria Cruz", "09179876543", "maria@example.com", "Email", "RELEASED", True, 50.00, now, now, "Released to student"),
           ("R0000006", "2025-1017", "Maria Juan", "09179876543", "maria@example.com", "SMS", "REJECTED", False, 0.00, now, None, "Incomplete requirements"),
           ("R0000007", "2025-1018", "Maria Mendoza", "09179876543", "maria@example.com", "Email", "UNCONFIRMED", False, 0.00, now, None, "Awaiting confirmation"),
           ("R0000008", "2025-1019", "Maria Cruz", "09179876543", "maria@example.com", "SMS", "SUBMITTED", True, 200.00, now, None, "Request submitted"),
       ]
       extras.execute_values(
           cur,
           """
           INSERT INTO requests (request_id, student_id, full_name, contact_number, email, preferred_contact, status, payment_status, total_cost, requested_at, completed_at, remarks)
           VALUES %s
           ON CONFLICT (request_id) DO NOTHING
           """,
           request_values
       )

       # Request Documents
       req_doc_values = [
           ("R0000001", "DOC0001", 1),
           ("R0000001", "DOC0002", 2),
           ("R0000002", "DOC0002", 1),
           ("R0000003", "DOC0001", 1),
           ("R0000003", "DOC0003", 1),
           ("R0000004", "DOC0003", 1),
           ("R0000005", "DOC0001", 1),
           ("R0000006", "DOC0002", 1),
           ("R0000007", "DOC0001", 1),
           ("R0000008", "DOC0001", 2),
           ("R0000008", "DOC0002", 1),
           ("R0000008", "DOC0003", 1),
       ]
       cur.executemany(
           "INSERT INTO request_documents (request_id, doc_id, quantity) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
           req_doc_values
       )

       # Request Requirements Links (simulate uploaded files)
       req_req_links_values = [
           ("R0000001", "REQ0001", "uploads/R0000001_REQ0001_valid_id.pdf"),
           ("R0000001", "REQ0002", "uploads/R0000001_REQ0002_proof_address.jpg"),
           ("R0000002", "REQ0001", "uploads/R0000002_REQ0001_valid_id.png"),
           ("R0000003", "REQ0001", "uploads/R0000003_REQ0001_valid_id.pdf"),
           ("R0000003", "REQ0002", "uploads/R0000003_REQ0002_proof_address.jpg"),
           ("R0000003", "REQ0003", "uploads/R0000003_REQ0003_photo.jpg"),
           ("R0000004", "REQ0001", "uploads/R0000004_REQ0001_valid_id.pdf"),
           ("R0000004", "REQ0003", "uploads/R0000004_REQ0003_photo.png"),
           ("R0000005", "REQ0001", "uploads/R0000005_REQ0001_valid_id.pdf"),
           ("R0000005", "REQ0002", "uploads/R0000005_REQ0002_proof_address.jpg"),
           ("R0000008", "REQ0001", "uploads/R0000008_REQ0001_valid_id.pdf"),
           ("R0000008", "REQ0002", "uploads/R0000008_REQ0002_proof_address.jpg"),
           ("R0000008", "REQ0003", "uploads/R0000008_REQ0003_photo.jpg"),
       ]
       cur.executemany(
           "INSERT INTO request_requirements_links (request_id, requirement_id, file_path) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
           req_req_links_values
       )

       conn.commit()
       print("Sample data inserted successfully.")
   except Exception as e:
       print(f"Error inserting sample data: {e}")
   finally:
       cur.close()
       conn.close()




# ==========================
# INITIALIZE EVERYTHING
# ==========================


def initialize_db():
   create_database()
   ready_students_table()
   ready_requirements_table()
   ready_documents_table()
   ready_document_requirements_table()
   ready_requests_table()
   ready_request_documents_table()
   ready_request_requirements_links_table()
   insert_sample_data()
   print("Database and tables initialized successfully.")




if __name__ == "__main__":
   initialize_db()