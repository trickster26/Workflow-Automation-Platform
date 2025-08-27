# Credential Management API Documentation

## Overview
The Credential Management API provides secure storage, management, and sharing of credentials for third-party integrations. All credentials are encrypted at rest using AES-256-GCM encryption.

## Base URL
```
/api/credentials
```

## Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Credential Types

### Supported Types
- `api_key` - Simple API key authentication
- `oauth2` - OAuth 2.0 authentication flow
- `basic_auth` - Username/password authentication  
- `database` - Database connection credentials
- `ssh` - SSH connection credentials
- `aws` - Amazon Web Services credentials
- `custom` - Custom credential format

## Endpoints

### 1. Get Credential Types
Get all available credential types and their field definitions.

**Endpoint:** `GET /api/credentials/types`

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "type": "api_key",
      "name": "API Key",
      "description": "Simple API key authentication",
      "testable": true,
      "fields": [
        {
          "name": "apiKey",
          "label": "API Key",
          "type": "password",
          "required": true,
          "encrypted": true,
          "placeholder": "Enter your API key"
        }
      ]
    }
  ]
}
```

### 2. Get Specific Credential Type
Get detailed information about a specific credential type.

**Endpoint:** `GET /api/credentials/types/:type`

**Parameters:**
- `type` (path) - The credential type name

**Response:**
```json
{
  "status": "success",
  "data": {
    "type": "database",
    "name": "Database",
    "description": "Database connection credentials",
    "testable": true,
    "fields": [
      {
        "name": "dbType",
        "label": "Database Type",
        "type": "select",
        "required": true,
        "options": [
          { "value": "mysql", "label": "MySQL" },
          { "value": "postgresql", "label": "PostgreSQL" }
        ]
      }
    ]
  }
}
```

### 3. List User Credentials
Get all credentials owned by or shared with the authenticated user.

**Endpoint:** `GET /api/credentials`

**Query Parameters:**
- `type` (optional) - Filter by credential type
- `tags` (optional) - Comma-separated list of tags to filter by
- `isShared` (optional) - Filter by shared status (true/false)

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "cred_123",
      "name": "Production API",
      "type": "api_key",
      "description": "API key for production environment",
      "isShared": false,
      "isValid": true,
      "lastUsed": "2025-08-24T10:30:00Z",
      "validatedAt": "2025-08-24T09:00:00Z",
      "tags": ["production", "api"],
      "createdAt": "2025-08-01T08:00:00Z",
      "updatedAt": "2025-08-24T09:00:00Z"
    }
  ]
}
```

### 4. Create Credential
Create a new credential.

**Endpoint:** `POST /api/credentials`

**Request Body:**
```json
{
  "name": "My Database Connection",
  "type": "database",
  "description": "Production database credentials",
  "tags": ["production", "database"],
  "data": {
    "dbType": "mysql",
    "host": "db.example.com",
    "port": 3306,
    "username": "admin",
    "password": "secure_password",
    "database": "app_prod"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Credential created successfully",
  "data": {
    "id": "cred_456",
    "name": "My Database Connection",
    "type": "database",
    "description": "Production database credentials",
    "isShared": false,
    "isValid": true,
    "tags": ["production", "database"],
    "createdAt": "2025-08-24T12:00:00Z",
    "updatedAt": "2025-08-24T12:00:00Z"
  }
}
```

### 5. Get Credential Details
Get details of a specific credential (without sensitive data).

**Endpoint:** `GET /api/credentials/:credentialId`

**Parameters:**
- `credentialId` (path) - The credential ID

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "cred_123",
    "name": "Production API",
    "type": "api_key",
    "description": "API key for production environment",
    "isShared": false,
    "sharedWith": [],
    "permissions": ["read", "use"],
    "lastUsed": "2025-08-24T10:30:00Z",
    "validatedAt": "2025-08-24T09:00:00Z",
    "isValid": true,
    "tags": ["production", "api"],
    "createdAt": "2025-08-01T08:00:00Z",
    "updatedAt": "2025-08-24T09:00:00Z"
  }
}
```

### 6. Update Credential
Update an existing credential.

**Endpoint:** `PUT /api/credentials/:credentialId`

**Parameters:**
- `credentialId` (path) - The credential ID

**Request Body:**
```json
{
  "name": "Updated API Credential",
  "description": "Updated description",
  "tags": ["production", "api", "updated"],
  "data": {
    "apiKey": "new_api_key_value"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Credential updated successfully",
  "data": {
    "id": "cred_123",
    "name": "Updated API Credential",
    "type": "api_key",
    "description": "Updated description",
    "isValid": true,
    "tags": ["production", "api", "updated"],
    "updatedAt": "2025-08-24T12:30:00Z"
  }
}
```

### 7. Delete Credential
Delete a credential.

**Endpoint:** `DELETE /api/credentials/:credentialId`

**Parameters:**
- `credentialId` (path) - The credential ID

**Response:**
```json
{
  "status": "success",
  "message": "Credential deleted successfully"
}
```

### 8. Test Credential
Test an existing credential's connectivity.

**Endpoint:** `POST /api/credentials/:credentialId/test`

**Parameters:**
- `credentialId` (path) - The credential ID

**Response:**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "message": "Database connection successful",
    "details": {
      "connectionTime": 150
    }
  }
}
```

### 9. Test Credential Data
Test credential data without saving it.

**Endpoint:** `POST /api/credentials/test`

**Request Body:**
```json
{
  "type": "database",
  "data": {
    "dbType": "mysql",
    "host": "test.example.com",
    "port": 3306,
    "username": "test_user",
    "password": "test_password",
    "database": "test_db"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "message": "MySQL connection successful"
  }
}
```

### 10. Share Credential
Share a credential with other users.

**Endpoint:** `POST /api/credentials/:credentialId/share`

**Parameters:**
- `credentialId` (path) - The credential ID

**Request Body:**
```json
{
  "userIds": ["user_456", "user_789"],
  "permissions": ["read", "use"]
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Credential shared with 2 users",
  "data": {
    "credentialId": "cred_123",
    "sharedWith": ["user_456", "user_789"],
    "permissions": ["read", "use"]
  }
}
```

### 11. Unshare Credential
Remove sharing from a credential.

**Endpoint:** `DELETE /api/credentials/:credentialId/share`

**Parameters:**
- `credentialId` (path) - The credential ID

**Response:**
```json
{
  "status": "success",
  "message": "Credential unshared successfully"
}
```

### 12. Get Decrypted Credential (Internal Use)
Get decrypted credential data for workflow execution. **Use with extreme caution.**

**Endpoint:** `GET /api/credentials/:credentialId/decrypt`

**Parameters:**
- `credentialId` (path) - The credential ID

**Response:**
```json
{
  "status": "success",
  "data": {
    "apiKey": "actual_api_key_value",
    "headerName": "X-API-Key"
  }
}
```

### 13. Get Credential Statistics
Get usage statistics for a credential.

**Endpoint:** `GET /api/credentials/:credentialId/stats`

**Parameters:**
- `credentialId` (path) - The credential ID

**Response:**
```json
{
  "status": "success",
  "data": {
    "credentialId": "cred_123",
    "name": "Production API",
    "type": "api_key",
    "lastUsed": "2025-08-24T10:30:00Z",
    "validatedAt": "2025-08-24T09:00:00Z",
    "isValid": true,
    "isShared": false,
    "sharedWithCount": 0,
    "createdAt": "2025-08-01T08:00:00Z",
    "ageInDays": 23
  }
}
```

## Field Types

### Field Type Definitions
- `text` - Plain text input
- `password` - Password input (masked)
- `textarea` - Multi-line text input
- `select` - Dropdown selection
- `number` - Numeric input

### Field Properties
- `name` - Internal field name
- `label` - Display label
- `type` - Field input type
- `required` - Whether the field is mandatory
- `placeholder` - Placeholder text
- `help` - Help text description
- `encrypted` - Whether the field value is encrypted
- `options` - Available options for select fields

## Security Features

### Encryption
- All sensitive credential data is encrypted using AES-256-GCM
- Encryption keys are derived from environment variables
- Each credential has a unique initialization vector (IV)

### Access Control
- Users can only access their own credentials or shared ones
- Sharing permissions include: `read`, `use`, `admin`
- Credential owners can revoke access at any time

### Validation
- Credentials are automatically tested when possible
- Validation status is tracked and reported
- Failed validations are logged for security monitoring

## Error Responses

### Common Error Codes

**400 Bad Request**
```json
{
  "status": "error",
  "message": "Name, type, and data are required"
}
```

**401 Unauthorized**
```json
{
  "status": "error",
  "message": "Authentication required"
}
```

**404 Not Found**
```json
{
  "status": "error",
  "message": "Credential not found or access denied"
}
```

**500 Internal Server Error**
```json
{
  "status": "error",
  "message": "Failed to retrieve credentials"
}
```

## Best Practices

### Security
1. **Encryption Keys**: Always use secure environment variables for encryption keys
2. **Access Control**: Regularly audit credential sharing permissions
3. **Validation**: Test credentials after creation and periodically thereafter
4. **Rotation**: Implement credential rotation policies

### Usage
1. **Naming**: Use descriptive names and tags for easy identification
2. **Documentation**: Add descriptions explaining credential purpose
3. **Testing**: Always test credentials before deploying to production
4. **Monitoring**: Monitor credential usage and validation status

### Performance
1. **Caching**: Credential data is cached for performance
2. **Batching**: Use bulk operations when possible
3. **Filtering**: Use query parameters to reduce response sizes

## Integration Examples

### Creating an API Key Credential
```javascript
const response = await fetch('/api/credentials', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Slack API Key',
    type: 'api_key',
    description: 'API key for Slack integration',
    tags: ['slack', 'api'],
    data: {
      apiKey: 'xoxb-your-slack-token',
      headerName: 'Authorization'
    }
  })
});
```

### Testing Database Connection
```javascript
const testResult = await fetch('/api/credentials/test', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'database',
    data: {
      dbType: 'postgresql',
      host: 'localhost',
      port: 5432,
      username: 'user',
      password: 'pass',
      database: 'mydb'
    }
  })
});
```

### Sharing a Credential
```javascript
const shareResult = await fetch('/api/credentials/cred_123/share', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userIds: ['user_456'],
    permissions: ['read', 'use']
  })
});
```

## Rate Limiting
- API calls: 100 requests per minute per user
- Credential testing: 10 tests per minute per user
- Bulk operations: 5 requests per minute per user

## Webhook Integration
Credentials can trigger webhooks for the following events:
- `credential.created` - When a new credential is created
- `credential.updated` - When a credential is modified
- `credential.deleted` - When a credential is removed
- `credential.shared` - When a credential is shared
- `credential.test.failed` - When credential validation fails

## Future Enhancements
- OAuth flow automation
- Credential rotation automation  
- Integration with external secret managers
- Audit trail improvements
- Advanced access control policies
- Credential usage analytics