# Mobile App Login Test Results

## Summary
✅ **Both WALLET and MOBILE_BANKING contexts are supported for mobile login**

## Login Implementation Analysis

### 1. GraphQL Login Mutation
**Location:** `/lib/graphql/schema/resolvers/auth.ts`

The login resolver supports both contexts through the `LoginInput`:

```graphql
input LoginInput {
  username: String!
  password: String!
  context: MobileUserContext!  # Can be WALLET or MOBILE_BANKING
  deviceId: String!
  deviceName: String!
  ipAddress: String
  location: String
  deviceModel: String
  deviceOs: String
}
```

### 2. Context-Aware User Lookup (Lines 58-68)

```typescript
const user = await prisma.mobileUser.findFirst({
  where: {
    ...(context === "WALLET" 
      ? { phoneNumber: username }  // WALLET uses phoneNumber
      : { username }),              // MOBILE_BANKING uses username
    context: context as any,
    isActive: true,
  },
});
```

**Key Differences:**
- **WALLET**: Uses `phoneNumber` as login identifier
- **MOBILE_BANKING**: Uses `username` as login identifier
- Both require matching `context` field

### 3. Supported Contexts
**From:** `/lib/graphql/schema/typeDefs.ts`

```graphql
enum MobileUserContext {
  MOBILE_BANKING
  WALLET
  VILLAGE_BANKING
  AGENT
  MERCHANT
}
```

### 4. Login Flow

#### ✅ **Existing Device (Active)**
- User logs in with correct credentials
- Device is recognized and active
- **Response:** Immediate login with JWT token and app structure

#### ✅ **First Device**
- User logs in from new device (no existing devices)
- OTP sent via SMS or Email
- **Response:** `requiresVerification: true` with verification token

#### ✅ **Second+ Device**
- User already has an active device
- New device requires admin approval
- **Response:** `devicePending: true` with approval message

### 5. Account Management

Both contexts support multiple accounts per user:

```typescript
// From MobileUserAccount model
context: MobileUserContext  // Can be WALLET or MOBILE_BANKING
accountType: String         // SAVINGS, CURRENT, WALLET, etc.
```

### 6. Response Structure

**Successful Login Returns:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "context": "WALLET" | "MOBILE_BANKING",
    "username": "user@example.com",
    "phoneNumber": "+265888123456",
    "accounts": [...],
    "primaryAccount": {...},
    "profile": {...}
  },
  "token": "jwt-token-here",
  "message": "Login successful",
  "devicePending": false,
  "requiresVerification": false,
  "appStructure": [...]
}
```

**Verification Required:**
```json
{
  "success": true,
  "requiresVerification": true,
  "verificationMethod": "SMS" | "EMAIL",
  "maskedContact": "+265***3456",
  "verificationToken": "uuid",
  "message": "Verification code sent to +265***3456",
  "devicePending": false
}
```

**Approval Required:**
```json
{
  "success": true,
  "requiresApproval": true,
  "message": "Device pending admin approval",
  "devicePending": true,
  "requiresVerification": false
}
```

## Test Examples

### WALLET Login
```graphql
mutation {
  login(input: {
    username: "+265888123456"  # phoneNumber
    password: "123456"
    context: WALLET
    deviceId: "device-uuid"
    deviceName: "Samsung Galaxy S21"
    deviceModel: "SM-G991B"
    deviceOs: "Android 13"
    ipAddress: "192.168.1.100"
    location: "Lilongwe, Malawi"
  }) {
    success
    token
    user {
      id
      context
      phoneNumber
      accounts {
        accountNumber
        accountType
        balance
      }
    }
    appStructure {
      name
      pages {
        name
      }
    }
  }
}
```

### MOBILE_BANKING Login
```graphql
mutation {
  login(input: {
    username: "john.doe@example.com"  # username or email
    password: "securePassword123"
    context: MOBILE_BANKING
    deviceId: "device-uuid"
    deviceName: "iPhone 14 Pro"
    deviceModel: "iPhone14,3"
    deviceOs: "iOS 17"
    ipAddress: "192.168.1.101"
    location: "Blantyre, Malawi"
  }) {
    success
    token
    user {
      id
      context
      username
      accounts {
        accountNumber
        accountType
        balance
      }
    }
  }
}
```

## Security Features

1. **Password Verification:** bcrypt with timing attack prevention
2. **Login Attempt Tracking:** All attempts logged in `DeviceLoginAttempt`
3. **Device Management:** 
   - First device: OTP verification
   - Additional devices: Admin approval required
4. **Session Management:** JWT tokens with device-specific sessions
5. **Failed Login Tracking:** Captures reason, IP, device info

## API Endpoint

**GraphQL Endpoint:** `/api/graphql`
**Method:** `POST`
**Authentication:** Bearer token (after login)
**Rate Limits:**
- Mobile users: 200 requests per 15 minutes
- Unauthenticated: 10 requests per 15 minutes

### cURL Example (WALLET)
```bash
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation Login($input: LoginInput!) { login(input: $input) { success token user { id context phoneNumber accounts { accountNumber accountType balance } } } }",
    "variables": {
      "input": {
        "username": "+265888123456",
        "password": "123456",
        "context": "WALLET",
        "deviceId": "test-device-uuid",
        "deviceName": "Test Device"
      }
    }
  }'
```

### cURL Example (MOBILE_BANKING)
```bash
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation Login($input: LoginInput!) { login(input: $input) { success token user { id context username accounts { accountNumber accountType balance } } } }",
    "variables": {
      "input": {
        "username": "john.doe@example.com",
        "password": "securePassword123",
        "context": "MOBILE_BANKING",
        "deviceId": "test-device-uuid-2",
        "deviceName": "Test Device 2"
      }
    }
  }'
```

## Conclusion

✅ **WALLET Login:** Fully supported using `phoneNumber` as identifier
✅ **MOBILE_BANKING Login:** Fully supported using `username` as identifier
✅ **Device Security:** Multi-device management with verification/approval
✅ **Account Access:** Both contexts return account information and app structure
✅ **Session Management:** JWT tokens with device tracking
✅ **GraphQL API:** Available at `/api/graphql` with rate limiting

Both contexts work through the same login mutation with context-aware user lookup.
