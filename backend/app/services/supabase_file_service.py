"""
Supabase file service for handling file uploads and storage.
Provides unified file upload functionality across the application.
"""

import base64
import os
from datetime import datetime
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_ANON_KEY


class SupabaseFileService:
    """Service class for managing file uploads to Supabase Storage."""

    def __init__(self):
        """Initialize Supabase client."""
        if not SUPABASE_URL or not SUPABASE_ANON_KEY:
            print("WARNING: Supabase credentials not found. File uploads will fail.")
            self.supabase = None
        else:
            try:
                self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
            except Exception as e:
                print(f"ERROR: Failed to initialize Supabase client: {e}")
                self.supabase = None
    
    def _check_supabase_available(self) -> bool:
        """Check if Supabase client is available."""
        if self.supabase is None:
            raise Exception("Supabase service not available. Please check your environment variables.")
        return True
    

    def upload_file(self, bucket_name: str, file_path: str, file_data: bytes, 
                   content_type: str = "application/octet-stream") -> tuple[bool, str, str]:
        """
        Upload a file to Supabase storage.
        
        Args:
            bucket_name (str): Name of the Supabase storage bucket
            file_path (str): Path within the bucket where file will be stored
            file_data (bytes): File content as bytes
            content_type (str): MIME type of the file
            
        Returns:
            tuple: (success: bool, message: str, file_url: str)
        """
        try:
            self._check_supabase_available()
            
            # Upload file to Supabase
            result = self.supabase.storage.from_(bucket_name).upload(
                file_path, 
                file_data,
                {"content-type": content_type}
            )
            
            # Get public URL
            file_url = self.supabase.storage.from_(bucket_name).get_public_url(file_path)
            
            return True, "File uploaded successfully", file_url
            
        except Exception as e:
            print(f"Error uploading file to Supabase: {e}")
            return False, f"Upload failed: {str(e)}", ""
    
    def delete_file(self, bucket_name: str, file_path: str) -> tuple[bool, str]:
        """
        Delete a file from Supabase storage.
        
        Args:
            bucket_name (str): Name of the Supabase storage bucket
            file_path (str): Path within the bucket to the file
            
        Returns:
            tuple: (success: bool, message: str)
        """
        try:
            self._check_supabase_available()
            self.supabase.storage.from_(bucket_name).remove([file_path])
            return True, "File deleted successfully"
        except Exception as e:
            print(f"Error deleting file from Supabase: {e}")
            return False, f"Delete failed: {str(e)}"
    
    def get_file_url(self, bucket_name: str, file_path: str) -> str:
        """
        Get public URL for a file in Supabase storage.
        
        Args:
            bucket_name (str): Name of the Supabase storage bucket
            file_path (str): Path within the bucket to the file
            
        Returns:
            str: Public URL of the file
        """
        try:
            self._check_supabase_available()
            return self.supabase.storage.from_(bucket_name).get_public_url(file_path)
        except Exception as e:
            print(f"Error getting file URL from Supabase: {e}")
            return ""
    
    def generate_unique_filename(self, tracking_number: str, change_id: str, 
                               original_filename: str) -> tuple[str, str]:
        """
        Generate a unique filename for uploads.
        
        Args:
            tracking_number (str): Request tracking number
            change_id (str): Change ID
            original_filename (str): Original filename from user
            
        Returns:
            tuple: (file_path_in_bucket: str, filename: str)
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = os.path.splitext(original_filename)[1]
        clean_filename = f"CHANGE{tracking_number}_{change_id}_{timestamp}{file_extension}"
        
        # Create path structure: tracking_number/filename
        file_path_in_bucket = f"{tracking_number}/{clean_filename}"
        
        return file_path_in_bucket, clean_filename
    

    def upload_change_file(self, tracking_number: str, change_id: str, 
                          file_data_base64: str, original_filename: str, 
                          content_type: str = "application/octet-stream") -> tuple[bool, str, str]:
        """
        Upload a change file to Supabase with proper naming and structure.
        
        Args:
            tracking_number (str): Request tracking number
            change_id (str): Change ID
            file_data_base64 (str): Base64 encoded file data
            original_filename (str): Original filename
            content_type (str): MIME type of the file
            
        Returns:
            tuple: (success: bool, message: str, file_url: str)
        """
        try:
            self._check_supabase_available()
            
            # Decode base64 file data
            file_data = base64.b64decode(file_data_base64)
            
            # Generate unique filename and path
            file_path_in_bucket, filename = self.generate_unique_filename(
                tracking_number, change_id, original_filename
            )
            
            # Upload to 'changes-odr' bucket
            bucket_name = "requirements-odr"
            success, message, file_url = self.upload_file(
                bucket_name, file_path_in_bucket, file_data, content_type
            )
            
            return success, message, file_url
            
        except Exception as e:
            error_msg = f"Error uploading change file: {str(e)}"
            print(error_msg)
            return False, error_msg, ""
    
    def upload_requirement_file(self, request_id: str, requirement_id: str, 
                              file_data_base64: str, filename: str, 
                              content_type: str = "application/octet-stream") -> tuple[bool, str, str]:
        """
        Upload a requirement file to Supabase with proper naming and structure.
        
        Args:
            request_id (str): Request ID
            requirement_id (str): Requirement ID
            file_data_base64 (str): Base64 encoded file data
            filename (str): Filename
            content_type (str): MIME type of the file
            
        Returns:
            tuple: (success: bool, message: str, file_url: str)
        """
        try:
            self._check_supabase_available()
            
            # Decode base64 file data
            file_data = base64.b64decode(file_data_base64)
            
            # Generate unique filename and path
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            file_extension = os.path.splitext(filename)[1]
            unique_filename = f"{requirement_id}_{timestamp}{file_extension}"
            file_path_in_bucket = f"{request_id}/{unique_filename}"
            
            # Upload to 'requirements-odr' bucket
            bucket_name = "requirements-odr"
            success, message, file_url = self.upload_file(
                bucket_name, file_path_in_bucket, file_data, content_type
            )
            
            return success, message, file_url
            
        except Exception as e:
            error_msg = f"Error uploading requirement file: {str(e)}"
            print(error_msg)
            return False, error_msg, ""

# Global instance for use across the application
supabase_file_service = SupabaseFileService()
