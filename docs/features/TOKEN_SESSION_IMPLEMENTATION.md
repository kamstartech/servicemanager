# Token Session Management - Complete Implementation ✅

## What We Fixed

### Problem
- Login tokens had no `sessionId` → couldn't track sessions
- Rotated tokens had `sessionId` → inconsistent
- No `DeviceSession` records on login → couldn't revoke tokens
- Token rotation didn't work properly with multi-device

### Solution
Implemented **per-device session tracking** across ALL authentication flows.

---

## Database Changes

### New Table: `DeviceSession`
```prisma
model DeviceSession {
  id             String   @id @default(cuid())
  deviceId       String
  mobileUserId   Int
  
  tokenHash      String   @unique  // SHA256 of JWT
  sessionId      String   @unique  // UUID in JWT payload
  
  isActive       Boolean  @default(true)
  expiresAt      DateTime
  lastActivityAt DateTime @default(now())
  
  ipAddress      String?
  userAgent      String?
  
  createdAt      DateTime @default(now())
  revokedAt      DateTime?
  
  mobileUser     MobileUser @relation(...)
  
  @@map("fdh_device_sessions")
}
```

**Purpose:** Track every active token/session per device

---

## Standardized JWT Payload

### ALL Authentication Flows Now Generate:
```typescript
{
  userId: number,
  username: string,
  phoneNumber: string,
  context: string,
  deviceId: string,
  sessionId: string  // ✅ UUID for session tracking
}
```

### JWT Options (Consistent):
```typescript
{
  expiresIn: JWT_EXPIRES_IN,  // Default: 24h (configurable)
  issuer: "service-manager-admin",
  subject: String(userId)
}
```

---

## Updated Authentication Flows

### 1. Password Login (`auth.ts`) ✅
```typescript
// Login with password
→ Validate credentials
→ Generate sessionId (UUID)
→ Create JWT with sessionId
→ Hash token (SHA256)
→ Create DeviceSession record
→ Return token + user data
```

### 2. OTP Verification (`deviceVerification.ts`) ✅
```typescript
// Verify OTP code
→ Validate OTP
→ Create device
→ Generate sessionId (UUID)
→ Create JWT with sessionId
→ Hash token (SHA256)
→ Create DeviceSession record
→ Return token + user data
```

### 3. Passkey Login (`passkey.ts`) ✅
```typescript
// Login with passkey
→ Verify passkey signature
→ Generate sessionId (UUID)
→ Create JWT with sessionId
→ Hash token (SHA256)
→ Create DeviceSession record
→ Return token
```

### 4. Token Rotation (`tokenRotation.ts`) ✅
```typescript
// Rotate existing token
→ Validate currentToken + deviceId
→ Verify session exists and active
→ Revoke old session
→ Generate new sessionId (UUID)
→ Create new JWT with sessionId
→ Hash new token (SHA256)
→ Create new DeviceSession record
→ Return new token
```

---

## Security Features

### 1. No userId Exposure ✅
- Mobile app never sees or sends userId
- Token rotation uses: `currentToken` + `deviceId`
- userId extracted FROM token, not from input

### 2. Device Verification ✅
- Validates device belongs to user
- Checks device is active
- Ensures device is approved

### 3. Session Tracking ✅
- Every token has corresponding DeviceSession
- Can revoke individual sessions
- Can revoke all user sessions
- Tracks last activity per session

### 4. Multi-Device Support ✅
- Each device has independent sessions
- Rotating token on iPhone doesn't affect iPad
- Can revoke specific device without affecting others

---

## GraphQL API

### Mobile Banking Mutations

#### Secure Token Rotation
```graphql
mutation {
  secureRotateUserToken(input: {
    currentToken: "eyJhbGc..."  # Current JWT
    deviceId: "device_123"      # Device ID
  }) {
    success
    token      # New JWT with new sessionId
    message
  }
}
```

#### Admin Actions
```graphql
# Revoke all sessions for a user (security breach)
mutation {
  revokeAllUserSessions(userId: "123") {
    success
    message  # "Revoked N active sessions"
  }
}

# Revoke specific device sessions (lost device)
mutation {
  revokeDeviceSessions(userId: "123", deviceId: "device_xyz") {
    success
    message  # "Revoked N sessions for device"
  }
}
```

### Queries

#### View Active Sessions
```graphql
query {
  activeSessions(userId: "123") {
    id
    deviceId
    lastActivityAt
    createdAt
    expiresAt
    ipAddress
    userAgent
  }
}
```

---

## Token Lifecycle

### Login → Token → Session
```
1. User logs in
   ↓
2. Generate sessionId (UUID)
   ↓
3. Create JWT with sessionId
   ↓
4. Hash token (SHA256)
   ↓
5. Store in DeviceSession table
   ↓
6. Return token to client
```

### Every API Request
```
1. Client sends JWT in Authorization header
   ↓
2. Backend validates JWT signature
   ↓
3. Extract sessionId from JWT
   ↓
4. Hash token and lookup in DeviceSession
   ↓
5. Check session.isActive = true
   ↓
6. Check session.expiresAt > now
   ↓
7. Update session.lastActivityAt
   ↓
8. Process request
```

### Token Rotation
```
1. Client sends currentToken + deviceId
   ↓
2. Validate current session
   ↓
3. Revoke old session (isActive = false)
   ↓
4. Generate new sessionId + token
   ↓
5. Create new DeviceSession
   ↓
6. Return new token
   ↓
7. Old token no longer works ✅
8. Other devices unaffected ✅
```

### Session Revocation
```
Admin revokes sessions:
   ↓
Update DeviceSession
  SET isActive = false
  WHERE conditions
   ↓
All matching tokens instantly invalid
   ↓
User must re-login
```

---

## Comparison: Before vs After

| Feature | Before ❌ | After ✅ |
|---------|----------|----------|
| **Session Tracking** | None | Full tracking |
| **Token Revocation** | Impossible | Per-device or all |
| **Multi-Device** | Broken | Fully supported |
| **Security** | userId exposed | userId in token only |
| **Consistency** | Different payloads | Standardized |
| **Token Rotation** | Didn't work | Fully functional |

---

## Files Modified

1. ✅ `prisma/schema.prisma` - Added DeviceSession model
2. ✅ `resolvers/auth.ts` - Create session on login
3. ✅ `resolvers/deviceVerification.ts` - Create session on OTP
4. ✅ `resolvers/passkey.ts` - Create session on passkey login
5. ✅ `resolvers/tokenRotation.ts` - Session-based rotation
6. ✅ `resolvers/index.ts` - Register Query resolvers
7. ✅ `typeDefs.ts` - Added session types and mutations

---

## Testing

### Test Token Rotation
```graphql
# 1. Login
mutation {
  login(input: {
    username: "john"
    password: "pass"
    deviceId: "device_1"
    deviceName: "iPhone"
    context: MOBILE_BANKING
  }) {
    token  # Save this
  }
}

# 2. Rotate token
mutation {
  secureRotateUserToken(input: {
    currentToken: "token_from_step_1"
    deviceId: "device_1"
  }) {
    token  # New token
  }
}

# 3. Try old token (should fail)
# Use token from step 1 - should get "Session revoked" error

# 4. Use new token (should work)
# Use token from step 2 - should work fine
```

### Test Multi-Device
```graphql
# Login on iPhone
mutation {
  login(input: { deviceId: "iphone", ... }) {
    token  # token_A
  }
}

# Login on iPad
mutation {
  login(input: { deviceId: "ipad", ... }) {
    token  # token_B
  }
}

# Rotate iPhone token
mutation {
  secureRotateUserToken(input: {
    currentToken: "token_A"
    deviceId: "iphone"
  }) {
    token  # token_C
  }
}

# Result:
# - token_A: Revoked ❌
# - token_B: Still works ✅
# - token_C: Works ✅
```

---

## Migration Steps

1. ✅ Database migration applied (DeviceSession table created)
2. ✅ All login flows updated
3. ✅ Token rotation updated
4. ⚠️ **Existing tokens will fail** (no sessionId)
5. ⚠️ **Users must re-login** after deployment

### Deployment Impact
- **Breaking change**: Existing mobile app tokens become invalid
- **Action required**: Users must login again
- **Reason**: Old tokens don't have sessionId field
- **Communication**: Notify users of maintenance window

---

## Future Enhancements

### Optional Improvements
1. Token refresh endpoint (extend session without re-login)
2. Suspicious activity detection (multiple IPs, unusual times)
3. Session analytics (device usage patterns)
4. Auto-revoke on password change
5. "Logout all other devices" feature for users

---

## Summary

✅ **All authentication flows now consistent**
✅ **Every token tracked in DeviceSession**
✅ **Token rotation works per-device**
✅ **Multi-device fully supported**
✅ **Secure - no userId exposure**
✅ **Revocation works instantly**

**Status:** Production Ready 🚀
