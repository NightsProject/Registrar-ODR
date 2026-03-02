"""
Logging Service - Centralized logging service for the registrar system.
Provides consistent logging functionality across the application.
"""

from datetime import datetime
import json
from flask import request, session
from flask_jwt_extended import get_jwt_identity
from app.admin.logging.models import LoggingModel


class LoggingService:
    """
    Centralized service for logging system activities.
    """
    
    LOG_LEVELS = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
    CATEGORIES = [
        'SYSTEM', 'AUTHENTICATION', 'REQUEST_MANAGEMENT', 'DOCUMENT_MANAGEMENT',
        'USER_MANAGEMENT', 'PAYMENT', 'REPORTING', 'ADMINISTRATION', 'SECURITY',
        'MAINTENANCE', 'ERROR', 'AUDIT'
    ]
    
    @staticmethod
    def log_admin_action(action, details=None, request_id=None, log_level='INFO', 
                        category='ADMINISTRATION', auto_capture=True):
        """
        Log an admin action with automatic context capture.
        
        Args:
            action (str): Action description (e.g., "User Updated", "Document Created")
            details (str, optional): Additional details about the action
            request_id (str, optional): Related request ID
            log_level (str): Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            category (str): Log category
            auto_capture (bool): Whether to auto-capture context (admin_id, IP, etc.)
        
        Returns:
            int: Log ID if successful, None if failed
        """
        try:
            # Auto-capture context if enabled
            admin_id = None
            ip_address = None
            user_agent = None
            session_id = None
            
            if auto_capture:
                try:
                    admin_id = get_jwt_identity()
                except:
                    admin_id = 'system'
                
                try:
                    ip_address = request.environ.get('HTTP_X_REAL_IP', request.remote_addr) if request else None
                except:
                    pass
                
                try:
                    user_agent = request.headers.get('User-Agent') if request else None
                except:
                    pass
                
                try:
                    session_id = session.get('session_id') if session else None
                except:
                    pass
            
            # Validate log level and category
            if log_level not in LoggingService.LOG_LEVELS:
                log_level = 'INFO'
            
            if category not in LoggingService.CATEGORIES:
                category = 'ADMINISTRATION'
            
            # Create the log entry
            return LoggingModel.create_log(
                admin_id=admin_id,
                action=action,
                details=details,
                request_id=request_id,
                log_level=log_level,
                category=category,
                ip_address=ip_address,
                user_agent=user_agent,
                session_id=session_id
            )
        
        except Exception as e:
            print(f"LoggingService error: {e}")
            return None
    
    @staticmethod
    def log_authentication_event(event_type, details=None, success=True, user_id=None):
        """
        Log authentication events.
        
        Args:
            event_type (str): Type of auth event (login, logout, password_reset, etc.)
            details (str, optional): Additional details
            success (bool): Whether the event was successful
            user_id (str, optional): User ID involved
        """
        action = f"Authentication: {event_type}"
        status = "Success" if success else "Failed"
        
        full_details = f"{status}"
        if details:
            full_details += f" - {details}"
        if user_id:
            full_details += f" (User: {user_id})"
        
        log_level = 'INFO' if success else 'WARNING'
        category = 'AUTHENTICATION'
        
        return LoggingService.log_admin_action(
            action=action,
            details=full_details,
            log_level=log_level,
            category=category
        )
    
    @staticmethod
    def log_request_management(action, request_id, details=None, admin_id=None):
        """
        Log request management activities.
        
        Args:
            action (str): Action type (created, updated, status_changed, etc.)
            request_id (str): Request ID
            details (str, optional): Additional details
            admin_id (str, optional): Admin who performed the action
        """
        full_action = f"Request Management: {action}"
        
        full_details = f"Request ID: {request_id}"
        if details:
            full_details += f" - {details}"
        
        return LoggingService.log_admin_action(
            action=full_action,
            details=full_details,
            request_id=request_id,
            category='REQUEST_MANAGEMENT'
        )
    
    @staticmethod
    def log_document_management(action, document_id, details=None):
        """
        Log document management activities.
        
        Args:
            action (str): Action type (created, updated, deleted, hidden, etc.)
            document_id (str): Document ID
            details (str, optional): Additional details
        """
        full_action = f"Document Management: {action}"
        
        full_details = f"Document ID: {document_id}"
        if details:
            full_details += f" - {details}"
        
        return LoggingService.log_admin_action(
            action=full_action,
            details=full_details,
            category='DOCUMENT_MANAGEMENT'
        )
    
    @staticmethod
    def log_user_management(action, user_id, details=None):
        """
        Log user management activities.
        
        Args:
            action (str): Action type (created, updated, role_changed, etc.)
            user_id (str): User ID
            details (str, optional): Additional details
        """
        full_action = f"User Management: {action}"
        
        full_details = f"User ID: {user_id}"
        if details:
            full_details += f" - {details}"
        
        return LoggingService.log_admin_action(
            action=full_action,
            details=full_details,
            category='USER_MANAGEMENT'
        )
    
    @staticmethod
    def log_payment_event(action, request_id, amount=None, details=None):
        """
        Log payment-related events.
        
        Args:
            action (str): Action type (payment_confirmed, refund_processed, etc.)
            request_id (str): Related request ID
            amount (float, optional): Payment amount
            details (str, optional): Additional details
        """
        full_action = f"Payment: {action}"
        
        full_details = f"Request ID: {request_id}"
        if amount:
            full_details += f" - Amount: ₱{amount:.2f}"
        if details:
            full_details += f" - {details}"
        
        return LoggingService.log_admin_action(
            action=full_action,
            details=full_details,
            request_id=request_id,
            category='PAYMENT'
        )
    
    @staticmethod
    def log_security_event(event_type, details=None, severity='WARNING'):
        """
        Log security-related events.
        
        Args:
            event_type (str): Type of security event
            details (str, optional): Additional details
            severity (str): Severity level (INFO, WARNING, ERROR)
        """
        action = f"Security: {event_type}"
        
        full_details = ""
        if details:
            full_details = details
        
        log_level = severity if severity in LoggingService.LOG_LEVELS else 'WARNING'
        
        return LoggingService.log_admin_action(
            action=action,
            details=full_details,
            log_level=log_level,
            category='SECURITY'
        )
    
    @staticmethod
    def log_system_event(event_type, details=None, log_level='INFO'):
        """
        Log system-level events.
        
        Args:
            event_type (str): Type of system event
            details (str, optional): Additional details
            log_level (str): Log level
        """
        action = f"System: {event_type}"
        
        full_details = ""
        if details:
            full_details = details
        
        return LoggingService.log_admin_action(
            action=action,
            details=full_details,
            log_level=log_level,
            category='SYSTEM'
        )
    
    @staticmethod
    def log_error(context, error_message, details=None):
        """
        Log error events.
        
        Args:
            context (str): Context where error occurred
            error_message (str): Error message
            details (str, optional): Additional error details
        """
        action = f"Error: {context}"
        
        full_details = error_message
        if details:
            full_details += f" - {details}"
        
        return LoggingService.log_admin_action(
            action=action,
            details=full_details,
            log_level='ERROR',
            category='ERROR'
        )
    
    @staticmethod
    def log_audit_trail(action, entity_type, entity_id, changes=None, admin_id=None):
        """
        Log audit trail events for compliance.
        
        Args:
            action (str): Action performed
            entity_type (str): Type of entity (user, document, request, etc.)
            entity_id (str): Entity ID
            changes (dict, optional): Changes made
            admin_id (str, optional): Admin who made changes
        """
        full_action = f"Audit: {action}"
        
        full_details = f"{entity_type} ID: {entity_id}"
        if changes:
            full_details += f" - Changes: {json.dumps(changes)}"
        
        return LoggingService.log_admin_action(
            action=full_action,
            details=full_details,
            log_level='INFO',
            category='AUDIT'
        )


# Convenience functions for quick logging
def log_admin_action(action, details=None, request_id=None, log_level='INFO', category='ADMINISTRATION'):
    """Quick function to log admin actions."""
    return LoggingService.log_admin_action(action, details, request_id, log_level, category)


def log_auth_event(event_type, details=None, success=True, user_id=None):
    """Quick function to log authentication events."""
    return LoggingService.log_authentication_event(event_type, details, success, user_id)


def log_request_action(action, request_id, details=None):
    """Quick function to log request management actions."""
    return LoggingService.log_request_management(action, request_id, details)


def log_document_action(action, document_id, details=None):
    """Quick function to log document management actions."""
    return LoggingService.log_document_management(action, document_id, details)


def log_payment_action(action, request_id, amount=None, details=None):
    """Quick function to log payment events."""
    return LoggingService.log_payment_event(action, request_id, amount, details)


def log_security_event(event_type, details=None, severity='WARNING'):
    """Quick function to log security events."""
    return LoggingService.log_security_event(event_type, details, severity)


def log_system_event(event_type, details=None, log_level='INFO'):
    """Quick function to log system events."""
    return LoggingService.log_system_event(event_type, details, log_level)


def log_error(context, error_message, details=None):
    """Quick function to log errors."""
    return LoggingService.log_error(context, error_message, details)


def log_audit(action, entity_type, entity_id, changes=None, admin_id=None):
    """Quick function to log audit events."""
    return LoggingService.log_audit_trail(action, entity_type, entity_id, changes, admin_id)
