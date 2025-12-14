# Wallet Login Attempts Implementation

## Summary

Added login attempts tracking and viewing functionality for both **Wallet** and **Mobile Banking** contexts in the NextJS admin portal.

## Changes Made

### 1. Fixed Wallet Authentication (Critical Fix)

**File:** `lib/graphql/schema/resolvers/auth.ts`

**Issue:** The login resolver was searching by `username` field for all contexts, but WALLET context users authenticate with `phoneNumber`.

**Fix:**
```typescript
// Before: Always searched by username
const user = await prisma.mobileUser.findFirst({
  where: {
    username,
    context: context as any,
    isActive: true,
  },
});

// After: Context-aware field selection
const user = await prisma.mobileUser.findFirst({
  where: {
    ...(context === "WALLET" 
      ? { phoneNumber: username }
      : { username }),
    context: context as any,
    isActive: true,
  },
});
```

This ensures:
- **WALLET users** authenticate using `phoneNumber` field
- **MOBILE_BANKING users** authenticate using `username` field

---

### 2. Created Login Attempts Component

**File:** `components/users/login-attempts-table.tsx`

A reusable React component that displays login attempt history with:

**Features:**
- Context filtering (WALLET, MOBILE_BANKING, or all)
- Real-time status badges (Success, Failed, Pending OTP, Pending Approval, etc.)
- Device information display (name, model)
- IP address tracking
- Timestamp display
- Failure reason details
- Search functionality
- Responsive table layout

**Status Badge Colors:**
- 🟢 **Success** - default (green)
- 🔴 **Failed** - destructive (red)
- 🟡 **Pending OTP** - secondary (yellow)
- ⚪ **Pending Approval** - outline (gray)
- 🔴 **Device Blocked** - destructive (red)
- 🟡 **Expired** - secondary (yellow)

---

### 3. Created Wallet Login Attempts Page

**File:** `app/wallet/login-attempts/page.tsx`

Route: `/wallet/login-attempts`

Displays login attempts filtered to **WALLET** context only with internationalized titles.

---

### 4. Created Mobile Banking Login Attempts Page

**File:** `app/mobile-banking/login-attempts/page.tsx`

Route: `/mobile-banking/login-attempts`

Displays login attempts filtered to **MOBILE_BANKING** context only.

---

### 5. Added Translations

**Files:**
- `lib/i18n/dictionaries/en.ts` (English)
- `lib/i18n/dictionaries/pt.ts` (Portuguese)

**Added Keys:**
```typescript
wallet: {
  loginAttempts: {
    title: "Wallet Login Attempts",
    searchPlaceholder: "Search by phone number...",
  }
}
```

Portuguese:
```typescript
wallet: {
  loginAttempts: {
    title: "Tentativas de Login da Carteira",
    searchPlaceholder: "Pesquisar por número de telefone...",
  }
}
```

---

## GraphQL Integration

The implementation uses the existing GraphQL resolver:

**Query:** `loginAttempts`
**Resolver:** `lib/graphql/schema/resolvers/loginAttempt.ts`

```graphql
query LoginAttempts($limit: Int, $offset: Int, $status: String, $username: String) {
  loginAttempts(limit: $limit, offset: $offset, status: $status, username: $username) {
    attempts {
      id
      username
      context
      deviceName
      deviceModel
      ipAddress
      status
      failureReason
      attemptedAt
      mobileUser {
        phoneNumber
        customerNumber
      }
    }
    total
  }
}
```

---

## Usage

### Accessing the Pages

1. **Wallet Login Attempts:**
   - Navigate to: `/wallet/login-attempts`
   - Shows only WALLET context attempts

2. **Mobile Banking Login Attempts:**
   - Navigate to: `/mobile-banking/login-attempts`
   - Shows only MOBILE_BANKING context attempts

### Data Displayed

Each login attempt shows:
- **Date & Time** - When the attempt occurred
- **Username/Phone** - Login identifier used
- **Context** - WALLET or MOBILE_BANKING
- **Device** - Device name and model
- **IP Address** - Source IP of the attempt
- **Status** - Visual badge indicating outcome
- **Failure Reason** - Details if login failed

---

## Security Features Tracked

The login attempts table helps monitor:

1. ✅ **Failed login attempts** - Detect brute force attacks
2. ✅ **New device registrations** - Track device approval workflow
3. ✅ **OTP verification flow** - Monitor first-time device setup
4. ✅ **Geographic tracking** - IP addresses of login attempts
5. ✅ **Device fingerprinting** - Track device IDs, names, models
6. ✅ **Temporal patterns** - Identify suspicious login times

---

## Database Schema

Uses the existing `DeviceLoginAttempt` table with fields:
- `mobileUserId` - Links to user
- `username` - Login attempt identifier
- `context` - WALLET or MOBILE_BANKING
- `deviceId`, `deviceName`, `deviceModel` - Device info
- `ipAddress`, `location` - Geographic data
- `status` - Attempt outcome
- `failureReason` - Error details
- `attemptedAt` - Timestamp

---

## Next Steps (Optional Enhancements)

1. **Add filtering by status** - Dropdown to filter by SUCCESS/FAILED/PENDING
2. **Add date range picker** - Filter attempts by date range
3. **Export functionality** - Download attempts as CSV/PDF
4. **Real-time updates** - WebSocket/polling for live updates
5. **Alert system** - Notify admins of suspicious patterns
6. **Geolocation mapping** - Visualize login locations on map

---

## Testing

To verify the implementation:

```bash
# Start the dev server
cd admin
npm run dev

# Navigate to:
http://localhost:3000/wallet/login-attempts
http://localhost:3000/mobile-banking/login-attempts
```

Expected behavior:
- Table displays login attempts filtered by context
- Status badges render with correct colors
- Search filters results by username/phone
- Data updates on refetch
