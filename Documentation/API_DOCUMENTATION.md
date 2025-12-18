# ODR System API Documentation

## Overview

The Online Document Request (ODR) System API provides endpoints for managing document requests, user authentication, admin operations, payment processing, and tracking. The system supports two main user types:

- **Users**: Students and outsiders who can make document requests
- **Admins**: System administrators who manage requests, documents, and users


## Base URL

```
http://127.0.0.1:8000
```

**Note**: The frontend is configured with a proxy to `http://127.0.0.1:8000`, so API calls from the frontend will be made to the same domain.

## Authentication

The API uses JWT (JSON Web Tokens) for authentication with the following methods:

### For Users (Students/Outsiders)
- **OTP-based authentication** via WhatsApp
- Token is set in HTTP-only cookies
- No manual token headers required

### For Admins
- **Google OAuth** authentication
- Token is set in HTTP-only cookies
- Requires @g.msuiit.edu.ph domain email

## Content Type

All API endpoints accept and return JSON data unless otherwise specified.


---

## User Landing API

### GET `/user/landing`
Get user landing page.

**Response (Success - 200):**
```json
{
    "status": "success"
}
```

---

## User Authentication API

### POST `/user/authentication/check-id`
Verify student ID and initiate OTP process.

**Request Body:**
```json
{
    "student_id": "2020-0001"
}
```

**Response (Success - 200):**
```json
{
    "status": "valid",
    "message": "Student OK, continue",
    "masked_phone": "1234"
}
```

**Response (Not Found - 404):**
```json
{
    "status": "not_found",
    "message": "Student ID not registered"
}
```


### POST `/user/authentication/check-name`
Verify student name and initiate OTP process (alternative method).

**Request Body:**
```json
{
    "firstname": "John",
    "lastname": "Doe",
    "whatsapp_number": "+639123456789",
    "requester_name": "John Doe"
}
```

**Response (Success - 200):**
```json
{
    "status": "name_verified",
    "message": "Name verified successfully.",
    "masked_phone": "6789"
}
```

**Response (Not Found - 404):**
```json
{
    "status": "not_found",
    "message": "Student name not found in records"
}
```


### POST `/user/authentication/resend-otp`
Resend OTP to user's WhatsApp number.

**Response (Success - 200):**
```json
{
    "status": "resent",
    "message": "New OTP sent successfully",
    "masked_phone": "1234"
}
```

**Response (Error - 400):**
```json
{
    "error": "No active session",
    "message": "No active authentication session found"
}
```

**Response (Error - 429):**
```json
{
    "error": "Too Many Requests",
    "message": "OTP resend limit exceeded. Please try again later."
}
```


### POST `/user/authentication/verify-otp`
Verify OTP and complete authentication.

**Request Body:**
```json
{
    "otp": "123456"
}
```

**Response (Success - 200):**
```json
{
    "message": "User login successful",
    "role": "user",
    "valid": true,
    "has_liability": false
}
```

**Response (Error - 400):**
```json
{
    "error": "Invalid OTP",
    "message": "The OTP code provided is incorrect or has expired"
}
```

**Response (Error - 429):**
```json
{
    "error": "Too Many Attempts",
    "message": "Maximum OTP verification attempts exceeded. Please request a new OTP."
}
```

### POST `/user/authentication/upload-authletter`
Upload authorization letter for outsider requests.

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `file`: Authorization letter file
- `firstname`: Student first name
- `lastname`: Student last name
- `number`: Requester phone number
- `requester_name`: Name of person/organization
- `request_id`: (Optional) Associated request ID

**Response (Success - 200):**
```json
{
    "success": true,
    "notification": "Authorization letter uploaded successfully",
    "file_url": "https://supabase-url.com/folder/file.pdf"
}
```

---

## User Document Management API

### GET `/user/document_list/api/view-documents`
Get all available documents for request.

**Response (Success - 200):**
```json
{
    "documents": [
        {
            "doc_id": "DOC0001",
            "doc_name": "Transcript of Records",
            "description": "Official academic transcript",
            "cost": 100.00,
            "requires_payment_first": false
        }
    ]
}
```

---

## User Request Management API

### GET `/user/request/api/check-request-allowed`
Check if requesting is allowed at current time.

**Response (Success - 200):**
```json
{
    "allowed": true
}
```

### GET `/user/request/api/request`
Get request page data including student info, documents, and admin fee.

**Response (Success - 200):**
```json
{
    "status": "success",
    "student_data": {
        "student_id": "2020-0001",
        "student_name": "John Doe",
        "student_contact": "09123456789",
        "email": "john.doe@g.msuiit.edu.ph",
        "college_code": "CCS"
    },
    "documents": [...],
    "admin_fee": 50.00
}
```

### POST `/user/request/api/list-requirements`
Get requirements for selected documents.

**Request Body:**
```json
{
    "document_ids": ["DOC0001", "DOC0002"]
}
```

**Response (Success - 200):**
```json
{
    "success": true,
    "requirements": [
        {
            "requirement_id": "REQ0001",
            "requirement_name": "Valid ID",
            "isCustom": false
        }
    ]
}
```


### POST `/user/request/api/complete-request`
Complete request submission process.

**Request Body:**
```json
{
    "student_info": {
        "full_name": "John Doe",
        "contact_number": "09123456789",
        "email": "john.doe@g.msuiit.edu.ph",
        "college_code": "CCS"
    },
    "documents": [
        {
            "doc_id": "DOC0001",
            "quantity": 1
        }
    ],
    "requirements": [...],
    "total_price": 150.00,
    "admin_fee": 50.00,
    "preferred_contact": "SMS",
    "payment_status": false,
    "remarks": "Request submitted successfully"
}
```

**Response (Success - 200):**
```json
{
    "success": true,
    "request_id": "REQ202401001",
    "notification": "Your request has been completed successfully.",
    "whatsapp_status": "success"
}
```

**Response (Error - 400):**
```json
{
    "error": "Validation Error",
    "message": "Required fields missing or invalid",
    "details": ["student_info.full_name is required", "documents cannot be empty"]
}
```

**Response (Error - 409):**
```json
{
    "error": "Active Request Exists",
    "message": "You already have an active request. Please wait for completion before submitting a new request."
}
```

**Response (Error - 500):**
```json
{
    "error": "Internal Server Error",
    "message": "Failed to submit request. Please try again later."
}
```

### GET `/user/request/api/check-active-requests`
Check for active requests of logged-in student.

**Response (Success - 200):**
```json
{
    "status": "success",
    "active_requests": [...],
    "count": 2
}
```

### POST `/user/request/api/clear-session`
Clear user session and logout.

**Response (Success - 200):**
```json
{
    "message": "Logout successful"
}
```

---

## User Tracking API

### POST `/user/tracking/api/track`
Fetch tracking information and initiate authentication.

**Request Body:**
```json
{
    "tracking_number": "REQ202401001"
}
```

**Response (Success - 200):**
```json
{
    "message": "Tracking data retrieved successfully",
    "role": "user",
    "track_data": {
        "request_id": "REQ202401001",
        "status": "PENDING",
        "full_name": "John Doe",
        "requested_at": "2024-01-15T10:30:00"
    },
    "masked_phone": "1234",
    "student_id": "2020-0001"
}
```

### POST `/user/tracking/api/set-order-type`
Set order type for tracking request.

**Request Body:**
```json
{
    "tracking_number": "REQ202401001",
    "order_type": "pickup"
}
```

### GET `/user/tracking/api/track/status/<tracking_number>`
Get current tracking status.

### GET `/user/tracking/api/track/document/<tracking_number>`
Get requested documents for tracking number.

**Response (Success - 200):**
```json
{
    "message": "Requested documents retrieved successfully",
    "documents": [
        {
            "doc_name": "Transcript of Records",
            "quantity": 1,
            "cost": 100.00
        }
    ]
}
```

### GET `/user/tracking/api/track/changes/<tracking_number>`
Get requested changes for tracking number.

**Response (Success - 200):**
```json
{
    "message": "Requested changes retrieved successfully",
    "changes": [
        {
            "change_id": "CHG001",
            "remarks": "Incorrect date format",
            "wrong_requirements": ["REQ0001"],
            "created_at": "2024-01-16T14:30:00"
        }
    ]
}
```

### POST `/user/tracking/api/track/changes/<tracking_number>/upload`
Upload files for requested changes (only allowed for REJECTED status).

**Content-Type:** `multipart/form-data`

---

## User Payment API

### POST `/user/payment/maya/webhook`
Handle Maya payment webhook notifications.

**Headers:**
- `PayMaya-Signature`: Webhook signature
- `Authorization`: JWT token

### POST `/user/payment/mark-paid`
Manually mark payment as paid.

**Request Body:**
```json
{
    "trackingNumber": "REQ202401001",
    "amount": 150.00,
    "studentId": "2020-0001"
}
```

### POST `/user/payment/mark-document-paid`
Mark specific documents as paid.

**Request Body:**
```json
{
    "trackingNumber": "REQ202401001",
    "amount": 100.00,
    "studentId": "2020-0001",
    "docIds": ["DOC0001", "DOC0002"]
}
```

---

## Admin Authentication API


### POST `/api/admin/google-login`
Google OAuth login for admins.

**Request Body:**
```json
{
    "token": "google_id_token"
}
```

**Response (Success - 200):**
```json
{
    "message": "Admin login successful",
    "role": "admin"
}
```

**Response (Error - 400):**
```json
{
    "error": "Invalid Token",
    "message": "Google OAuth token is invalid or expired"
}
```

**Response (Error - 403):**
```json
{
    "error": "Access Denied",
    "message": "Access restricted to @g.msuiit.edu.ph domain email addresses only"
}
```

**Response (Error - 500):**
```json
{
    "error": "Internal Server Error",
    "message": "Failed to process Google OAuth login"
}
```

### GET `/api/admin/current-user`
Get current authenticated admin information.

**Response (Success - 200):**
```json
{
    "email": "admin@g.msuiit.edu.ph",
    "role": "admin"
}
```

### POST `/api/admin/logout`
Logout current admin.

---

## Admin Dashboard API

### GET `/api/admin/dashboard`
Get admin dashboard statistics and notifications.

**Response (Success - 200):**
```json
{
    "stats": {
        "total_requests": 150,
        "pending_requests": 25,
        "completed_requests": 120,
        "total_revenue": 15000.00
    },
    "notifications": [...],
    "recent_activity": [...]
}
```

---

## Admin Request Management API


### GET `/api/admin/requests`
Get paginated requests with filtering options.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search term
- `college_code`: Filter by college
- `requester_type`: Filter by requester type
- `has_others_docs`: Filter by others documents

**Response (Success - 200):**
```json
{
    "requests": [...],
    "total": 150
}
```

**Response (Error - 400):**
```json
{
    "error": "Invalid Parameters",
    "message": "Invalid query parameters provided",
    "details": ["Invalid page number", "Invalid limit value"]
}
```

**Response (Error - 401):**
```json
{
    "error": "Unauthorized",
    "message": "Admin authentication required"
}
```

### GET `/api/admin/my-requests`
Get requests assigned to current admin.


### PUT `/api/admin/requests/<request_id>/status`
Update request status.

**Request Body:**
```json
{
    "status": "IN-PROGRESS",
    "payment_status": "paid"
}
```

**Valid Statuses:**
- `PENDING`
- `IN-PROGRESS`
- `DOC-READY`
- `RELEASED`
- `REJECTED`

### DELETE `/api/admin/requests/<request_id>`
Delete a request.

### GET `/api/admin/requests/<request_id>`
Get single request details.

### GET `/api/admin/requests/<request_id>/changes`
Get changes for a request.

### POST `/api/admin/requests/<request_id>/changes`
Submit request changes and reject.

**Request Body:**
```json
{
    "wrong_requirements": ["REQ0001"],
    "remarks": "Incorrect requirement provided",
    "file_link": "https://example.com/file.pdf"
}
```

### PUT `/api/admin/requests/<request_id>/documents/<doc_id>/status`
Toggle document completion status.

### PUT `/api/admin/requests/<request_id>/others_documents/<doc_id>/status`
Toggle others document completion status.

### GET `/api/admin/requests/filters`
Get available filter options.

---

## Admin Assignment API

### POST `/api/admin/auto-assign`
Auto-assign requests using load balancing.

**Request Body:**
```json
{
    "number": 5
}
```

### POST `/api/admin/manual-assign`
Manually assign specific requests.

**Request Body:**
```json
{
    "request_ids": ["REQ202401001", "REQ202401002"],
    "admin_id": "admin@g.msuiit.edu.ph"
}
```

### POST `/api/admin/unassign`
Unassign request from admin.

**Request Body:**
```json
{
    "request_id": "REQ202401001",
    "admin_id": "admin@g.msuiit.edu.ph"
}
```

### GET `/api/admin/unassigned-requests`
Get unassigned requests for manual assignment.

### GET `/api/admin/unassigned-requests/filters`
Get filter options for unassigned requests.

### GET `/api/admin/assignment-progress`
Get current admin's assignment progress.

### GET `/api/admin/admins-progress`
Get all admins' assignment progress.


### GET `/api/admin/admin-requests/<admin_id>`
Get requests assigned to specific admin.

### GET `/api/admin/request-admin/<request_id>`
Get the admin information assigned to a specific request.

**Response (Success - 200):**
```json
{
    "admin_id": "admin@g.msuiit.edu.ph"
}
```

### GET `/api/admin/admin-max-requests/<admin_id>`
Get admin's maximum requests limit.

### PUT `/api/admin/admin-max-requests/<admin_id>`
Set admin's maximum requests limit.

**Request Body:**
```json
{
    "max": 15
}
```

---

## Admin Document Management API

### GET `/get-documents`
Get all documents.

**Response (Success - 200):**
```json
[
    {
        "doc_id": "DOC0001",
        "doc_name": "Transcript of Records",
        "description": "Official academic transcript",
        "logo_link": "https://example.com/icon.png",
        "cost": 100.00,
        "requires_payment_first": false
    }
]
```

### GET `/get-documents-with-requirements`
Get documents with their requirements.

### GET `/get-document-requirements`
Get all document requirements mapping.

### GET `/get-document-requirements/<doc_id>`
Get requirements for specific document.

### POST `/add-documents`
Add new document.

**Request Body:**
```json
{
    "doc_name": "Certificate of Enrollment",
    "description": "Official enrollment certificate",
    "cost": 75.00,
    "requirements": ["Valid ID", "Enrollment Form"],
    "requires_payment_first": false
}
```

### PUT `/edit-document/<doc_id>`
Edit existing document.

### DELETE `/delete-document/<doc_id>`
Delete document.

### GET `/get-requirements`
Get all requirements.

### POST `/add-requirement`
Add new requirement.

**Request Body:**
```json
{
    "requirement_name": "Valid ID"
}
```

### PUT `/edit-requirement/<req_id>`
Edit requirement name.

### DELETE `/delete-requirement/<req_id>`
Delete requirement.

### GET `/check-req-exist/<req_id>`
Check if requirement is linked to requests.

**Response:**
```json
{
    "exists": true,
    "count": 5
}
```

### GET `/check-req/<req_id>`
Check requirement usage in requests and documents.

**Response:**
```json
{
    "in_requests": {"exists": true, "count": 3},
    "in_documents": {"exists": true, "count": 2}
}
```

### GET `/check-doc-exist/<doc_id>`
Check if document is linked to requests.

### PATCH `/hide-document/<doc_id>`
Hide document from user view.

### PATCH `/toggle-hide-document/<doc_id>`
Toggle document hidden status.

---

## Admin Transaction API

### GET `/api/admin/transactions`
 with filtering.

Get paginated transactions**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `start_date`: Start date filter (YYYY-MM-DD)
- `end_date`: End date filter (YYYY-MM-DD)
- `search`: Search term
- `sort`: Sort order (asc/desc)

**Response (Success - 200):**
```json
{
    "transactions": [...],
    "total": 150,
    "total_pages": 8
}
```

### GET `/api/admin/transactions/summary`
Get transaction summary statistics.

**Response (Success - 200):**
```json
{
    "total_paid_amount": 15000.00,
    "total_transactions": 100,
    "paid_transactions": 80,
    "unpaid_transactions": 20
}
```

---

## Admin Settings API

### GET `/api/admin/settings`
Get current request time restrictions.

**Response (Success - 200):**
```json
{
    "start_time": "09:00",
    "end_time": "17:00",
    "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
}
```

### PUT `/api/admin/settings`
Update request time restrictions.

**Request Body:**
```json
{
    "start_time": "08:00",
    "end_time": "18:00",
    "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
}
```

### GET `/api/admin/settings/fee`
Get current admin fee.

**Response (Success - 200):**
```json
{
    "admin_fee": 50.00
}
```

### PUT `/api/admin/settings/fee`
Update admin fee.

**Request Body:**
```json
{
    "admin_fee": 75.00
}
```

### GET `/api/admin/admins`
Get all admins (same as authentication endpoint).

### POST `/api/admin/admins`
Add new admin.

**Request Body:**
```json
{
    "email": "newadmin@g.msuiit.edu.ph",
    "role": "admin"
}
```

### PUT `/api/admin/admins/<email>`
Update admin role.

### DELETE `/api/admin/admins/<email>`
Delete admin.

---

## Admin Logs API

### GET `/api/admin/logs`
Get all system logs.

**Response (Success - 200):**
```json
{
    "logs": [
        {
            "log_id": "LOG001",
            "timestamp": "2024-01-15T10:30:00",
            "admin_id": "admin@g.msuiit.edu.ph",
            "action": "Updated request status",
            "details": "Changed status from PENDING to IN-PROGRESS"
        }
    ]
}
```

---

## WhatsApp Integration API

### POST `/whatsapp/send_template`
Send WhatsApp message template.

**Request Body:**
```json
{
    "phone_number": "+639123456789",
    "template_name": "odr_request_submitted",
    "components": [
        {
            "type": "body",
            "parameters": [
                {"type": "text", "text": "John Doe"},
                {"type": "text", "text": "REQ202401001"}
            ]
        }
    ]
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
    "error": "Invalid request data",
    "message": "Missing required field: student_id"
}
```

### 401 Unauthorized
```json
{
    "error": "Unauthorized",
    "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
    "error": "Forbidden",
    "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
    "error": "Not Found",
    "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
    "error": "Internal Server Error",
    "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

- **User endpoints**: 100 requests per minute per IP
- **Admin endpoints**: 1000 requests per minute per IP
- **Authentication endpoints**: 5 requests per minute per IP

---

## Webhook Security

Payment webhooks from Maya include signature verification:
- Signature header: `PayMaya-Signature`
- Verified using HMAC-SHA256 with secret key
- Only accepts requests from Maya sandbox IPs

---

## Data Models

### Request Status Flow
```
PENDING → IN-PROGRESS → DOC-READY → RELEASED
    ↓
  REJECTED (can be resubmitted)
```

### Document Status
- `hidden`: Boolean flag to hide from users
- `requires_payment_first`: Boolean flag for payment requirement
- `cost`: Document price in PHP

### User Roles
- `user`: Students and outsiders
- `admin`: System administrators
- `none`: Pending approval admin

---

## Environment Variables

Required environment variables:
- `FLASK_SECRET_KEY`: Flask secret key
- `JWT_SECRET_KEY`: JWT signing secret
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `MAYA_SECRET_KEY`: Maya webhook secret key
- `MAYA_DISABLE_SECURITY`: Disable webhook security (development only)

---

## Testing

For development and testing:
1. Use `MAYA_DISABLE_SECURITY=true` to bypass webhook security
2. Test authentication with valid student IDs from the school database
3. Use Google OAuth with @g.msuiit.edu.ph domain emails for admin access
4. WhatsApp messages require valid phone numbers with country codes

---

*Last updated: January 2024*
*API Version: 1.0*
