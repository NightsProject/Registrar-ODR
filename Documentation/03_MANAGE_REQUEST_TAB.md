# Manage Request Tab Documentation

## Purpose & Overview

The Manage Request tab serves as the central hub for administrative oversight of document requests throughout their entire lifecycle. This comprehensive module enables administrators to view, track, assign, process, and manage all aspects of document requests from initial submission through final completion and release. It functions as the primary operational interface for administrators to maintain workflow efficiency and ensure proper request handling.

## Features

### Request Overview and Filtering
- **Comprehensive Request Listing**: Display all requests with complete details including requester information, requested documents, status, and financial information
- **Advanced Filtering System**: Multi-dimensional filtering by college code, requester type (Student vs Outsider), presence of custom documents, and assignment status
- **Search Functionality**: Real-time search across multiple fields including request ID, student ID, full name, email, and contact number
- **Pagination Support**: Efficient handling of large request volumes through paginated results
- **Assignment-based Views**: Separate views for all requests versus requests assigned to specific administrators

### Assignment Management System
- **Manual Assignment**: Direct assignment of specific requests to individual administrators
- **Auto-Assignment with Load Balancing**: Intelligent distribution of unassigned requests across administrators based on current workload capacity
- **Capacity Management**: Configurable maximum request limits per administrator with automatic enforcement
- **Assignment Tracking**: Real-time tracking of admin workload and completion progress
- **Unassignment Capabilities**: Ability to remove assignments when necessary for workload redistribution

### Request Processing Features
- **Status Management**: Comprehensive status tracking and updates throughout the request lifecycle (PENDING, IN-PROGRESS, DOC-READY, RELEASED, REJECTED)
- **Document Completion Tracking**: Individual document-level completion status management
- **Custom Document Handling**: Management of user-submitted custom document requests
- **Payment Status Management**: Tracking and updating payment information at both request and document levels
- **Change Request System**: Formal process for requesting modifications to submitted requirements

### Request Deletion and Cleanup
- **Complete Request Deletion**: Removal of requests along with all associated data including uploaded files, requirements, and logs
- **File Cleanup Integration**: Automatic deletion of uploaded files from cloud storage during request removal
- **Audit Trail Maintenance**: Preservation of deletion logs for compliance and auditing purposes
- **Cascading Delete Operations**: Proper handling of database relationships during deletion

### Progress Monitoring
- **Individual Admin Progress**: Real-time tracking of completion rates for assigned requests
- **System-wide Progress Overview**: Aggregate statistics showing overall system performance
- **Workload Distribution**: Visual representation of admin workload distribution and capacity utilization
- **Completion Metrics**: Detailed metrics on request completion times and processing efficiency

## Data Models

### Database Tables Involved
- **requests**: Core request information including requester details, status, and financial data
- **request_documents**: Links between requests and requested documents with completion tracking
- **document_requirements**: Requirements associated with each document type
- **requirements**: Master list of all possible requirements
- **request_requirements_links**: Uploaded files linked to specific requirements
- **request_assignments**: Admin-request assignment relationships
- **others_documents**: Custom documents submitted by requesters
- **changes**: Change requests submitted by administrators
- **admin_settings**: Admin-specific configuration including maximum request limits
- **logs**: Comprehensive activity logging for all admin actions

### Key Relationships
- **Request-Document Relationship**: Many-to-many relationship through request_documents table with quantity and completion tracking
- **Requirement-Document Mapping**: Document-specific requirements through document_requirements junction table
- **Admin-Request Assignments**: Many-to-many relationship enabling flexible workload distribution
- **File-Upload Tracking**: Links between uploaded files and specific requirements through request_requirements_links
- **Custom Document Management**: Separate tracking for user-submitted custom documents

### Data Processing Logic
- **Complex Joins**: Multi-table joins for comprehensive request views combining request details, documents, requirements, and assignments
- **Bulk Operations**: Efficient bulk processing for auto-assignment and status updates
- **Pagination Optimization**: Optimized queries with proper indexing for large dataset handling
- **Search Indexing**: Full-text search capabilities across multiple related fields

## Backend Implementation

### ManageRequestModel Class
The backend implementation centers around the comprehensive `ManageRequestModel` class:

#### Request Retrieval System
- **fetch_requests() Method**: Sophisticated request retrieval with advanced filtering and pagination:
  - Multi-dimensional filtering by admin assignment, college code, requester type, and custom document presence
  - Full-text search across requester information and request identifiers
  - Efficient pagination with configurable limits
  - Bulk data fetching for documents, requirements, uploaded files, and recent logs
  - Optimized SQL queries with proper JOIN operations for performance

#### Assignment Management System
- **assign_request_to_admin() Method**: Manual assignment with capacity validation:
  - Checks admin current workload against configured maximum limits
  - Maintains assignment history and audit trails
  - Handles assignment conflicts and updates existing assignments
  - Logs all assignment activities for accountability

- **auto_assign_requests_load_balanced() Method**: Intelligent automatic assignment:
  - Calculates available capacity for all administrators
  - Implements round-robin load balancing algorithm
  - Considers admin maximum limits during distribution
  - Handles edge cases like admin capacity limitations
  - Maintains assignment audit trails for all auto-assignments

#### Status and Progress Management
- **update_request_status() Method**: Comprehensive status management:
  - Updates request status with proper validation
  - Manages payment status integration
  - Maintains audit logs for all status changes
  - Handles payment reference and type tracking

- **get_assignment_progress() Method**: Progress tracking system:
  - Calculates completion rates (DOC-READY vs total assigned)
  - Provides real-time workload statistics
  - Supports individual and aggregate progress reporting

#### Document and File Management
- **toggle_document_completion() Method**: Document-level completion tracking:
  - Toggles completion status for individual documents
  - Maintains audit trails for completion status changes
  - Handles both standard and custom document types
  - Integrates with logging system for activity tracking

- **delete_request() Method**: Comprehensive deletion system:
  - Removes all associated data including files, requirements, and documents
  - Integrates with cloud storage for file cleanup
  - Maintains deletion audit trails
  - Handles cascading deletes with proper transaction management

### Controller Endpoints
The controller layer provides comprehensive API coverage:

#### Request Management
- **GET /api/admin/requests**: Paginated request listing with filtering
- **GET /api/admin/my-requests**: Requests assigned to current admin
- **GET /api/admin/requests/{id}**: Complete request details with all related data
- **PUT /api/admin/requests/{id}/status**: Status updates with payment integration
- **DELETE /api/admin/requests/{id}**: Complete request deletion

#### Assignment Management
- **POST /api/admin/auto-assign**: Load-balanced automatic assignment
- **POST /api/admin/manual-assign**: Manual assignment of specific requests
- **POST /api/admin/unassign**: Removal of admin assignments
- **GET /api/admin/unassigned-requests**: Listing of unassigned requests
- **GET /api/admin/assignment-progress**: Individual admin progress tracking

#### Progress and Monitoring
- **GET /api/admin/admins-progress**: System-wide admin progress overview
- **GET /api/admin/admin-requests/{admin_id}**: Specific admin's assigned requests
- **GET /api/admin/request-admin/{request_id}**: Admin assigned to specific request

#### Change Request System
- **POST /api/admin/requests/{id}/changes**: Submit change requests
- **GET /api/admin/requests/{id}/changes**: Retrieve change request details

#### Configuration Management
- **GET/PUT /api/admin/admin-max-requests/{admin_id}**: Admin workload configuration

#### Document Management
- **PUT /api/admin/requests/{id}/documents/{doc_id}/status**: Document completion toggling
- **PUT /api/admin/requests/{id}/others_documents/{doc_id}/status**: Custom document completion

#### Filtering and Search
- **GET /api/admin/requests/filters**: Available filter options
- **GET /api/admin/unassigned-requests/filters**: Unassigned request filter options

## Frontend Features

### Request Listing Interface
- **Advanced Data Table**: Comprehensive table displaying all request information with sortable columns
- **Multi-dimensional Filtering**: Filter panels for college code, requester type, and custom document presence
- **Real-time Search**: Search bar with instant filtering across multiple request fields
- **Pagination Controls**: Navigation controls for large datasets with configurable page sizes
- **Assignment Indicators**: Visual indicators showing admin assignments and workload distribution

### Request Detail Views
- **Comprehensive Request Display**: Complete request information including requester details, requested documents, and requirements
- **Document Progress Tracking**: Visual indicators for document completion status
- **File Upload Management**: Display and management of uploaded requirement files
- **Custom Document Handling**: Interface for managing user-submitted custom documents
- **Change Request Interface**: Form for submitting change requests with requirement selection

### Assignment Management Interface
- **Manual Assignment Controls**: Interface for assigning specific requests to administrators
- **Auto-Assignment Dashboard**: Controls for triggering automatic assignment with load balancing
- **Workload Visualization**: Charts or indicators showing admin workload and capacity
- **Assignment History**: Timeline or list showing assignment changes and history
- **Capacity Management**: Interface for configuring admin maximum request limits

### Status Management Interface
- **Status Update Controls**: Interface for changing request status with payment integration
- **Bulk Status Operations**: Ability to update status for multiple requests simultaneously
- **Status History**: Timeline showing all status changes for a request
- **Payment Tracking**: Interface for managing payment status and reference information

### Progress Monitoring Dashboard
- **Individual Progress**: Personal dashboard showing assigned request completion rates
- **System-wide Overview**: Aggregate progress statistics across all administrators
- **Workload Distribution**: Visual representation of current workload distribution
- **Performance Metrics**: Statistics on processing times and completion rates

### Form Interfaces
- **Request Deletion**: Confirmation dialogs for request deletion with impact warnings
- **Change Requests**: Form interface for submitting change requests with requirement selection
- **Assignment Forms**: Interface for manual request assignment with admin selection
- **Configuration Forms**: Settings interface for admin capacity management

## Key Functionality

### Intelligent Assignment Algorithm
The system implements sophisticated assignment logic by:
- Calculating available capacity for each administrator based on current workload and configured limits
- Implementing round-robin distribution to ensure fair workload distribution
- Handling edge cases like admin capacity limitations and request priorities
- Maintaining assignment audit trails for accountability and troubleshooting

### Comprehensive Request Lifecycle Management
Request lifecycle management encompasses:
- Complete tracking from initial submission through final release
- Individual document-level progress monitoring
- Integration with payment processing and status management
- Formal change request process for requirement modifications
- Comprehensive deletion capabilities with proper cleanup procedures

### Advanced Filtering and Search
The filtering system provides:
- Multi-dimensional filtering across various request attributes
- Real-time search capabilities across multiple related fields
- Efficient pagination for large datasets
- Configurable view options based on user role and permissions
- Save and share filtering preferences for frequently used views

### Audit Trail and Logging
Comprehensive logging includes:
- All admin actions logged with timestamps and admin identification
- Request lifecycle events including status changes, assignments, and deletions
- File upload and deletion activities
- Change request submissions and resolutions
- Assignment and unassignment activities

## Integration Points

### Payment Processing System
- **Payment Status Integration**: Automatic updates to payment status based on request processing
- **Financial Tracking**: Integration with transaction tracking for payment history
- **Fee Management**: Connection to fee configuration for accurate cost calculations
- **Payment Reference Tracking**: Management of payment references and transaction types

### File Management System
- **Upload Integration**: Seamless integration with file upload functionality
- **Cloud Storage Cleanup**: Automatic file deletion from cloud storage during request removal
- **File Access Management**: Secure file access for administrators with proper authorization
- **File Type Validation**: Integration with file type validation and security measures

### Notification System
- **WhatsApp Integration**: Automatic status update notifications through WhatsApp
- **Email Notifications**: Integration with email notification system for important updates
- **In-app Notifications**: Real-time notifications within the admin interface
- **Notification Preferences**: Configurable notification settings for different event types

### User Interface Components
- **React Components**: Integration with frontend React components for dynamic interfaces
- **State Management**: Proper integration with application state management
- **Real-time Updates**: Live data updates without page refresh
- **Responsive Design**: Mobile-friendly interfaces for on-the-go administration

### Authentication and Authorization
- **Role-based Access**: Integration with role-based access control throughout the system
- **Session Management**: Proper session handling for secure admin access
- **Permission Validation**: Server-side validation of admin permissions for sensitive operations
- **Audit Integration**: All actions logged for security and compliance monitoring
