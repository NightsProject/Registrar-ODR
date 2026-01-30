from flask import g
from psycopg2 import extras

class DocumentList:
    """Model class for handling document-related database operations."""

    @staticmethod
    def get_all_documents():
        """
        Fetch all available documents with their associated requirement names.
        Returns a list of dictionaries suitable for JSON serialization.
        """
        conn = g.get("db_conn", None)
        if conn is None:
            raise Exception("No active database connection found in Flask 'g' context.")

        try:
            cur = conn.cursor(cursor_factory=extras.RealDictCursor)

            query = """
                        SELECT 
                            d.doc_id,
                            d.doc_name,
                            d.description,
                            d.logo_link,
                            d.cost,
                            d.requires_payment_first,
                            COALESCE(
                                ARRAY_AGG(r.requirement_name ORDER BY r.requirement_name) 
                                FILTER (WHERE r.requirement_name IS NOT NULL),
                                '{}'
                            ) AS requirements
                        FROM documents d
                        LEFT JOIN document_requirements dr ON d.doc_id = dr.doc_id
                        LEFT JOIN requirements r ON dr.req_id = r.req_id
                        WHERE d.hidden = FALSE
                        GROUP BY d.doc_id, d.doc_name, d.description, d.logo_link, d.cost, d.requires_payment_first
                        ORDER BY d.doc_id;
                    """
            cur.execute(query)
            result = cur.fetchall()
            
            documents = [dict(row) for row in result]
            return documents if documents else []
        except Exception as e:
            print(f"Error fetching documents: {e}")
            return []
        finally:
            cur.close()

#example to return 
# [
#   {
#     "doc_id": "DOC0001",
#     "doc_name": "Certificate of Residency",
#     "description": "Issued by Barangay for proof of residence",
#     "logo_link": "https://example.com/logos/residency.png",
#     "requirements": ["Valid ID", "Proof of Address"]
#   },
#   {
#     "doc_id": "DOC0002",
#     "doc_name": "Barangay Clearance",
#     "description": "Clearance certificate for local residents",
#     "logo_link": "https://example.com/logos/clearance.png",
#     "requirements": ["Valid ID"]
#   },
#   {
#     "doc_id": "DOC0003",
#     "doc_name": "Business Permit",
#     "description": "Required for business registration",
#     "logo_link": "https://example.com/logos/business.png",
#     "requirements": ["Valid ID", "Recent Photograph"]
#   }
# ]
