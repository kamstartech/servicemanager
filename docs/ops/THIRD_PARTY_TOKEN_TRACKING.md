# Third-Party JWT Token Management - Dynamic Expiry & Tracking

## Overview
Dynamic token expiration with full tracking of all generated tokens per client. Each token can have its own expiration period configured at generation time.

---

## 1. Database Schema (Already in Place ✅)

### ThirdPartyClient Model
- Stores client information, IP whitelist, rate limits
- Has **one-to-many** relationship with ThirdPartyApiKey
- Tracks all tokens generated for the client

### ThirdPartyApiKey Model
- **Tracks each JWT token generated**
- Fields:
  - `keyHash` - Stores JWT ID (jti) for revocation lookup
  - `keyPrefix` - Display prefix (first 16 chars)
  - `name` - User-friendly name ("Production Token", "Test Token")
  - `status` - ACTIVE, SUSPENDED, REVOKED, EXPIRED
  - `expiresAt` - **Dynamic expiration date**
  - `lastUsedAt` - Last time token was used
  - `usageCount` - Total API calls with this token
  - `createdAt` - When token was generated
  - `createdBy` - Admin who generated it

---

## 2. Dynamic Expiration Configuration

### Generation with Custom Expiry

```typescript
// Admin can specify expiration when generating token
const result = await generateThirdPartyToken({
  clientId: "client_123",
  name: "Production API Key",
  expiresIn: "1y",  // 1 year
  permissions: ["registrations:read", "registrations:create"],
  createdBy: adminUserId,
});

// Or different expiration
await generateThirdPartyToken({
  clientId: "client_123",
  name: "Test Key",
  expiresIn: "30d",  // 30 days
  permissions: ["registrations:read"],
  createdBy: adminUserId,
});
```

### Supported Expiration Formats

```typescript
"30d"  // 30 days
"90d"  // 90 days
"6m"   // 6 months (not standard, convert to days: 180d)
"1y"   // 1 year
"2y"   // 2 years
"730d" // Exactly 2 years in days
"never" // No expiration (careful!)
```

---

## 3. Token Generation API

### Admin Endpoint
**POST** `/api/admin/third-party/clients/[id]/tokens`

**Request Body:**
```json
{
  "name": "Production API Token",
  "description": "Main production integration key",
  "expiresIn": "1y",
  "permissions": ["registrations:read", "registrations:create"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenId": "key_abc123xyz",
    "keyPrefix": "eyJhbGciOiJIUzI1...",
    "expiresAt": "2025-12-14T16:17:36.000Z",
    "expiresInDays": 365,
    "warning": "⚠️ Save this token securely. It will not be shown again."
  }
}
```

---

## 4. Token Tracking - List All Tokens for Client

### Admin Endpoint
**GET** `/api/admin/third-party/clients/[id]/tokens`

**Response:**
```json
{
  "success": true,
  "data": {
    "clientId": "client_123",
    "clientName": "External Registration System",
    "tokens": [
      {
        "id": "key_abc123",
        "name": "Production API Token",
        "keyPrefix": "eyJhbGciOiJIUzI1...",
        "status": "ACTIVE",
        "permissions": ["registrations:read", "registrations:create"],
        "createdAt": "2024-12-14T16:17:36.000Z",
        "expiresAt": "2025-12-14T16:17:36.000Z",
        "daysUntilExpiry": 365,
        "lastUsedAt": "2024-12-14T16:17:36.000Z",
        "usageCount": 1523,
        "createdBy": {
          "id": 1,
          "name": "Admin User",
          "email": "admin@example.com"
        }
      },
      {
        "id": "key_xyz789",
        "name": "Test Token",
        "keyPrefix": "eyJhbGciOiJIUzI1...",
        "status": "EXPIRED",
        "permissions": ["registrations:read"],
        "createdAt": "2024-11-14T16:17:36.000Z",
        "expiresAt": "2024-12-14T16:17:36.000Z",
        "daysUntilExpiry": -30,
        "lastUsedAt": "2024-12-10T10:30:00.000Z",
        "usageCount": 243,
        "createdBy": {
          "id": 1,
          "name": "Admin User",
          "email": "admin@example.com"
        }
      }
    ],
    "summary": {
      "total": 2,
      "active": 1,
      "expired": 1,
      "revoked": 0,
      "suspended": 0
    }
  }
}
```

---

## 5. Automatic Expiration Handling

### Token Verification Logic

```typescript
export async function verifyThirdPartyToken(
  token: string,
  clientIp: string
): Promise<ThirdPartyJWTPayload | null> {
  try {
    // 1. Verify JWT signature (includes exp check)
    const { payload } = await jwtVerify(token, secret, {
      issuer: "service-manager-api",
    });

    const decoded = payload as unknown as ThirdPartyJWTPayload;

    // 2. Check database record
    const apiKey = await prisma.thirdPartyApiKey.findFirst({
      where: {
        keyHash: decoded.jti!,
        // Don't check status here - let JWT exp handle it
      },
    });

    if (!apiKey) {
      console.error("Token not found in database");
      return null;
    }

    // 3. Check if manually revoked or suspended
    if (apiKey.status === "REVOKED" || apiKey.status === "SUSPENDED") {
      console.error(`Token ${apiKey.status.toLowerCase()}`);
      return null;
    }

    // 4. Check database expiration (backup check)
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      // Auto-update status to EXPIRED
      await prisma.thirdPartyApiKey.update({
        where: { id: apiKey.id },
        data: { status: "EXPIRED" },
      });
      console.error("Token expired");
      return null;
    }

    // 5. Verify IP whitelist
    if (decoded.allowedIps && decoded.allowedIps.length > 0) {
      if (!isIpAllowed(clientIp, decoded.allowedIps)) {
        console.error(`IP ${clientIp} not in whitelist`);
        return null;
      }
    }

    // 6. Update usage stats (async, don't wait)
    prisma.thirdPartyApiKey.update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
      },
    }).catch(console.error);

    return decoded;
  } catch (error) {
    if (error.code === "ERR_JWT_EXPIRED") {
      console.error("JWT token expired");
      // Could auto-update status here if we have the jti
    }
    console.error("Token verification failed:", error);
    return null;
  }
}
```

---

## 6. Token Lifecycle Management

### States and Transitions

```
ACTIVE (created)
  ↓
  ├─→ SUSPENDED (admin action)
  │     ↓
  │   ACTIVE (admin reactivates)
  │
  ├─→ EXPIRED (time-based)
  │
  └─→ REVOKED (admin action, permanent)
```

### Actions

1. **Generate** - Create new token with custom expiry
2. **Suspend** - Temporarily disable (reversible)
3. **Reactivate** - Enable suspended token
4. **Revoke** - Permanently disable (irreversible)
5. **Auto-Expire** - Automatic when expiration date reached

---

## 7. Expiration Monitoring & Alerts

### Background Job (Cron)
**Run daily** to check expiring tokens

```typescript
// /lib/services/background/check-token-expiration.ts

export async function checkExpiringTokens() {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  // Find tokens expiring in next 30 days
  const expiringTokens = await prisma.thirdPartyApiKey.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: {
        gte: new Date(),
        lte: thirtyDaysFromNow,
      },
    },
    include: {
      client: true,
      createdByUser: {
        select: { email: true, name: true },
      },
    },
  });

  for (const token of expiringTokens) {
    const daysUntilExpiry = Math.ceil(
      (token.expiresAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // Send alert email
    await sendExpirationAlert({
      clientName: token.client.name,
      tokenName: token.name,
      daysUntilExpiry,
      adminEmail: token.createdByUser?.email,
    });
  }

  // Auto-mark expired tokens
  await prisma.thirdPartyApiKey.updateMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });
}
```

### Alert Dashboard Widget

```typescript
// Show in admin dashboard
const expiringTokens = await prisma.thirdPartyApiKey.count({
  where: {
    status: "ACTIVE",
    expiresAt: {
      gte: new Date(),
      lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  },
});

// Display: "⚠️ 3 tokens expiring in next 30 days"
```

---

## 8. Admin UI - Token Management Page

### Client Detail Page
`/app/(dashboard)/system/third-party/clients/[id]/page.tsx`

**Features:**
- List all tokens for client
- Status badges (Active, Expired, Revoked)
- Expiration countdown
- Usage statistics
- Generate new token button
- Revoke/suspend actions

**Token Card Example:**
```
┌─────────────────────────────────────────────────┐
│ 🔑 Production API Token              [ACTIVE] ✅ │
├─────────────────────────────────────────────────┤
│ Token: eyJhbGciOiJIUzI1... [Copy]              │
│ Permissions: registrations:read, registrations:create │
│                                                 │
│ Created: Dec 14, 2024 by Admin User           │
│ Expires: Dec 14, 2025 (365 days remaining) ⏰  │
│ Last used: 2 hours ago                         │
│ Usage: 1,523 requests                          │
│                                                 │
│ [Suspend] [Revoke] [Extend]                   │
└─────────────────────────────────────────────────┘
```

---

## 9. Token Extension Feature

### Extend Token Expiration
**PATCH** `/api/admin/third-party/tokens/[tokenId]/extend`

```json
{
  "additionalTime": "90d" // Add 90 more days
}
```

**Or set new expiration:**
```json
{
  "newExpiresAt": "2026-12-14T16:17:36.000Z"
}
```

**Note:** This doesn't change the JWT itself (immutable), but:
1. Updates database `expiresAt` field
2. **Requires token regeneration** with new expiry in JWT
3. Old token continues to work until JWT expiry
4. New token generated with updated expiration

---

## 10. Implementation Checklist

- [ ] Add `name` and `description` fields to token generation API
- [ ] Implement dynamic `expiresIn` parameter
- [ ] Create endpoint to list all tokens for client
- [ ] Add token usage statistics tracking
- [ ] Implement expiration monitoring cron job
- [ ] Create admin UI for token management
- [ ] Add expiration alerts (email/dashboard)
- [ ] Implement token suspension feature
- [ ] Add token revocation with audit trail
- [ ] Create token extension/renewal feature
- [ ] Add usage analytics per token
- [ ] Implement token lifecycle dashboard

---

## 11. Usage Examples

### Admin Generates Multiple Tokens for One Client

```typescript
// Production token - long-lived
await generateThirdPartyToken({
  clientId: "client_123",
  name: "Production API",
  expiresIn: "1y",
  permissions: ["registrations:read", "registrations:create"],
});

// Test token - short-lived
await generateThirdPartyToken({
  clientId: "client_123",
  name: "Testing Key",
  expiresIn: "30d",
  permissions: ["registrations:read"],
});

// Read-only token
await generateThirdPartyToken({
  clientId: "client_123",
  name: "Monitoring/Analytics",
  expiresIn: "90d",
  permissions: ["registrations:read"],
});
```

All tracked separately in database! 🎯

---

**This approach provides full flexibility with complete token tracking per client.**
