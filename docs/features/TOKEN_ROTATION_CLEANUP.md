# Token Rotation Cleanup - Complete! ✅

## What Changed

### Removed Duplicate Mutation
- ❌ **Removed:** `rotateUserToken(input: RotateTokenInput!)` 
- ✅ **Kept:** `secureRotateUserToken(input: SecureRotateTokenInput!)`

### Why?
The old `rotateUserToken` mutation accepted `userId` as input, which is **insecure** because:
- Mobile apps should never send userId
- Opens door for userId manipulation
- Breaks multi-device isolation

The new `secureRotateUserToken` mutation is secure:
- Takes `currentToken` + `deviceId` only
- Extracts userId FROM the token (not from input)
- Validates session exists and is active
- Works per-device (multi-device safe)

---

## Changes Made

### 1. Removed from GraphQL Schema (`typeDefs.ts`)

**Removed:**
```graphql
# DEPRECATED: Use SecureRotateTokenInput instead
input RotateTokenInput {
  userId: ID!  # ⚠️ INSECURE - For admin use only
}

extend type Mutation {
  rotateUserToken(input: RotateTokenInput!): RotateTokenResult!
}
```

**Kept:**
```graphql
input SecureRotateTokenInput {
  currentToken: String!
  deviceId: String!
}

extend type Mutation {
  secureRotateUserToken(input: SecureRotateTokenInput!): RotateTokenResult!
}
```

### 2. Renamed Resolver (`tokenRotation.ts`)

**Before:**
```typescript
Mutation: {
  rotateUserToken: async (_, { input }) => { ... }
}
```

**After:**
```typescript
Mutation: {
  secureRotateUserToken: async (_, { input }) => { ... }
}
```

---

## Mobile App Update Required

### Old Code (❌ Remove This):
```graphql
mutation {
  rotateUserToken(input: {
    userId: "123"  # ❌ INSECURE!
  }) {
    success
    token
  }
}
```

### New Code (✅ Use This):
```graphql
mutation {
  secureRotateUserToken(input: {
    currentToken: "eyJhbGc..."  # Current JWT
    deviceId: "device_123"      # Device ID
  }) {
    success
    token
    message
  }
}
```

---

## Security Benefits

### Before (Insecure):
1. Mobile sends: `{ userId: "123" }`
2. Attacker could try: `{ userId: "456" }` (access another user's token!)
3. No device validation
4. No token validation

### After (Secure):
1. Mobile sends: `{ currentToken: "jwt...", deviceId: "device_123" }`
2. Backend extracts userId FROM token (can't be manipulated)
3. Validates token is valid and active
4. Validates device belongs to that user
5. Validates session exists and not revoked
6. Only affects current device (multi-device safe)

---

## Testing

### Test Secure Token Rotation
```bash
# Get token from login
curl -X POST http://localhost:8080/api/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { login(input: { username: \"user\", password: \"pass\", deviceId: \"device1\", deviceName: \"iPhone\", context: MOBILE_BANKING }) { token } }"
  }'

# Save the token, then rotate it
curl -X POST http://localhost:8080/api/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { secureRotateUserToken(input: { currentToken: \"TOKEN_FROM_ABOVE\", deviceId: \"device1\" }) { success token message } }"
  }'
```

---

## Migration Notes

⚠️ **Breaking Change for Mobile Apps:**
- Old `rotateUserToken` mutation no longer exists
- Mobile apps must update to use `secureRotateUserToken`
- Update before deploying to production

### Migration Checklist:
1. ✅ Backend updated (schema + resolver)
2. ⏳ Mobile app must update GraphQL query
3. ⏳ Test on staging/dev environment
4. ⏳ Deploy to production (coordinate with mobile release)

---

## Files Modified

1. `lib/graphql/schema/typeDefs.ts` - Removed old mutation + input type
2. `lib/graphql/schema/resolvers/tokenRotation.ts` - Renamed resolver

---

## Current State

✅ **Single, secure token rotation mutation**
✅ **No userId exposure to mobile apps**
✅ **Multi-device safe**
✅ **Session-based validation**

**Token rotation system is now clean and secure!** 🔒
