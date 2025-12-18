# Authentication Tab Documentation

## Purpose & Overview

The Authentication tab serves as the security gateway for the admin system, managing administrator access through Google OAuth integration and providing comprehensive admin user management capabilities. This tab ensures that only authorized personnel with valid MSUIIT email addresses can access the admin panel while maintaining detailed records of admin activities and permissions.

## Features

### OAuth Authentication System
- **Google OAuth 2.0 Integration**: Seamless login using Google account credentials
- **Domain Restriction**: Automatic validation that users have valid MSUIIT email addresses (g.msuiit.edu.ph domain)
- **State Protection**: CSRF protection through OAuth state parameters to prevent authorization attacks
- **Nonce Verification**: Additional security layer through nonce tokens for request validation
- **Session Management**: Secure session establishment with JWT token generation

### Admin User Management
- **Admin Creation**: Ability to add new administrators to the system with role assignment
- **Role Management**: Dynamic role assignment and modification for existing administrators
- **Admin Deletion**: Removal of admin accounts with proper cleanup procedures
- **Profile Management**: Storage and retrieval of admin profile pictures and basic information
- **Role-based Access Control**: Different permission levels based on assigned roles

### Access Control Features
- **Waiting List Management**: Automatic handling of users who have authenticated but don't have admin privileges
- **Role Validation**: Real-time role checking for protected resources
- **Session Security**: Secure logout procedures with complete session cleanup
- **Current User Information**: Retrieval of authenticated admin details for personalized interface

### Security Features
- **Domain Validation**: Strict enforcement of MSUIIT domain requirements for all admin accounts
- **Token Management**: Secure JWT token creation and management
- **Session Protection**: Comprehensive session cleanup on logout to prevent security vulnerabilities
- **Error Handling**: Graceful handling of authentication failures with user-friendly error messages

## Data Models

### Database Tables Involved
- **admins**: Primary table storing admin user information including email, role, and profile picture
- **admin_settings**: Optional table for storing admin-specific configuration preferences
- **logs**: Activity logging for admin authentication and management actions

### Key Relationships
- **Admin Authentication**: Direct relationship between email address and admin record
- **Role Assignment**: Many-to-one relationship between admins and role types
- **Profile Pictures**: Optional profile image storage linked to admin accounts
- **Settings Association**: Admin-specific settings stored separately with foreign key relationships

### Data Structures
- **Admin Profile**: Email, role, and profile picture as core admin information
- **Role Types**: Different permission levels (super_admin, admin, staff, none)
- **OAuth Tokens**: Temporary tokens for OAuth flow management
- **Session Data**: Temporary session storage for OAuth state and nonce

## Backend Implementation

### OAuth Integration Layer
The authentication system implements comprehensive OAuth integration through:

#### Google OAuth Configuration
- **Client Registration**: Proper setup of Google OAuth client with credentials from environment variables
- **Metadata Endpoint**: Integration with Google's well-known OpenID configuration endpoint
- **Scope Management**: Limited scope request (openid, email, profile) for privacy protection
- **Claims Validation**: Custom validation rules for issuer and domain verification

#### OAuth Flow Management
- **Initiate Login**: `/api/admin/google/initiate` endpoint generating secure state and nonce tokens
- **Callback Handling**: `/api/admin/google/callback` endpoint processing OAuth responses with comprehensive error handling
- **State Validation**: Verification of OAuth state parameter to prevent CSRF attacks
- **Nonce Verification**: Additional security through nonce validation during token exchange

#### Domain and Access Control
- **Email Validation**: Strict checking of email domain against MSUIIT requirements
- **Role Assignment**: Automatic role assignment for new admin users (default to "none" for pending approval)
- **Waiting List Logic**: Automatic redirection to waiting page for users without admin privileges
- **Token Generation**: JWT token creation with role-based claims for authorization

### Admin Management System
The admin management functionality operates through a comprehensive CRUD system:

#### Admin CRUD Operations
- **Create**: Adding new admin accounts with email and role assignment
- **Read**: Retrieving all admin records with profile information
- **Update**: Modifying admin roles and profile information
- **Delete**: Removing admin accounts with proper cleanup procedures

#### Role Management
- **Dynamic Roles**: Support for multiple role types with different permission levels
- **Role Validation**: Server-side validation of role assignments
- **Permission Checking**: Integration with role-based access control system
- **Role Updates**: Real-time role changes affecting system access immediately

### Security Implementation
- **JWT Token Management**: Secure token creation with proper expiration and claims
- **Session Cleanup**: Complete session removal on logout to prevent security issues
- **Error Logging**: Comprehensive logging of authentication events for security monitoring
- **Exception Handling**: Graceful handling of authentication failures with appropriate error responses

### Controller Endpoints
- **OAuth Flow**: `/api/admin/google/initiate`, `/api/admin/google/callback`
- **Admin Management**: `/api/admin/admins` (GET, POST, PUT, DELETE)
- **Current User**: `/api/admin/current-user` for authenticated user information
- **Session Management**: `/api/admin/logout` for secure logout procedures

## Frontend Features

### Authentication Interface
- **Login Button**: Prominent Google OAuth login button for seamless authentication
- **Loading States**: Proper loading indicators during OAuth flow processing
- **Error Display**: User-friendly error messages for authentication failures
- **Success Handling**: Automatic redirection and token storage on successful authentication

### Admin Management Interface
- **Admin List Display**: Table or list view showing all administrators with their roles
- **Add Admin Form**: Modal or form for adding new administrators with email and role input
- **Role Assignment**: Dropdown or selection interface for role assignment during admin creation
- **Edit Admin**: Interface for modifying existing admin roles and information
- **Delete Confirmation**: Confirmation dialogs for admin deletion to prevent accidental removal

### User Experience Features
- **Waiting Screen**: Specialized interface for users who have authenticated but don't have admin privileges
- **Profile Display**: Show current admin's profile picture and basic information
- **Session Status**: Visual indicators of login status and session validity
- **Responsive Design**: Authentication interface adapts to different screen sizes

### Form Handling
- **Input Validation**: Real-time validation of email addresses and role selections
- **Error Messaging**: Clear error messages for validation failures and system errors
- **Form Persistence**: Proper handling of form data during submission processes
- **Success Feedback**: Confirmation messages for successful admin operations

## Key Functionality

### OAuth Security Model
The system implements a robust OAuth security model by:
- Using state parameters to prevent CSRF attacks during OAuth flow
- Implementing nonce verification for additional security layers
- Enforcing strict domain validation to ensure only authorized users can access the system
- Providing comprehensive error handling for various OAuth failure scenarios

### Admin Lifecycle Management
The admin management system handles the complete admin lifecycle by:
- Automatically creating admin records for new authenticated users
- Supporting role-based access control through dynamic role assignment
- Providing secure deletion procedures with proper cleanup
- Maintaining audit trails of all admin management activities

### Session Security
Session security is maintained through:
- Secure JWT token generation with appropriate claims and expiration
- Complete session cleanup on logout to prevent security vulnerabilities
- Integration with frontend token management for secure API calls
- Proper handling of session expiration and renewal processes

## Integration Points

### Frontend Token Management
- **JWT Storage**: Secure storage of authentication tokens in the frontend
- **Automatic Headers**: Automatic inclusion of authentication headers in API requests
- **Token Refresh**: Handling of token expiration and renewal processes
- **Logout Procedures**: Complete cleanup of stored tokens and session data

### Role-Based Access Control
- **Permission Checking**: Integration with role validation systems throughout the application
- **Dynamic Interface**: Frontend adaptation based on user role and permissions
- **Admin-Only Routes**: Protection of administrative routes through role validation
- **Feature Access**: Role-based feature availability throughout the admin interface

### Logging and Auditing
- **Authentication Events**: Logging of all authentication attempts and outcomes
- **Admin Changes**: Audit trails of all admin management activities
- **Security Monitoring**: Integration with security monitoring and alerting systems
- **Compliance**: Support for compliance requirements through comprehensive logging

### System Configuration
- **OAuth Credentials**: Integration with configuration management for OAuth settings
- **Domain Settings**: Configurable domain validation for different environments
- **Role Definitions**: Configurable role types and permission levels
- **Security Policies**: Integration with system security policy enforcement
