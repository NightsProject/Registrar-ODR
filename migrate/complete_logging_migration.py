"""
Complete migration script for enhanced logging system.
This script updates the logs table to include all new columns, indexes, and features.
"""

import psycopg2
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import DB_NAME, DB_USERNAME, DB_PASSWORD, DB_HOST, DB_PORT
from dotenv import load_dotenv

def get_connection():
    """Create database connection."""
    load_dotenv()
    return psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USERNAME,
        password=DB_PASSWORD,
        port=DB_PORT
    )

def check_table_exists(cursor):
    """Check if logs table exists."""
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'logs'
        );
    """)
    return cursor.fetchone()[0]

def add_columns_if_not_exist(cursor):
    """Add new columns to logs table if they don't exist."""
    
    # Define new columns to add
    columns_to_add = [
        ("log_level", "VARCHAR(20) DEFAULT 'INFO'"),
        ("ip_address", "VARCHAR(45)"),
        ("user_agent", "TEXT"),
        ("category", "VARCHAR(50) DEFAULT 'SYSTEM'"),
        ("session_id", "VARCHAR(100)"),
        ("created_at", "TIMESTAMP DEFAULT NOW()")
    ]
    
    for column_name, column_definition in columns_to_add:
        try:
            # Check if column exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'logs' 
                    AND column_name = %s
                );
            """, (column_name,))
            
            if not cursor.fetchone()[0]:
                print(f"Adding column: {column_name}")
                cursor.execute(f"ALTER TABLE logs ADD COLUMN {column_name} {column_definition}")
            else:
                print(f"Column {column_name} already exists")
                
        except Exception as e:
            print(f"Error adding column {column_name}: {e}")

def create_indexes(cursor):
    """Create indexes for better query performance."""
    
    indexes = [
        ("idx_logs_log_level", "CREATE INDEX IF NOT EXISTS idx_logs_log_level ON logs(log_level)"),
        ("idx_logs_category", "CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category)"),
        ("idx_logs_created_at", "CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC)"),
        ("idx_logs_session_id", "CREATE INDEX IF NOT EXISTS idx_logs_session_id ON logs(session_id)"),
        ("idx_logs_admin_id", "CREATE INDEX IF NOT EXISTS idx_logs_admin_id ON logs(admin_id)"),
        ("idx_logs_timestamp", "CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC)"),
    ]
    
    # Text search index (only if PostgreSQL version supports it)
    try:
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        if "PostgreSQL" in version and "PostgreSQL" in version:
            # Check if we can create text search index
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM pg_extension 
                    WHERE extname = 'pg_trgm'
                );
            """)
            if cursor.fetchone()[0]:
                indexes.append(("idx_logs_action_text", 
                    "CREATE INDEX IF NOT EXISTS idx_logs_action_text ON logs USING gin(to_tsvector('english', action || ' ' || COALESCE(details, '')))"))
    except Exception as e:
        print(f"Could not determine PostgreSQL version for text search index: {e}")
    
    for index_name, index_sql in indexes:
        try:
            cursor.execute(index_sql)
            print(f"Created index: {index_name}")
        except Exception as e:
            print(f"Error creating index {index_name}: {e}")

def update_existing_logs(cursor):
    """Update existing logs with default values for new columns."""
    
    # Update logs with default values where needed
    updates = [
        ("UPDATE logs SET log_level = 'INFO' WHERE log_level IS NULL"),
        ("UPDATE logs SET category = 'SYSTEM' WHERE category IS NULL"),
        ("UPDATE logs SET created_at = timestamp WHERE created_at IS NULL")
    ]
    
    for update_sql in updates:
        try:
            cursor.execute(update_sql)
            print(f"Executed: {update_sql}")
        except Exception as e:
            print(f"Error executing update: {e}")

def enable_row_level_security(cursor):
    """Enable Row Level Security on logs table if needed."""
    try:
        cursor.execute("ALTER TABLE logs ENABLE ROW LEVEL SECURITY;")
        print("Enabled Row Level Security on logs table")
    except Exception as e:
        print(f"Could not enable RLS (this might be expected): {e}")

def add_comments_to_table(cursor):
    """Add comments to table and columns for documentation."""
    
    comments = [
        ("COMMENT ON TABLE logs IS 'Enhanced system logs table with filtering, search, and categorization capabilities';",
         "COMMENT ON COLUMN logs.log_level IS 'Log severity level: DEBUG, INFO, WARNING, ERROR, CRITICAL';",
         "COMMENT ON COLUMN logs.ip_address IS 'IP address of the user who performed the action';",
         "COMMENT ON COLUMN logs.user_agent IS 'Browser/user agent information';",
         "COMMENT ON COLUMN logs.category IS 'Log category for organization: SYSTEM, AUTHENTICATION, etc.';",
         "COMMENT ON COLUMN logs.session_id IS 'Session identifier for tracking user sessions';",
         "COMMENT ON COLUMN logs.created_at IS 'Creation timestamp (redundant with timestamp for performance)';")
    ]
    
    for comment_sql in comments:
        try:
            cursor.execute(comment_sql)
            print("Added table/column comment")
        except Exception as e:
            print(f"Could not add comment (this is optional): {e}")

def optimize_table(cursor):
    """Perform table optimizations."""
    
    optimizations = [
        # Analyze table for better query planning
        "ANALYZE logs;",
        
        # Update table statistics
        "UPDATE pg_stats SET n_distinct = GREATEST(n_distinct, 1) WHERE tablename = 'logs';"
    ]
    
    for optimization in optimizations:
        try:
            cursor.execute(optimization)
            print(f"Executed optimization: {optimization}")
        except Exception as e:
            print(f"Could not execute optimization (this is optional): {e}")

def create_log_cleanup_policy(cursor):
    """Create a function to clean up old logs."""
    
    cleanup_function = """
    CREATE OR REPLACE FUNCTION cleanup_old_logs(days_to_keep INTEGER DEFAULT 90)
    RETURNS INTEGER AS $$
    DECLARE
        deleted_count INTEGER;
    BEGIN
        DELETE FROM logs 
        WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
        RETURN deleted_count;
    END;
    $$ LANGUAGE plpgsql;
    """
    
    try:
        cursor.execute(cleanup_function)
        print("Created cleanup function for old logs")
    except Exception as e:
        print(f"Could not create cleanup function: {e}")

def main():
    """Main migration function."""
    print("Starting enhanced logs table migration...")
    
    conn = None
    try:
        conn = get_connection()
        conn.autocommit = False
        cursor = conn.cursor()
        
        print("✓ Connected to database")
        
        # Check if table exists
        if not check_table_exists(cursor):
            print("❌ Logs table does not exist. Please run db_init.py first to create the table.")
            return False
        
        print("✓ Logs table exists")
        
        # Perform migration steps
        print("\n📝 Adding new columns...")
        add_columns_if_not_exist(cursor)
        
        print("\n📝 Creating indexes...")
        create_indexes(cursor)
        
        print("\n📝 Updating existing logs...")
        update_existing_logs(cursor)
        
        print("\n📝 Adding security features...")
        enable_row_level_security(cursor)
        
        print("\n📝 Adding documentation...")
        add_comments_to_table(cursor)
        
        print("\n📝 Optimizing table...")
        optimize_table(cursor)
        
        print("\n📝 Creating maintenance functions...")
        create_log_cleanup_policy(cursor)
        
        # Commit all changes
        conn.commit()
        print("\n✅ Migration completed successfully!")
        
        # Show summary
        cursor.execute("SELECT COUNT(*) FROM logs;")
        total_logs = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_name = 'logs';
        """)
        column_count = cursor.fetchone()[0]
        
        print(f"\n📊 Migration Summary:")
        print(f"   • Total logs in table: {total_logs}")
        print(f"   • Total columns: {column_count}")
        print(f"   • New features enabled: Advanced filtering, search, pagination, export")
        print(f"   • Performance indexes: Created")
        print(f"   • Cleanup function: Available")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        if conn:
            conn.rollback()
        return False
        
    finally:
        if conn:
            cursor.close()
            conn.close()
            print("✓ Database connection closed")

if __name__ == "__main__":
    success = main()
    if success:
        print("\n🎉 Enhanced logging system is ready to use!")
        print("\nNext steps:")
        print("1. Restart your Flask application")
        print("2. Test the new logging features in the admin interface")
        print("3. Integrate the LoggingService into your existing code")
    else:
        print("\n💥 Migration failed. Please check the errors above and try again.")
        sys.exit(1)
