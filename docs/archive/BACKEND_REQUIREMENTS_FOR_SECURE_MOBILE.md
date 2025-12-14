# Backend Requirements for Secure Mobile Implementation

## Overview
Mobile app will send JWT tokens via Authorization headers instead of exposing userId in parameters.

---

## 1. Token Rotation - USE EXISTING SECURE MUTATION

### Current Status
✅ Mutation exists: `secureRotateUserToken`  
✅ Input exists: `SecureRotateTokenInput { currentToken, deviceId }`  
✅ Resolver exists: Full security validation in `tokenRotation.ts`

### What Mobile Will Send

**GraphQL Mutation:**
```graphql
mutation SecureRotateToken($currentToken: String!, $deviceId: String!) {
  secureRotateUserToken(input: { 
    currentToken: $currentToken
    deviceId: $deviceId
  }) {
    success
    token
    message
  }
}
```

**Variables:**
```json
{
  "currentToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "deviceId": "abc123def456"
}
```

### Backend TODO
✅ Already done! Just ensure `secureRotateUserToken` is mapped to the resolver in `tokenRotation.ts`

**Check this in resolvers/index.ts or schema/index.ts:**
```typescript
export const resolvers = {
  Mutation: {
    secureRotateUserToken: tokenRotationResolvers.Mutation.rotateUserToken,
    // ...
  }
}
```

---

## 2. Get User Devices - USE AUTHENTICATION CONTEXT

### Current Status
⚠️ Currently uses: `mobileUserDevices(userId: ID!)`  
🎯 Need: Extract userId from JWT in Authorization header

### What Mobile Will Send

**HTTP Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**GraphQL Query:**
```graphql
query GetMyDevices {
  myDevices {
    id
    name
    model
    os
    deviceId
    credentialId
    isActive
    lastUsedAt
    createdAt
    updatedAt
  }
}
```

**NO variables needed** - userId extracted from JWT!

### Backend TODO

#### Step 1: Ensure GraphQL Context Has Auth (ALREADY DONE ✅)

Context is already set up in `app/api/graphql/route.ts`

#### Step 2: Add New Query Type Definition

**File:** `lib/graphql/schema/typeDefs.ts`

```graphql
extend type Query {
  # Authenticated query - uses JWT from Authorization header
  myDevices: [MobileDevice!]!
}
```

#### Step 3: Add Resolver Using Context

**File:** `lib/graphql/schema/resolvers/passkey.ts` (or create new `devices.ts`)

```typescript
Query: {
  // ... existing queries
  
  async myDevices(_parent: unknown, _args: unknown, context: any) {
    // Extract userId from authenticated context
    const userId = context.userId;
    
    if (!userId) {
      throw new Error("Authentication required");
    }

    try {
      const devices = await prisma.mobileDevice.findMany({
        where: { mobileUserId: userId },
        orderBy: { updatedAt: 'desc' }
      });

      return devices.map(d => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        lastUsedAt: d.lastUsedAt?.toISOString() || null,
        counter: d.counter?.toString() || "0",
      }));
    } catch (error) {
      console.error("Error fetching myDevices:", error);
      throw new Error("Failed to fetch devices");
    }
  }
}
```

---

## 3. Optional: Add Token Validation Query

Mobile may want to validate token before using it.

### Query Definition
```graphql
extend type Query {
  validateToken: TokenValidationResult!
}

type TokenValidationResult {
  valid: Boolean!
  userId: Int
  username: String
  context: String
  expiresAt: String
  message: String
}
```

### Resolver
```typescript
Query: {
  async validateToken(_parent: unknown, _args: unknown, context: any) {
    if (!context.userId) {
      return {
        valid: false,
        message: "Invalid or missing token"
      };
    }

    return {
      valid: true,
      userId: context.userId,
      username: context.user?.username,
      context: context.user?.context,
      message: "Token is valid"
    };
  }
}
```

---

## Summary of Backend Changes Needed

### ✅ Already Done
1. Authentication context in GraphQL route
2. JWT verification logic
3. Secure token rotation mutation and resolver

### 🔧 Need to Add

1. **New Query: `myDevices`**
   - Uses context.userId (no parameters)
   - Returns user's devices
   - Throws error if not authenticated

2. **Map secure mutation** (if not already done)
   - Ensure `secureRotateUserToken` points to existing resolver

3. **Optional: `validateToken` query**
   - Helps mobile verify token validity
   - Returns decoded JWT info

### Files to Modify

1. `lib/graphql/schema/typeDefs.ts`
   - Add `myDevices: [MobileDevice!]!` to Query
   - Optional: Add `validateToken` query

2. `lib/graphql/schema/resolvers/passkey.ts` or new `devices.ts`
   - Add `myDevices` resolver using context
   - Optional: Add `validateToken` resolver

3. `lib/graphql/schema/resolvers/index.ts`
   - Ensure `secureRotateUserToken` is exported
   - Export new resolvers

---

## Testing Backend Changes

### Test Authentication Context
```bash
curl -X POST https://sm.kamstar.tech/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"query": "query { validateToken { valid userId message } }"}'
```

### Test myDevices Query
```bash
curl -X POST https://sm.kamstar.tech/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"query": "query { myDevices { id name model deviceId isActive } }"}'
```

### Test Secure Token Rotation
```bash
curl -X POST https://sm.kamstar.tech/api/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation($token: String!, $device: String!) { secureRotateUserToken(input: { currentToken: $token, deviceId: $device }) { success token message } }",
    "variables": {
      "token": "YOUR_CURRENT_JWT",
      "device": "device123"
    }
  }'
```

---

## Security Benefits

✅ **No userId exposure** - Client never sends userId  
✅ **Token validation** - Backend verifies JWT signature  
✅ **Context-based auth** - Automatic user identification  
✅ **Session tracking** - Database-backed session management  
✅ **Device verification** - Ensures device ownership  
✅ **Tampering prevention** - Can't request other users' data
