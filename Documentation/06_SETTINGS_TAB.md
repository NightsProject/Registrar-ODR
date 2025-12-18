# Settings Tab Documentation

## Purpose & Overview

The Settings tab serves as the central configuration management hub for the entire system, providing administrators with comprehensive control over system parameters, operational constraints, user access policies, and administrative configurations. This module ensures system administrators can dynamically manage system behavior, configure operational restrictions, manage admin user permissions, and maintain system-wide settings that affect all users and processes.

## Features

### System Restriction Management
- **Operating Hours Configuration**: Configurable start and end times for daily system operations
- **Day of Week Restrictions**: Selectable operational days of the week (Monday through Friday by default)
- **Announcement System**: Public announcements displayed to users during restricted periods
- **Restriction Status Overview**: Real-time view of current restriction settings and their impact
- **Operational Calendar**: Management of specific dates for availability restrictions

### Admin User Management
- **Comprehensive Admin Listing**: Complete view of all administrators with their roles and profile information
- **Admin Creation System**: Addition of new administrators with email and role assignment
- **Role Management**: Dynamic role assignment and modification for existing administrators
- **Admin Deletion**: Secure removal of admin accounts with proper cleanup procedures
- **Profile Management**: Management of admin profile pictures and basic account information

### Fee and Cost Management
- **Administrative Fee Configuration**: Centralized management of admin fees charged to users
- **Fee Update System**: Real-time fee updates affecting all new transactions
- **Fee Validation**: Server-side validation of fee amounts and formatting
- **Historical Fee Tracking**: Maintenance of fee change history for audit purposes
- **Fee Impact Analysis**: Understanding of fee changes on user costs and system revenue

### Date Availability Management
- **Individual Date Configuration**: Specific availability settings for particular dates
- **Bulk Date Operations**: Mass updates to multiple dates for holiday schedules or maintenance periods
- **Availability Status Tracking**: Real-time tracking of date-specific availability
- **Reason Management**: Explanatory reasons for date-specific availability changes
- **Upcoming Restrictions View**: Forward-looking view of planned restrictions

### Admin-Specific Configuration
- **Workload Management**: Configuration of maximum request limits per administrator
- **Capacity Settings**: Admin-specific capacity configuration for load balancing
- **Personal Preferences**: Individual admin settings and preferences
- **Performance Tracking**: Settings for tracking and monitoring admin performance
- **Notification Preferences**: Configuration of admin notification settings

## Data Models

### Database Tables Involved
- **open_request_restriction**: System-wide restriction settings including operating hours and available days
- **admins**: Admin user accounts with role and profile information
- **admin_settings**: Admin-specific configuration including maximum request limits
- **fee**: System-wide fee configuration for admin fees and other costs
- **available_dates**: Specific date availability settings for operational restrictions
- **logs**: Activity logging for all settings changes and admin management actions

### Key Relationships
- **System-Wide Settings**: Global settings affecting all users and system operations
- **Admin-Specific Settings**: Individual configuration per administrator
- **Fee Configuration**: System-wide fee structure affecting all transactions
- **Date-Specific Restrictions**: Flexible date-based availability management
- **Role-Based Access**: Integration with role-based access control system

### Data Processing Logic
- **JSON Data Handling**: Proper handling of JSON data for available days and complex settings
- **Time Zone Management**: Proper time handling for operational hours and restrictions
- **Validation Systems**: Comprehensive validation for all configuration data
- **Audit Trail Integration**: All settings changes logged for accountability

## Backend Implementation

### Settings Models Implementation
The backend implementation includes several specialized model classes:

#### OpenRequestRestriction Class
- **get_settings() Method**: Retrieves current system restriction settings with default value handling:
  - Fetches operating hours (start_time, end_time)
  - Retrieves available days of the week (stored as JSONB)
  - Gets current announcement text
  - Provides sensible defaults if no settings exist
  - Handles JSON parsing errors gracefully

- **update_settings() Method**: Updates system-wide restriction settings:
  - Validates input data including time formats and day selections
  - Updates announcement text
  - Handles JSON encoding for available days
  - Provides transaction management for data consistency

#### Admin Class
- **Comprehensive CRUD Operations**: Complete admin management system:
  - **get_all()**: Retrieves all administrators with profile information
  - **add()**: Creates new admin accounts with role assignment
  - **update()**: Modifies admin roles and profile information
  - **delete()**: Removes admin accounts with proper cleanup
  - **get_by_email()**: Retrieves specific admin information by email

#### Fee Class
- **Fee Management System**: Centralized fee configuration:
  - **get_value()**: Retrieves fee amounts by key (e.g., 'admin_fee')
  - **update_value()**: Updates fee amounts with conflict resolution
  - **Validation**: Ensures fee values are numeric and positive
  - **Conflict Resolution**: Handles concurrent fee updates

#### AvailableDates Class
- **Date-Specific Configuration**: Comprehensive date availability management:
  - **get_all()**: Retrieves all date-specific availability settings
  - **get_by_date()**: Gets availability for specific dates
  - **create_or_update()**: Creates or updates individual date settings
  - **bulk_update()**: Mass updates for multiple dates
  - **delete()**: Removes date-specific settings
  - **is_date_available()**: Quick availability checking
  - **get_upcoming_restrictions()**: Forward-looking restriction views

### Controller Implementation
The controller provides comprehensive API coverage:

#### Admin Management Endpoints
- **GET /api/admin/admins**: Retrieves all administrators
- **POST /api/admin/admins**: Creates new administrators
- **PUT /api/admin/admins/{email}**: Updates admin roles
- **DELETE /api/admin/admins/{email}**: Removes admin accounts

#### System Settings Endpoints
- **GET /api/admin/settings**: Retrieves current system restrictions
- **PUT /api/admin/settings**: Updates system restriction settings

#### Fee Management Endpoints
- **GET /api/admin/settings/fee**: Retrieves current admin fee
- **PUT /api/admin/settings/fee**: Updates admin fee amounts

#### Date Availability Endpoints
- **GET /api/admin/available-dates**: Retrieves all date availability settings
- **GET /api/admin/available-dates/{date}**: Gets specific date availability
- **POST /api/admin/available-dates**: Creates or updates date availability
- **DELETE /api/admin/available-dates/{date}**: Removes date availability settings
- **POST /api/admin/available-dates/bulk**: Bulk updates multiple dates
- **GET /api/admin/available-dates/upcoming**: Gets upcoming restrictions

#### Public Availability Endpoints
- **GET /api/public/date-availability/{date}**: Public endpoint for date availability checking

## Frontend Features

### System Settings Interface
- **Operating Hours Configuration**: Time picker interfaces for setting daily operating hours
- **Day Selection Interface**: Checkbox or multi-select interface for available days of the week
- **Announcement Management**: Rich text editor for system announcements
- **Settings Preview**: Preview of how restrictions will affect user experience
- **Real-time Validation**: Immediate feedback on setting validity and impact

### Admin Management Interface
- **Admin Directory**: Table or card-based display of all administrators with roles and status
- **Add Admin Form**: Modal or form interface for creating new administrators with email validation
- **Role Management Interface**: Dropdown or selection interface for role assignment
- **Admin Profile Management**: Interface for managing admin profile pictures and information
- **Admin Status Indicators**: Visual indicators showing admin status and activity

### Fee Management Interface
- **Fee Configuration Panel**: Interface for updating admin fees and other costs
- **Fee Impact Calculator**: Tool showing impact of fee changes on user costs
- **Historical Fee View**: Display of fee change history and trends
- **Fee Validation**: Real-time validation of fee amounts and formatting
- **Preview Functionality**: Preview of fee changes before application

### Date Availability Interface
- **Calendar View**: Calendar interface for managing date-specific availability
- **Bulk Date Operations**: Interface for mass updating multiple dates
- **Availability Indicators**: Visual indicators showing current availability status
- **Reason Management**: Interface for adding and managing reasons for availability changes
- **Upcoming Restrictions**: Timeline or list view of planned restrictions

### Admin Capacity Management
- **Capacity Configuration**: Interface for setting maximum request limits per admin
- **Workload Monitoring**: Visual representation of current admin workloads
- **Load Balancing Settings**: Configuration for automatic load balancing parameters
- **Performance Metrics**: Display of admin performance and capacity utilization

## Key Functionality

### Dynamic System Configuration
The system provides dynamic configuration by:
- Allowing real-time changes to operating restrictions without system restarts
- Providing immediate impact of setting changes on user experience
- Supporting configuration rollback and historical tracking
- Ensuring configuration consistency across all system components

### Flexible Admin Management
Admin management encompasses:
- Complete lifecycle management of admin accounts
- Dynamic role assignment affecting system permissions immediately
- Comprehensive admin activity tracking and auditing
- Integration with authentication and authorization systems

### Intelligent Date Management
Date management features include:
- Granular control over individual date availability
- Efficient bulk operations for holiday and maintenance scheduling
- Automatic integration with user-facing availability checking
- Comprehensive tracking of availability changes and reasons

### Comprehensive Fee Management
Fee management provides:
- Centralized control over all system fees and costs
- Real-time fee updates affecting new transactions
- Historical tracking of fee changes for auditing
- Impact analysis for fee modifications

## Integration Points

### User Interface Systems
- **Restriction Enforcement**: Integration with user interface for displaying restrictions to users
- **Announcement Display**: Connection to user-facing announcement systems
- **Availability Checking**: Integration with user request forms for date availability validation
- **Operating Hours Display**: Connection to user interface for displaying operating hours

### Authentication and Authorization
- **Role-Based Access**: Integration with role-based access control for admin permissions
- **Admin Validation**: Connection to authentication system for admin account validation
- **Permission Enforcement**: Integration with permission systems for feature access control
- **Session Management**: Connection to session management for admin-specific settings

### Request Processing System
- **Restriction Validation**: Integration with request submission for enforcing operating restrictions
- **Availability Checking**: Connection to request processing for validating date availability
- **Fee Calculation**: Integration with request cost calculation for fee inclusion
- **Admin Assignment**: Connection to admin assignment system for load balancing

### Notification and Communication Systems
- **Announcement Broadcasting**: Integration with notification systems for public announcements
- **Admin Notifications**: Connection to admin notification systems for settings changes
- **User Communication**: Integration with user communication systems for restriction notifications
- **Email Integration**: Connection to email systems for administrative communications

### Financial and Transaction Systems
- **Fee Integration**: Connection to financial systems for fee calculation and processing
- **Cost Management**: Integration with cost management for accurate pricing
- **Transaction Processing**: Connection to transaction systems for fee application
- **Revenue Tracking**: Integration with revenue tracking for financial reporting

### Logging and Audit Systems
- **Settings Change Logging**: Integration with logging systems for all configuration changes
- **Admin Activity Tracking**: Connection to audit systems for admin management activities
- **Compliance Reporting**: Integration with compliance systems for regulatory reporting
- **Change Audit**: Comprehensive audit trail of all settings modifications

### System Administration Tools
- **Configuration Backup**: Integration with backup systems for settings preservation
- **System Health Monitoring**: Connection to system monitoring for configuration validation
- **Performance Integration**: Integration with performance monitoring for settings impact analysis
- **Maintenance Integration**: Connection to maintenance procedures for configuration management
