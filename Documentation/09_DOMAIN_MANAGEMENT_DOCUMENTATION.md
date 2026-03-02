# Domain Management Documentation

## Purpose & Overview

The Domain Management system provides administrators with comprehensive control over email domain whitelisting for user authentication and access control. This module enables secure domain-based access restrictions, ensuring that only users from approved institutional or organizational domains can access the system. The domain management functionality integrates seamlessly with the authentication system to enforce domain-based security policies.

## Features

### Domain Whitelist Management
- **Domain Registration**: Add new domains to the approved whitelist with optional descriptions
- **Domain Validation**: Automatic validation of domain format and structure
- **Active/Inactive Status**: Toggle domain status between active and inactive states
- **Bulk Operations**: Manage multiple domains efficiently through bulk operations
- **Domain Search**: Find and retrieve specific domains from the whitelist
- **Duplicate Prevention**: Prevent duplicate domain entries in the whitelist

### Authentication Integration
- **Real-time Domain Checking**: Instant validation of domains during authentication attempts
- **Active Domain Enforcement**: Only active domains are considered valid for authentication
- **Case-Insensitive Matching**: Domain matching is performed case-insensitively
- **Performance Optimization**: Optimized database queries for fast domain validation
- **Error Handling**: Comprehensive error handling for invalid or missing domains

### Administrative Controls
- **Domain Description**: Optional descriptions for each domain for documentation purposes
- **Creation Tracking**: Automatic timestamp tracking for domain creation and updates
- **Audit Trail**: Complete logging of all domain management activities
- **Status Management**: Easy toggling of domain active/inactive status
- **Validation Rules**: Server-side validation for domain format and business rules

### Security Features
- **Input Sanitization**: All domain inputs are properly sanitized and validated
- **SQL Injection Protection**: Parameterized queries prevent SQL injection attacks
- **Access Control**: All domain management requires administrator authentication
- **Activity Logging**: Comprehensive logging of all domain-related activities
- **Error Masking**: Sensitive error information is masked from unauthorized users

## Data Models

### Database Schema

#### domain_whitelist Table
```sql
CREATE TABLE domain_whitelist (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Field Descriptions
- **id**: Unique identifier for each domain entry (Primary Key)
- **domain**: The domain name to be whitelisted (Required, Unique)
- **description**: Optional description explaining the domain's purpose
- **is_active**: Boolean flag indicating if the domain is currently active
- **created_at**: Timestamp of when the domain was added to the whitelist
- **updated_at**: Timestamp of the last modification to the domain entry

#### Indexes
- **Primary Key**: Automatic index on `id` column
- **Unique Index**: Automatic unique constraint on `domain` column
- **Performance Index**: Recommended index on `is_active` for active domain queries

### DomainWhitelist Model Class

#### Core Methods

##### get_all()
**Purpose**: Retrieves all domains from the whitelist with full details
**Returns**: List of domain objects with all fields
**Usage**: Admin interface display of all domains
**Database Query**: 
```sql
SELECT id, domain, description, is_active, created_at, updated_at 
FROM domain_whitelist ORDER BY domain
```

##### get_by_id(domain_id)
**Purpose**: Retrieves a specific domain by its ID
**Parameters**: domain_id (integer)
**Returns**: Domain object or None if not found
**Usage**: Detailed view of specific domain in admin interface
**Database Query**: 
```sql
SELECT id, domain, description, is_active, created_at, updated_at 
FROM domain_whitelist WHERE id = %s
```

##### get_by_domain(domain)
**Purpose**: Retrieves a domain by its domain string
**Parameters**: domain (string)
**Returns**: Domain object or None if not found
**Usage**: Checking for existing domain during creation
**Database Query**: 
```sql
SELECT id, domain, description, is_active, created_at, updated_at 
FROM domain_whitelist WHERE domain = %s
```

##### add(domain, description="", is_active=True)
**Purpose**: Adds a new domain to the whitelist
**Parameters**: 
- domain (string, required): Domain to add
- description (string, optional): Description of the domain
- is_active (boolean, optional): Initial active status
**Returns**: Boolean indicating success
**Usage**: Creating new domain entries
**Database Query**: 
```sql
INSERT INTO domain_whitelist (domain, description, is_active) 
VALUES (%s, %s, %s)
```

##### update(domain_id, domain=None, description=None, is_active=None)
**Purpose**: Updates an existing domain with provided fields
**Parameters**:
- domain_id (integer, required): ID of domain to update
- domain (string, optional): New domain value
- description (string, optional): New description
- is_active (boolean, optional): New active status
**Returns**: Boolean indicating success
**Usage**: Modifying existing domain entries
**Database Query**: Dynamic UPDATE based on provided parameters

##### delete(domain_id)
**Purpose**: Removes a domain from the whitelist
**Parameters**: domain_id (integer)
**Returns**: Boolean indicating success
**Usage**: Removing unwanted or obsolete domains
**Database Query**: 
```sql
DELETE FROM domain_whitelist WHERE id = %s
```

##### is_domain_allowed(domain)
**Purpose**: Checks if a domain is allowed for authentication
**Parameters**: domain (string)
**Returns**: Boolean indicating if domain is allowed
**Usage**: Authentication validation
**Database Query**: 
```sql
SELECT is_active FROM domain_whitelist 
WHERE domain = %s AND is_active = TRUE
```

##### get_active_domains()
**Purpose**: Retrieves all active domains for dropdown/selection
**Returns**: List of active domain strings
**Usage**: Admin interface dropdowns and selections
**Database Query**: 
```sql
SELECT domain FROM domain_whitelist 
WHERE is_active = TRUE ORDER BY domain
```

##### toggle_active_status(domain_id)
**Purpose**: Toggles the active status of a domain
**Parameters**: domain_id (integer)
**Returns**: Boolean indicating success
**Usage**: Quick status changes without full update
**Database Query**: Dynamic UPDATE to toggle boolean status

## Backend Implementation

### Controller Implementation

#### Authentication Requirements
All domain management endpoints require JWT authentication with administrator privileges:
```python
@jwt_required()
```

#### Endpoint Categories

##### Domain Management Endpoints
**Base Path**: `/api/admin/domain-whitelist`

###### GET /api/admin/domain-whitelist
**Purpose**: Retrieves all domains in the whitelist
**Authentication**: Required (JWT)
**Response**: 
```json
{
    "domains": [
        {
            "id": 1,
            "domain": "example.edu",
            "description": "University domain",
            "is_active": true,
            "created_at": "2024-01-01 12:00:00",
            "updated_at": "2024-01-01 12:00:00"
        }
    ]
}
```

###### GET /api/admin/domain-whitelist/{domain_id}
**Purpose**: Retrieves a specific domain by ID
**Authentication**: Required (JWT)
**Parameters**: domain_id (integer in URL)
**Response**: Domain object or 404 error

###### POST /api/admin/domain-whitelist
**Purpose**: Adds a new domain to the whitelist
**Authentication**: Required (JWT)
**Request Body**:
```json
{
    "domain": "newdomain.com",
    "description": "New organizational domain",
    "is_active": true
}
```
**Response**: Success message or error

###### PUT /api/admin/domain-whitelist/{domain_id}
**Purpose**: Updates an existing domain
**Authentication**: Required (JWT)
**Request Body**: Any subset of domain, description, is_active
**Response**: Success message or error

###### DELETE /api/admin/domain-whitelist/{domain_id}
**Purpose**: Deletes a domain from the whitelist
**Authentication**: Required (JWT)
**Parameters**: domain_id (integer in URL)
**Response**: Success message or 404 error

###### PATCH /api/admin/domain-whitelist/{domain_id}/toggle
**Purpose**: Toggles the active status of a domain
**Authentication**: Required (JWT)
**Parameters**: domain_id (integer in URL)
**Response**: Success message or error

###### GET /api/admin/domain-whitelist/active
**Purpose**: Retrieves all active domains for selection purposes
**Authentication**: Required (JWT)
**Response**: 
```json
{
    "active_domains": ["example.edu", "organization.org"]
}
```

##### Public Domain Checking Endpoint
**Base Path**: `/api/public/domain-check`

###### GET /api/public/domain-check/{domain}
**Purpose**: Public endpoint to check if a domain is allowed
**Authentication**: Not required
**Parameters**: domain (string in URL)
**Response**: 
```json
{
    "domain": "example.edu",
    "is_allowed": true
}
```

### Error Handling

#### Common Error Responses
- **400 Bad Request**: Invalid input data or missing required fields
- **404 Not Found**: Domain not found for specified operations
- **500 Internal Server Error**: Database or server errors

#### Validation Rules
- **Domain Format**: Must contain at least one dot (.) character
- **Domain Length**: Maximum 255 characters
- **Required Fields**: Domain is required for creation
- **Unique Constraint**: Domain names must be unique in the whitelist

#### Logging
All domain management activities are logged:
- Domain creation: `Domain {domain} added to whitelist`
- Domain updates: `Domain {domain_id} updated`
- Domain deletion: `Domain {domain_id} deleted from whitelist`
- Status toggles: `Domain {domain_id} status toggled`

## Frontend Integration

### API Service Layer
The frontend should implement a domain service for API communication:

```javascript
class DomainService {
    // Get all domains
    async getAllDomains() {
        const response = await fetch('/api/admin/domain-whitelist', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.json();
    }

    // Add new domain
    async addDomain(domainData) {
        const response = await fetch('/api/admin/domain-whitelist', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(domainData)
        });
        return response.json();
    }

    // Update domain
    async updateDomain(domainId, updateData) {
        const response = await fetch(`/api/admin/domain-whitelist/${domainId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        return response.json();
    }

    // Delete domain
    async deleteDomain(domainId) {
        const response = await fetch(`/api/admin/domain-whitelist/${domainId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.json();
    }

    // Toggle domain status
    async toggleDomainStatus(domainId) {
        const response = await fetch(`/api/admin/domain-whitelist/${domainId}/toggle`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.json();
    }

    // Get active domains
    async getActiveDomains() {
        const response = await fetch('/api/admin/domain-whitelist/active', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.json();
    }

    // Check domain (public)
    async checkDomain(domain) {
        const response = await fetch(`/api/public/domain-check/${domain}`);
        return response.json();
    }
}
```

### UI Components

#### Domain Management Interface
- **Domain List Table**: Display all domains with sorting and filtering
- **Add Domain Form**: Modal or inline form for adding new domains
- **Edit Domain Interface**: In-place editing or modal for domain updates
- **Status Toggle**: Quick toggle buttons for active/inactive status
- **Delete Confirmation**: Confirmation dialogs for domain deletion
- **Bulk Operations**: Checkbox selection for bulk status changes

#### Domain Validation Display
- **Validation Feedback**: Real-time validation feedback for domain input
- **Duplicate Detection**: Warning messages for duplicate domains
- **Format Validation**: Visual indicators for valid/invalid domain formats
- **Status Indicators**: Clear indicators of domain active/inactive status

### Authentication Integration

#### Login Form Domain Validation
```javascript
// Example integration with authentication system
const validateDomain = async (email) => {
    const domain = email.split('@')[1];
    if (!domain) return false;
    
    try {
        const result = await domainService.checkDomain(domain);
        return result.is_allowed;
    } catch (error) {
        console.error('Domain validation error:', error);
        return false;
    }
};
```

## Security Considerations

### Input Validation
- **Domain Format**: Server-side validation for proper domain format
- **SQL Injection**: Parameterized queries prevent SQL injection
- **XSS Prevention**: Proper output encoding and sanitization
- **Length Limits**: Enforced maximum length for all string inputs

### Access Control
- **Authentication Required**: All admin endpoints require valid JWT
- **Role-Based Access**: Only administrators can manage domains
- **Session Management**: Proper session handling and token validation
- **Rate Limiting**: Consider implementing rate limiting for domain checks

### Data Protection
- **Audit Logging**: All domain changes are logged for audit purposes
- **Error Masking**: Sensitive information not exposed in error messages
- **Backup Strategy**: Regular backups of domain whitelist data
- **Recovery Procedures**: Procedures for recovering from data corruption

## Usage Examples

### Adding a New Domain
```python
# Backend example
domain_data = {
    "domain": "university.edu",
    "description": "University staff and students",
    "is_active": True
}

result = DomainWhitelist.add(
    domain=domain_data["domain"],
    description=domain_data["description"],
    is_active=domain_data["is_active"]
)
```

### Checking Domain Authorization
```python
# Authentication system integration
def authenticate_user(email, password):
    domain = email.split('@')[1]
    
    if not DomainWhitelist.is_domain_allowed(domain):
        raise AuthenticationError("Domain not authorized")
    
    # Continue with regular authentication
    return validate_credentials(email, password)
```

### Bulk Domain Management
```python
# Example bulk update
domains_to_add = [
    {"domain": "org1.com", "description": "Organization 1"},
    {"domain": "org2.com", "description": "Organization 2"}
]

for domain_info in domains_to_add:
    DomainWhitelist.add(**domain_info)
```

## Best Practices

### Domain Management
1. **Regular Review**: Periodically review active domains and remove obsolete ones
2. **Documentation**: Always provide meaningful descriptions for domain entries
3. **Testing**: Test domain validation with various domain formats
4. **Monitoring**: Monitor domain validation performance and optimize as needed

### Security
1. **Principle of Least Privilege**: Only grant domain management to necessary administrators
2. **Audit Trail**: Regularly review audit logs for unauthorized domain changes
3. **Backup Strategy**: Implement regular backups of domain whitelist data
4. **Incident Response**: Have procedures for handling domain-related security incidents

### Performance
1. **Indexing**: Ensure proper database indexes on frequently queried fields
2. **Caching**: Consider caching active domains for improved performance
3. **Connection Pooling**: Use database connection pooling for better performance
4. **Query Optimization**: Monitor and optimize slow database queries

### Maintenance
1. **Data Integrity**: Regular checks for data integrity and consistency
2. **Error Handling**: Comprehensive error handling and logging
3. **Version Control**: Version control for domain management configuration
4. **Documentation**: Keep documentation updated with changes and procedures

## Troubleshooting

### Common Issues

#### Domain Validation Failures
- **Symptom**: Valid domains are rejected as invalid
- **Cause**: Overly restrictive validation rules
- **Solution**: Review and adjust domain validation regex patterns

#### Performance Issues
- **Symptom**: Slow domain validation responses
- **Cause**: Missing database indexes or inefficient queries
- **Solution**: Add appropriate indexes and optimize queries

#### Authentication Failures
- **Symptom**: Authorized domains are rejected during authentication
- **Cause**: Domain not marked as active or case sensitivity issues
- **Solution**: Check domain status and ensure case-insensitive matching

#### Data Inconsistency
- **Symptom**: Domain data appears inconsistent or corrupted
- **Cause**: Concurrent updates or database corruption
- **Solution**: Implement proper transaction handling and data validation

### Debug Procedures
1. **Check Database**: Verify domain data in database
2. **Review Logs**: Check application logs for errors
3. **Test Endpoints**: Use API testing tools to verify endpoint functionality
4. **Validate Input**: Ensure input data meets validation requirements

## API Reference Summary

### Authentication Endpoints
- `GET /api/admin/domain-whitelist` - Get all domains (Admin required)
- `GET /api/admin/domain-whitelist/{id}` - Get domain by ID (Admin required)
- `POST /api/admin/domain-whitelist` - Add new domain (Admin required)
- `PUT /api/admin/domain-whitelist/{id}` - Update domain (Admin required)
- `DELETE /api/admin/domain-whitelist/{id}` - Delete domain (Admin required)
- `PATCH /api/admin/domain-whitelist/{id}/toggle` - Toggle status (Admin required)
- `GET /api/admin/domain-whitelist/active` - Get active domains (Admin required)

### Public Endpoints
- `GET /api/public/domain-check/{domain}` - Check domain authorization (Public)

### Response Formats
All endpoints return JSON responses with consistent error handling and proper HTTP status codes.

## Integration Guidelines

### With Authentication System
The domain management system integrates with the authentication system through the `is_domain_allowed()` method, which should be called during user login to validate that the user's email domain is authorized.

### With User Interface
The admin interface should provide intuitive controls for domain management, including:
- Easy-to-use forms for adding and editing domains
- Clear status indicators for active/inactive domains
- Confirmation dialogs for destructive operations
- Real-time validation feedback

### With Logging System
All domain management activities should be logged through the application's logging system for audit and debugging purposes.

This documentation provides comprehensive coverage of the domain management implementation, including technical details, usage examples, and integration guidelines for developers and administrators working with the system.
