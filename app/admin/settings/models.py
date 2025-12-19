
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
            cur.execute("SELECT start_time, end_time, available_days, announcement FROM open_request_restriction WHERE id = 1")
            row = cur.fetchone()
            if row:
                # Handle available_days properly - it's stored as JSONB but may need parsing
                available_days = row[2]
                if isinstance(available_days, str):
                    try:
                        available_days = json.loads(available_days)
                    except (json.JSONDecodeError, TypeError):
                        # Fallback to default if parsing fails
                        available_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
                
                return {
                    "start_time": str(row[0]),
                    "end_time": str(row[1]),
                    "available_days": available_days,
                    "announcement": row[3] or ""
                }
            return None
        except Exception as e:
            print(f"Error fetching restriction settings: {e}")
            return None
        finally:
            cur.close()


    @staticmethod
    def update_settings(start_time, end_time, available_days, announcement=""):
        """Update settings."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO open_request_restriction (id, start_time, end_time, available_days, announcement)
                VALUES (1, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    start_time = EXCLUDED.start_time,
                    end_time = EXCLUDED.end_time,
                    available_days = EXCLUDED.available_days,
                    announcement = EXCLUDED.announcement
            """, (start_time, end_time, json.dumps(available_days), announcement))
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
            cur.execute("SELECT email, role, profile_picture FROM admins ORDER BY email")
            admins = cur.fetchall()
            return [{"email": admin[0], "role": admin[1], "profile_picture": admin[2]} for admin in admins]
        finally:
            cur.close()


    @staticmethod
    def add(email, role, profile_picture=None):
        """Add a new admin."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("INSERT INTO admins (email, role, profile_picture) VALUES (%s, %s, %s)", (email, role, profile_picture))
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
        """Update an admin's role"""
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
            cur.execute("SELECT email, role, profile_picture FROM admins WHERE email = %s", (email,))
            admin = cur.fetchone()
            if admin:
                return {"email": admin[0], "role": admin[1], "profile_picture": admin[2]}
            return None
        finally:
            cur.close()


class Fee:
    @staticmethod
    def get_value(key):
        """Fetch fee value by key."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("SELECT value FROM fee WHERE key = %s", (key,))
            row = cur.fetchone()
            return row[0] if row else 0.0
        finally:
            cur.close()

    @staticmethod
    def update_value(key, value):
        """Update fee value."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO fee (key, value) VALUES (%s, %s)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
            """, (key, value))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            print(f"Error updating fee: {e}")
            return False
        finally:
            cur.close()

class AvailableDates:
    @staticmethod
    def get_all():
        """Fetch all date availability settings."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT id, date, is_available, reason, created_at, updated_at 
                FROM available_dates 
                ORDER BY date DESC
            """)
            rows = cur.fetchall()
            
            date_settings = []
            for row in rows:
                date_settings.append({
                    "id": row[0],
                    "date": row[1].strftime("%Y-%m-%d") if row[1] else None,
                    "is_available": bool(row[2]),
                    "reason": row[3] or "",
                    "created_at": row[4].strftime("%Y-%m-%d %H:%M:%S") if row[4] else "",
                    "updated_at": row[5].strftime("%Y-%m-%d %H:%M:%S") if row[5] else ""
                })
            return date_settings
        except Exception as e:
            print(f"Error fetching available dates: {e}")
            return []
        finally:
            cur.close()

    @staticmethod
    def get_by_date(date_str):
        """Fetch availability for a specific date."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT id, date, is_available, reason, created_at, updated_at 
                FROM available_dates 
                WHERE date = %s
            """, (date_str,))
            row = cur.fetchone()
            
            if row:
                return {
                    "id": row[0],
                    "date": row[1].strftime("%Y-%m-%d") if row[1] else None,
                    "is_available": bool(row[2]),
                    "reason": row[3] or "",
                    "created_at": row[4].strftime("%Y-%m-%d %H:%M:%S") if row[4] else "",
                    "updated_at": row[5].strftime("%Y-%m-%d %H:%M:%S") if row[5] else ""
                }
            return None
        except Exception as e:
            print(f"Error fetching available date for {date_str}: {e}")
            return None
        finally:
            cur.close()

    @staticmethod
    def create_or_update(date_str, is_available, reason=""):
        """Create or update availability for a specific date."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO available_dates (date, is_available, reason)
                VALUES (%s, %s, %s)
                ON CONFLICT (date) DO UPDATE SET
                    is_available = EXCLUDED.is_available,
                    reason = EXCLUDED.reason,
                    updated_at = CURRENT_TIMESTAMP
            """, (date_str, is_available, reason))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            print(f"Error creating/updating available date for {date_str}: {e}")
            return False
        finally:
            cur.close()

    @staticmethod
    def delete(date_str):
        """Delete availability setting for a specific date."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("DELETE FROM available_dates WHERE date = %s", (date_str,))
            conn.commit()
            return cur.rowcount > 0
        except Exception as e:
            conn.rollback()
            print(f"Error deleting available date for {date_str}: {e}")
            return False
        finally:
            cur.close()

    @staticmethod
    def bulk_update(date_list, is_available, reason=""):
        """Bulk update availability for multiple dates."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            for date_str in date_list:
                cur.execute("""
                    INSERT INTO available_dates (date, is_available, reason)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (date) DO UPDATE SET
                        is_available = EXCLUDED.is_available,
                        reason = EXCLUDED.reason,
                        updated_at = CURRENT_TIMESTAMP
                """, (date_str, is_available, reason))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            print(f"Error bulk updating available dates: {e}")
            return False
        finally:
            cur.close()

    @staticmethod
    def is_date_available(date_str):
        """Check if a specific date is available for requests."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT is_available FROM available_dates WHERE date = %s
            """, (date_str,))
            row = cur.fetchone()
            
            if row:
                return bool(row[0])
            return None  # No specific setting found
        except Exception as e:
            print(f"Error checking availability for date {date_str}: {e}")
            return None
        finally:
            cur.close()

    @staticmethod
    def get_upcoming_restrictions(days_ahead=30):
        """Get upcoming date restrictions for the next specified days."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT date, is_available, reason
                FROM available_dates 
                WHERE date >= CURRENT_DATE 
                AND date <= CURRENT_DATE + INTERVAL '%s days'
                ORDER BY date
            """, (days_ahead,))
            rows = cur.fetchall()
            
            restrictions = []
            for row in rows:
                restrictions.append({
                    "date": row[0].strftime("%Y-%m-%d") if row[0] else None,
                    "is_available": bool(row[1]),
                    "reason": row[2] or ""
                })

            return restrictions
        except Exception as e:
            print(f"Error fetching upcoming restrictions: {e}")
            return []
        finally:
            cur.close()

class DomainWhitelist:
    @staticmethod
    def get_all():
        """Fetch all domains from whitelist."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("SELECT id, domain, description, is_active, created_at, updated_at FROM domain_whitelist ORDER BY domain")
            rows = cur.fetchall()
            domains = []
            for row in rows:
                domains.append({
                    "id": row[0],
                    "domain": row[1],
                    "description": row[2] or "",
                    "is_active": bool(row[3]),
                    "created_at": row[4].strftime("%Y-%m-%d %H:%M:%S") if row[4] else "",
                    "updated_at": row[5].strftime("%Y-%m-%d %H:%M:%S") if row[5] else ""
                })
            return domains
        except Exception as e:
            print(f"Error fetching domain whitelist: {e}")
            return []
        finally:
            cur.close()

    @staticmethod
    def get_by_id(domain_id):
        """Fetch a domain by ID."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("SELECT id, domain, description, is_active, created_at, updated_at FROM domain_whitelist WHERE id = %s", (domain_id,))
            row = cur.fetchone()
            if row:
                return {
                    "id": row[0],
                    "domain": row[1],
                    "description": row[2] or "",
                    "is_active": bool(row[3]),
                    "created_at": row[4].strftime("%Y-%m-%d %H:%M:%S") if row[4] else "",
                    "updated_at": row[5].strftime("%Y-%m-%d %H:%M:%S") if row[5] else ""
                }
            return None
        except Exception as e:
            print(f"Error fetching domain by ID {domain_id}: {e}")
            return None
        finally:
            cur.close()

    @staticmethod
    def get_by_domain(domain):
        """Fetch a domain by domain string."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("SELECT id, domain, description, is_active, created_at, updated_at FROM domain_whitelist WHERE domain = %s", (domain,))
            row = cur.fetchone()
            if row:
                return {
                    "id": row[0],
                    "domain": row[1],
                    "description": row[2] or "",
                    "is_active": bool(row[3]),
                    "created_at": row[4].strftime("%Y-%m-%d %H:%M:%S") if row[4] else "",
                    "updated_at": row[5].strftime("%Y-%m-%d %H:%M:%S") if row[5] else ""
                }
            return None
        except Exception as e:
            print(f"Error fetching domain {domain}: {e}")
            return None
        finally:
            cur.close()

    @staticmethod
    def add(domain, description="", is_active=True):
        """Add a new domain to whitelist."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute(
                "INSERT INTO domain_whitelist (domain, description, is_active) VALUES (%s, %s, %s)",
                (domain, description, is_active)
            )
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            print(f"Error adding domain {domain}: {e}")
            return False
        finally:
            cur.close()

    @staticmethod
    def update(domain_id, domain=None, description=None, is_active=None):
        """Update an existing domain."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            # Build dynamic update query
            updates = []
            params = []
            
            if domain is not None:
                updates.append("domain = %s")
                params.append(domain)
            
            if description is not None:
                updates.append("description = %s")
                params.append(description)
                
            if is_active is not None:
                updates.append("is_active = %s")
                params.append(is_active)
            
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(domain_id)
            
            if not updates:
                return True  # Nothing to update
                
            query = f"UPDATE domain_whitelist SET {', '.join(updates)} WHERE id = %s"
            cur.execute(query, params)
            conn.commit()
            return cur.rowcount > 0
        except Exception as e:
            conn.rollback()
            print(f"Error updating domain {domain_id}: {e}")
            return False
        finally:
            cur.close()

    @staticmethod
    def delete(domain_id):
        """Delete a domain from whitelist."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("DELETE FROM domain_whitelist WHERE id = %s", (domain_id,))
            conn.commit()
            return cur.rowcount > 0
        except Exception as e:
            conn.rollback()
            print(f"Error deleting domain {domain_id}: {e}")
            return False
        finally:
            cur.close()

    @staticmethod
    def is_domain_allowed(domain):
        """Check if a domain is allowed for authentication."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute(
                "SELECT is_active FROM domain_whitelist WHERE domain = %s AND is_active = TRUE",
                (domain,)
            )
            row = cur.fetchone()
            return row is not None
        except Exception as e:
            print(f"Error checking domain {domain}: {e}")
            return False
        finally:
            cur.close()

    @staticmethod
    def get_active_domains():
        """Get all active domains for dropdown/selection purposes."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            cur.execute("SELECT domain FROM domain_whitelist WHERE is_active = TRUE ORDER BY domain")
            rows = cur.fetchall()
            return [row[0] for row in rows]
        except Exception as e:
            print(f"Error fetching active domains: {e}")
            return []
        finally:
            cur.close()

    @staticmethod
    def toggle_active_status(domain_id):
        """Toggle the active status of a domain."""
        conn = g.db_conn
        cur = conn.cursor()
        try:
            # Get current status
            cur.execute("SELECT is_active FROM domain_whitelist WHERE id = %s", (domain_id,))
            row = cur.fetchone()
            if not row:
                return False
            
            new_status = not row[0]
            cur.execute(
                "UPDATE domain_whitelist SET is_active = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (new_status, domain_id)
            )
            conn.commit()
            return cur.rowcount > 0
        except Exception as e:
            conn.rollback()
            print(f"Error toggling domain status {domain_id}: {e}")
            return False
        finally:
            cur.close()
