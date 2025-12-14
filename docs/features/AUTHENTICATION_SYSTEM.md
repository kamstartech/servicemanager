# Authentication System Documentation

## Overview
Complete authentication system for FDH Bank Admin Panel with JWT-based authentication, HTTP-only cookies, and route protection.

## Features

✅ **Secure Authentication**
- JWT token-based authentication
- HTTP-only cookies for token storage
- Bcrypt password hashing
- Token expiration (24 hours)
- CSRF protection via SameSite cookies

✅ **Route Protection**
- Next.js middleware for automatic route protection
- Public routes (login, forgot password, reset password)
- Protected dashboard routes
- API route protection

✅ **Session Management**
- Persistent sessions via cookies
- Automatic token verification
- Logout functionality
- Token refresh capability

## API Endpoints

### POST `/api/auth/login`
Authenticate admin user and create session.

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "name": "Admin Name"
  }
}
```

**Response (Error):**
```json
{
  "error": "Invalid email or password"
}
```

**Cookies Set:**
- `admin_token`: JWT token (HTTP-only, SameSite=Lax)

---

### POST `/api/auth/logout`
Logout user and clear session.

**Response:**
```json
{
  "message": "Logout successful"
}
```

**Cookies Cleared:**
- `admin_token`

---

### GET `/api/auth/me`
Get current authenticated user information.

**Requires:** Authentication cookie or Bearer token

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "name": "Admin Name",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### POST `/api/auth/forgot-password`
Request password reset email.

**Request:**
```json
{
  "email": "admin@example.com"
}
```

**Response:**
```json
{
  "message": "If an account exists, a reset link has been sent."
}
```

---

### POST `/api/auth/reset-password`
Reset password with token.

**Request:**
```json
{
  "token": "reset_token_here",
  "password": "new_password"
}
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

## Authentication Flow

### Login Flow
```
1. User enters email/password → POST /api/auth/login
2. Server verifies credentials
3. Server generates JWT token
4. Server sets HTTP-only cookie
5. Client redirects to dashboard
6. Middleware verifies token on each request
```

### Protected Route Access
```
1. User navigates to protected route
2. Middleware checks for admin_token cookie
3. If missing → redirect to /login
4. If present → verify token
5. If invalid → redirect to /login with cleared cookie
6. If valid → allow access
```

### Logout Flow
```
1. User clicks logout → POST /api/auth/logout
2. Server clears admin_token cookie
3. Client redirects to /login
```

## Middleware

### Next.js Middleware (`middleware.ts`)

**Protected Routes:**
- All routes except public routes
- Automatically redirects unauthenticated users to login
- Validates JWT token on every request

**Public Routes:**
- `/login`
- `/forgot-password`
- `/reset-password`
- `/api/auth/*` (auth endpoints)

**Behavior:**
- **Page Routes**: Redirects to `/login?redirect=/original-path`
- **API Routes**: Returns 401 Unauthorized

### API Middleware (`lib/auth/middleware.ts`)

**Functions:**

#### `requireAuth(request)`
Returns authenticated user or null.

```typescript
const user = await requireAuth(request);
if (!user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

#### `withAuth(handler)`
Higher-order function to protect API routes.

```typescript
export const GET = withAuth(async (request, user) => {
  // user is guaranteed to be authenticated
  return NextResponse.json({ userId: user.userId });
});
```

#### `withContextAuth(contexts, handler)`
Protect routes with context validation.

```typescript
export const GET = withContextAuth(['ADMIN'], async (request, user) => {
  // user has ADMIN context
  return NextResponse.json({ data: "admin data" });
});
```

## Client-Side Authentication

### AuthProvider

Wrap your app with `AuthProvider` to access authentication state.

```typescript
import { AuthProvider, useAuth } from "@/components/providers/auth-provider";

// In layout or app
<AuthProvider>
  {children}
</AuthProvider>

// In components
const { user, loading, logout, refreshUser } = useAuth();
```

**Available:**
- `user`: Current user object or null
- `loading`: Loading state
- `logout()`: Logout function
- `refreshUser()`: Refresh user data

### Usage Example

```typescript
"use client";

import { useAuth } from "@/components/providers/auth-provider";

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## JWT Token

### Token Payload
```typescript
interface JWTPayload {
  userId: number;
  username: string;
  context: "ADMIN";
  iat: number;        // Issued at
  exp: number;        // Expiration
  iss: string;        // Issuer
  sub: string;        // Subject (user ID)
}
```

### Token Configuration
- **Secret**: `JWT_SECRET` environment variable
- **Expiration**: 24 hours (configurable via `JWT_EXPIRES_IN`)
- **Issuer**: "service-manager-admin"
- **Algorithm**: HS256 (default)

## Security Features

### Password Security
- ✅ Bcrypt hashing (10 salt rounds)
- ✅ Minimum 8 characters
- ✅ Password reset with time-limited tokens

### Token Security
- ✅ HTTP-only cookies (not accessible via JavaScript)
- ✅ SameSite=Lax (CSRF protection)
- ✅ Secure flag in production
- ✅ 24-hour expiration
- ✅ Signed with secret key

### Session Security
- ✅ Token verification on each request
- ✅ Invalid tokens cleared automatically
- ✅ Expired tokens rejected
- ✅ Active user check

## Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/service_manager
```

## Testing Authentication

### 1. Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jimmykamanga@gmail.com","password":"your_password"}' \
  -c cookies.txt
```

### 2. Test Protected Route
```bash
curl http://localhost:3000/api/auth/me \
  -b cookies.txt
```

### 3. Test Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt \
  -c cookies.txt
```

## Migration from Old Auth

If you have existing users with different password hashing:

1. **Keep old system**: Check both old and new hash
2. **Migrate on login**: Re-hash password on successful login
3. **Force reset**: Require password reset for all users

## Troubleshooting

### "Unauthorized" Error
- Check if `admin_token` cookie exists
- Verify JWT_SECRET is set correctly
- Check token expiration
- Verify user is active in database

### Redirects to Login
- Clear browser cookies
- Check middleware configuration
- Verify token is being sent
- Check console for errors

### Token Verification Fails
- Ensure JWT_SECRET matches between requests
- Check token hasn't expired
- Verify token format is correct
- Check database connection

## Best Practices

### Security
- ✅ Use strong JWT_SECRET (256-bit minimum)
- ✅ Enable HTTPS in production
- ✅ Set secure flag on cookies in production
- ✅ Regularly rotate JWT_SECRET
- ✅ Implement rate limiting on login endpoint
- ✅ Log authentication attempts

### Development
- ✅ Use different JWT_SECRET per environment
- ✅ Keep tokens short-lived (1-24 hours)
- ✅ Implement refresh tokens for longer sessions
- ✅ Add 2FA for additional security
- ✅ Monitor authentication logs

## Future Enhancements

- [ ] Refresh token implementation
- [ ] Two-factor authentication (2FA)
- [ ] Remember me functionality
- [ ] Session management (view/revoke sessions)
- [ ] Rate limiting on auth endpoints
- [ ] Audit logging for auth events
- [ ] Password strength requirements
- [ ] Account lockout after failed attempts

## Support

For issues or questions:
1. Check console logs for errors
2. Verify environment variables
3. Test with curl commands
4. Check database connectivity
5. Review middleware configuration
