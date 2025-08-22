# Authentication & User Management System

## Overview

The Workflow Automation Platform features a comprehensive authentication and user management system with enterprise-grade security features:

- **JWT-based Authentication** with access and refresh tokens
- **Role-based Access Control** (RBAC) with granular permissions
- **Multi-factor Authentication** using TOTP (Google Authenticator compatible)
- **Session Management** with concurrent session tracking
- **Account Security** with lockout protection and password policies
- **Email Verification** and password reset workflows
- **Admin User Management** with bulk operations

## Architecture

```
Authentication System
├── User Model           - Complete user data with security features
├── Auth Service         - JWT tokens, 2FA, session management
├── Auth Middleware      - Request authentication and authorization
├── Auth Controller      - Authentication endpoints
└── User Controller      - Admin user management
```

## User Roles & Permissions

### Role Types
- **Admin**: Full system access, user management
- **User**: Create and manage own workflows and executions
- **Viewer**: Read-only access to workflows and executions
- **API**: Programmatic access with limited permissions

### Permission System
```typescript
const rolePermissions = {
  admin: ['*'], // All permissions
  user: [
    'workflows:read', 'workflows:create', 'workflows:update', 'workflows:delete',
    'executions:read', 'executions:create', 'executions:cancel',
    'credentials:read', 'credentials:create', 'credentials:update', 'credentials:delete',
    'webhooks:read', 'webhooks:create',
    'profile:read', 'profile:update'
  ],
  viewer: [
    'workflows:read', 'executions:read', 'credentials:read', 
    'webhooks:read', 'profile:read'
  ],
  api: [
    'workflows:read', 'workflows:create', 'workflows:update',
    'executions:read', 'executions:create', 'executions:cancel',
    'webhooks:read', 'webhooks:create'
  ]
};
```

## API Endpoints

### Authentication Endpoints

#### User Registration
```bash
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### User Login
```bash
POST /auth/login
Content-Type: application/json

{
  "identifier": "user@example.com", // email or username
  "password": "SecurePass123!",
  "twoFactorToken": "123456" // optional, required if 2FA enabled
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "status": "active",
    "emailVerified": true,
    "twoFactorEnabled": false
  },
  "tokens": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

#### Token Refresh
```bash
POST /auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "jwt-refresh-token"
}
```

#### Logout
```bash
POST /auth/logout
Authorization: Bearer <access-token>
```

### Profile Management

#### Get User Profile
```bash
GET /auth/profile
Authorization: Bearer <access-token>
```

#### Update Profile
```bash
PUT /auth/profile
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "preferences": {
    "theme": "dark",
    "language": "en",
    "timezone": "America/New_York",
    "notifications": {
      "email": true,
      "browser": true,
      "workflows": true,
      "executions": true,
      "errors": true
    }
  }
}
```

#### Change Password
```bash
POST /auth/change-password
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass456!"
}
```

### Two-Factor Authentication

#### Enable 2FA
```bash
POST /auth/2fa/enable
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Scan the QR code with your authenticator app",
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCodeUrl": "otpauth://totp/...",
  "backupCodes": ["12345678", "87654321", ...]
}
```

#### Confirm 2FA Setup
```bash
POST /auth/2fa/confirm
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "token": "123456"
}
```

#### Disable 2FA
```bash
POST /auth/2fa/disable
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "password": "CurrentPassword123!"
}
```

### Password Reset

#### Request Password Reset
```bash
POST /auth/request-password-reset
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```bash
POST /auth/reset-password/:token
Content-Type: application/json

{
  "password": "NewSecurePass123!"
}
```

### Session Management

#### Get Active Sessions
```bash
GET /auth/sessions
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "sessionId": "session-uuid",
      "createdAt": "2023-12-01T10:00:00Z",
      "lastActive": "2023-12-01T15:30:00Z",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "current": true
    }
  ]
}
```

#### Revoke Session
```bash
DELETE /auth/sessions/:sessionId
Authorization: Bearer <access-token>
```

#### Revoke All Other Sessions
```bash
DELETE /auth/sessions
Authorization: Bearer <access-token>
```

### Admin User Management

#### Get All Users
```bash
GET /users?page=1&limit=20&status=active&role=user&search=john
Authorization: Bearer <admin-token>
```

#### Create User
```bash
POST /users
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "username": "newuser",
  "password": "SecurePass123!",
  "firstName": "New",
  "lastName": "User",
  "role": "user",
  "status": "active"
}
```

#### Update User
```bash
PUT /users/:userId
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "role": "admin",
  "status": "active",
  "firstName": "Updated Name"
}
```

#### Bulk Operations
```bash
POST /users/bulk
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "userIds": ["uuid1", "uuid2"],
  "operation": "suspend" // activate, suspend, deactivate, changeRole
}
```

## Security Features

### Password Policy
- Minimum 8 characters
- Must contain uppercase letter
- Must contain lowercase letter
- Must contain number
- Must contain special character (@$!%*?&)

### Account Lockout
- 5 failed login attempts trigger 30-minute lockout
- Automatic lockout expiration
- Manual unlock by administrators

### Session Security
- JWT tokens with short expiration (15 minutes)
- Refresh tokens with longer expiration (7 days)
- Session tracking and concurrent session management
- Automatic session cleanup

### Two-Factor Authentication
- TOTP-based (Google Authenticator, Authy compatible)
- Backup codes for recovery
- Required for sensitive operations

### Security Headers
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; ...
```

## Development Setup

### Environment Variables
```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=workflow_automation
DB_USER=postgres
DB_PASSWORD=postgres

# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# Optional: Email Configuration (for password reset, verification)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Creating First Admin User

#### Method 1: Direct Database Insert
```sql
INSERT INTO users (
  id, email, username, password, role, status, 
  "emailVerified", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'admin@example.com',
  'admin',
  '$2b$12$encrypted-password-hash',
  'admin',
  'active',
  true,
  NOW(),
  NOW()
);
```

#### Method 2: Registration + Manual Activation
1. Register through `/auth/register`
2. Manually update database to set role to 'admin' and status to 'active'

#### Method 3: Bootstrap Script
```javascript
const { UserModel } = require('./src/models/User.model');

async function createAdminUser() {
  const admin = await UserModel.create({
    email: 'admin@example.com',
    username: 'admin',
    password: 'AdminPass123!',
    firstName: 'System',
    lastName: 'Administrator',
    role: 'admin',
    status: 'active',
    emailVerified: true,
  });
  
  console.log('Admin user created:', admin.email);
}

createAdminUser().catch(console.error);
```

## Usage Examples

### Client-side Authentication Flow

```javascript
class AuthClient {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  async login(identifier, password, twoFactorToken) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password, twoFactorToken }),
    });

    const data = await response.json();
    
    if (data.success && data.tokens) {
      this.accessToken = data.tokens.accessToken;
      this.refreshToken = data.tokens.refreshToken;
      
      localStorage.setItem('accessToken', this.accessToken);
      localStorage.setItem('refreshToken', this.refreshToken);
    }
    
    return data;
  }

  async makeAuthenticatedRequest(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`,
      ...options.headers,
    };

    let response = await fetch(`${this.baseUrl}${url}`, {
      ...options,
      headers,
    });

    // If token expired, try to refresh
    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        // Retry with new token
        headers.Authorization = `Bearer ${this.accessToken}`;
        response = await fetch(`${this.baseUrl}${url}`, {
          ...options,
          headers,
        });
      }
    }

    return response;
  }

  async refreshAccessToken() {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      const data = await response.json();
      
      if (data.success && data.tokens) {
        this.accessToken = data.tokens.accessToken;
        localStorage.setItem('accessToken', this.accessToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    // Refresh failed, redirect to login
    this.logout();
    return false;
  }

  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }
}
```

### Middleware Usage in Routes

```javascript
// Public route
app.get('/api/public', (req, res) => {
  res.json({ message: 'Public endpoint' });
});

// Authenticated route
app.get('/api/profile', 
  AuthMiddleware.authenticate, 
  (req, res) => {
    res.json({ user: req.user.toSafeJSON() });
  }
);

// Permission-based route
app.post('/api/workflows', 
  AuthMiddleware.authenticate,
  AuthMiddleware.requirePermission('workflows:create'),
  WorkflowController.createWorkflow
);

// Admin-only route
app.get('/api/admin/users',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  UserController.getAllUsers
);

// Optional authentication
app.get('/api/workflows',
  AuthMiddleware.optionalAuth, // Sets req.user if token provided
  WorkflowController.getAllWorkflows
);
```

## Testing Authentication

### Unit Tests
```javascript
describe('AuthService', () => {
  test('should register new user', async () => {
    const userData = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'TestPass123!',
    };
    
    const result = await authService.register(userData);
    
    expect(result.user.email).toBe(userData.email);
    expect(result.emailVerificationToken).toBeDefined();
  });

  test('should login with valid credentials', async () => {
    const result = await authService.login('test@example.com', 'TestPass123!');
    
    expect(result.tokens).toBeDefined();
    expect(result.tokens.accessToken).toBeDefined();
  });
});
```

### API Tests
```bash
# Test registration
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"test","password":"TestPass123!"}'

# Test login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test@example.com","password":"TestPass123!"}'

# Test authenticated endpoint
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Security Best Practices

1. **Always use HTTPS in production**
2. **Set secure JWT secrets** (use environment variables)
3. **Implement rate limiting** on authentication endpoints
4. **Log security events** (failed logins, account lockouts)
5. **Regular security audits** of user permissions
6. **Monitor session activities** for suspicious behavior
7. **Use strong password policies**
8. **Implement 2FA for admin accounts**
9. **Regular token rotation** and session cleanup
10. **Secure password reset flows**

---

**Task 7: Implement authentication and user management** is now complete! 

The system provides enterprise-grade authentication with JWT tokens, role-based access control, multi-factor authentication, comprehensive session management, and full admin user management capabilities. 🔐