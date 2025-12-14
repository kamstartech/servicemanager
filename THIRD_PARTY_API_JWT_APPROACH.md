# Third-Party API Key Implementation - JWT Approach (REVISED)

## Overview
Use JWT tokens similar to admin authentication, but for third-party clients. The token embeds client information, permissions, and IP whitelist for verification.

---

## 1. Token-Based Approach

### Why JWT for API Keys?
- ✅ **Stateless**: No database lookup on every request
- ✅ **Self-contained**: All verification data in token
- ✅ **Fast**: Only signature verification needed
- ✅ **IP Verification**: Whitelist embedded in token payload
- ✅ **Expiration**: Built-in expiry handling
- ✅ **Scalable**: No Redis/DB dependency for verification

### Token Format
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 2. Token Payload Structure

```typescript
interface ThirdPartyJWTPayload {
  // Client identification
  clientId: string;
  clientName: string;
  
  // Permissions
  permissions: string[];  // ["registrations:read", "registrations:create"]
  
  // IP whitelist (optional)
  allowedIps?: string[];  // ["192.168.1.100", "10.0.0.0/24"]
  
  // Rate limiting
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
  
  // Standard JWT claims
  iat: number;   // Issued at
  exp: number;   // Expiration
  iss: string;   // Issuer: "service-manager-api"
  sub: string;   // Subject: clientId
  jti: string;   // JWT ID (for revocation tracking)
}
```

---

## 3. Implementation Files

### 3.1 JWT Service for Third-Party
**File:** `/lib/auth/third-party-jwt.ts`

```typescript
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db/prisma";

const JWT_SECRET = process.env.THIRD_PARTY_JWT_SECRET || process.env.JWT_SECRET;
const secret = new TextEncoder().encode(JWT_SECRET);

export interface ThirdPartyJWTPayload {
  clientId: string;
  clientName: string;
  permissions: string[];
  allowedIps?: string[];
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
  iat?: number;
  exp?: number;
  iss?: string;
  sub?: string;
  jti?: string;
}

/**
 * Generate API token for third-party client
 */
export async function generateThirdPartyToken(
  clientId: string,
  expiresIn: string = "1y" // Default: 1 year
): Promise<{ token: string; jti: string }> {
  // Get client details from database
  const client = await prisma.thirdPartyClient.findUnique({
    where: { id: clientId },
  });

  if (!client || !client.isActive) {
    throw new Error("Client not found or inactive");
  }

  // Generate unique JWT ID for revocation tracking
  const jti = crypto.randomUUID();

  // Build payload
  const payload: Omit<ThirdPartyJWTPayload, "iat" | "exp" | "iss" | "sub"> = {
    clientId: client.id,
    clientName: client.name,
    permissions: ["registrations:read", "registrations:create"], // From DB or config
    allowedIps: client.allowedIps.length > 0 ? client.allowedIps : undefined,
    rateLimitPerMinute: client.rateLimitPerMinute,
    rateLimitPerHour: client.rateLimitPerHour,
    jti,
  };

  // Sign token
  const token = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("service-manager-api")
    .setSubject(clientId)
    .setJti(jti)
    .setExpirationTime(expiresIn)
    .sign(secret);

  // Store token metadata in database for revocation
  await prisma.thirdPartyApiKey.create({
    data: {
      clientId,
      keyHash: jti, // Store JTI instead of full token hash
      keyPrefix: token.substring(0, 16) + "...",
      name: "API Token",
      permissions: payload.permissions,
      expiresAt: new Date(Date.now() + parseExpiration(expiresIn)),
      status: "ACTIVE",
    },
  });

  return { token, jti };
}

/**
 * Verify third-party API token
 */
export async function verifyThirdPartyToken(
  token: string,
  clientIp: string
): Promise<ThirdPartyJWTPayload | null> {
  try {
    // Verify signature and extract payload
    const { payload } = await jwtVerify(token, secret, {
      issuer: "service-manager-api",
    });

    const decoded = payload as unknown as ThirdPartyJWTPayload;

    // Check if token is revoked (by JTI)
    const apiKey = await prisma.thirdPartyApiKey.findFirst({
      where: {
        keyHash: decoded.jti!,
        status: "ACTIVE",
      },
    });

    if (!apiKey) {
      console.error("Token revoked or not found");
      return null;
    }

    // Verify IP whitelist if configured
    if (decoded.allowedIps && decoded.allowedIps.length > 0) {
      if (!isIpAllowed(clientIp, decoded.allowedIps)) {
        console.error(`IP ${clientIp} not in whitelist`);
        return null;
      }
    }

    // Update last used timestamp
    await prisma.thirdPartyApiKey.update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
      },
    });

    return decoded;
  } catch (error) {
    console.error("Third-party JWT verification failed:", error);
    return null;
  }
}

/**
 * Check if IP is in whitelist (supports CIDR notation)
 */
function isIpAllowed(clientIp: string, allowedIps: string[]): boolean {
  // Exact match
  if (allowedIps.includes(clientIp)) {
    return true;
  }

  // CIDR range check
  for (const allowed of allowedIps) {
    if (allowed.includes("/")) {
      if (ipInCidr(clientIp, allowed)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if IP is in CIDR range
 */
function ipInCidr(ip: string, cidr: string): boolean {
  // Simple implementation - use 'ip-cidr' package for production
  const [range, bits] = cidr.split("/");
  // TODO: Implement proper CIDR checking
  return false;
}

/**
 * Parse expiration string to milliseconds
 */
function parseExpiration(exp: string): number {
  const unit = exp.slice(-1);
  const value = parseInt(exp.slice(0, -1));

  switch (unit) {
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "y":
      return value * 365 * 24 * 60 * 60 * 1000;
    default:
      return 365 * 24 * 60 * 60 * 1000; // Default 1 year
  }
}

/**
 * Revoke token by JTI
 */
export async function revokeThirdPartyToken(jti: string): Promise<void> {
  await prisma.thirdPartyApiKey.updateMany({
    where: { keyHash: jti },
    data: { status: "REVOKED", revokedAt: new Date() },
  });
}
```

### 3.2 Verification Middleware
**File:** `/lib/middleware/verify-third-party-token.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyThirdPartyToken } from "@/lib/auth/third-party-jwt";

export async function verifyThirdPartyRequest(
  request: NextRequest,
  requiredPermissions: string[] = []
): Promise<{ authorized: boolean; response?: NextResponse; clientId?: string }> {
  // Extract token from header
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.substring(7);

  // Get client IP
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Verify token
  const payload = await verifyThirdPartyToken(token, clientIp);
  if (!payload) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      ),
    };
  }

  // Check permissions
  if (requiredPermissions.length > 0) {
    const hasPermission = requiredPermissions.every(
      (perm) =>
        payload.permissions.includes(perm) || payload.permissions.includes("*:*")
    );

    if (!hasPermission) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        ),
      };
    }
  }

  return { authorized: true, clientId: payload.clientId };
}
```

---

## 4. Updated Middleware Configuration

**File:** `/middleware.ts`

```typescript
// Add to publicRoutes array
const thirdPartyRoutes = [
  "/api/registrations/status",
  "/api/registrations", // POST only
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Third-party routes - verify with JWT token, not admin auth
  if (thirdPartyRoutes.some(route => pathname.startsWith(route))) {
    // These routes are handled by endpoint-level verification
    return NextResponse.next();
  }

  // ... rest of existing middleware
}
```

---

## 5. Protected Endpoint Example

**File:** `/app/api/registrations/status/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyThirdPartyRequest } from "@/lib/middleware/verify-third-party-token";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  // Verify third-party token
  const auth = await verifyThirdPartyRequest(request, ["registrations:read"]);
  
  if (!auth.authorized) {
    return auth.response;
  }

  // Token verified, proceed with request
  try {
    const { searchParams } = new URL(request.url);
    const customerNumber = searchParams.get("customer_number");
    // ... rest of implementation

    // Log access (async, don't wait)
    logThirdPartyAccess(auth.clientId!, request, 200).catch(console.error);

    return NextResponse.json({ success: true, data: registration });
  } catch (error) {
    logThirdPartyAccess(auth.clientId!, request, 500).catch(console.error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

---

## 6. Admin API to Generate Tokens

**File:** `/app/api/admin/third-party/clients/[id]/tokens/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { generateThirdPartyToken } from "@/lib/auth/third-party-jwt";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  try {
    const { token, jti } = await generateThirdPartyToken(
      id,
      body.expiresIn || "1y"
    );

    return NextResponse.json({
      success: true,
      data: {
        token, // SHOW ONLY ONCE
        jti,
        message: "Save this token securely. It will not be shown again.",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
```

---

## 7. Key Benefits of JWT Approach

1. **No Database Lookup** - Fast verification (only signature check)
2. **IP Verification Built-in** - Whitelist embedded in token
3. **Permissions in Token** - No separate permission check
4. **Rate Limits in Token** - Middleware knows limits immediately
5. **Revocation via JTI** - Track revoked tokens by JWT ID
6. **Consistent with Admin Auth** - Same pattern as existing system

---

## 8. Database Schema Changes

Keep the models but simplify usage:
- `ThirdPartyClient` - Client info, IP whitelist, rate limits
- `ThirdPartyApiKey` - Store JTI (not token hash) for revocation
- `ThirdPartyAccessLog` - Audit trail

---

## 9. Implementation Checklist

- [ ] Create `/lib/auth/third-party-jwt.ts`
- [ ] Create `/lib/middleware/verify-third-party-token.ts`
- [ ] Update `/middleware.ts` with third-party routes
- [ ] Update `/api/registrations/status/route.ts` with verification
- [ ] Update `/api/registrations/route.ts` with verification
- [ ] Create admin API to generate tokens
- [ ] Add CIDR IP checking library (`ip-cidr`)
- [ ] Create rate limiting wrapper (use token's rate limits)
- [ ] Add access logging
- [ ] Build admin UI for token generation

---

**This approach aligns with your JWT pattern and embeds IP verification directly in the token!**
