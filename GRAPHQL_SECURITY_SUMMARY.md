# GraphQL Endpoint Security Analysis

## Current Status: ✅ **PROTECTED**

The GraphQL endpoint (`/api/graphql`) **IS protected** by Next.js middleware.

## How It Works

### 1. **Middleware Protection (Primary)**
Located in: `middleware.ts`

```typescript
// All API routes require authentication
if (!token) {
  if (pathname.startsWith("/api")) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
}
```

**What it checks:**
- ✅ `admin_token` cookie (automatically sent by browser)
- ✅ `Authorization: Bearer <token>` header
- ✅ Token validity using `verifyTokenEdge()`
- ✅ Admin context (`user.context === "ADMIN"`)

**Result:**
- Unauthenticated requests to `/api/graphql` return **401 Unauthorized**
- Request never reaches GraphQL resolvers

### 2. **GraphQL Context (Secondary - Mobile App)**
Located in: `lib/graphql/context.ts`

The GraphQL context provides **mobile user authentication** for mobile app requests:

```typescript
export async function createGraphQLContext({ req }): Promise<GraphQLContext> {
  const authHeader = req?.headers?.authorization;
  
  if (!authHeader?.startsWith("Bearer ")) {
    return {}; // Unauthenticated mobile user
  }
  
  // Verify JWT and check device session
  // Returns { userId, deviceId, sessionId, token }
}
```

**Purpose:**
- Authenticate **mobile app users** via Bearer tokens
- Check device session validity
- Enforce inactivity timeout (5.5 minutes)
- Provide user context to mobile-specific resolvers

**Not used for:**
- ❌ Admin panel authentication (handled by middleware)
- ❌ Admin operations (admin already authenticated via middleware)

## Security Layers

### Layer 1: Middleware (All Requests)
```
Request → Middleware → Check admin_token → 401 or Continue
```

**Protected Routes:**
- All `/api/*` routes
- All dashboard pages
- GraphQL endpoint

**Public Routes:**
- `/login`
- `/forgot-password`
- `/reset-password`
- Auth API routes

### Layer 2: GraphQL Context (Mobile Users)
```
GraphQL Request → Context → Check Bearer token → Empty {} or User Context
```

**Used by:**
- Mobile app queries/mutations
- Resolvers that need `context.userId`

**Not used by:**
- Admin panel (already authenticated via middleware)
- Admin-only resolvers

## Authentication Flow

### Admin Panel (Web)
```
1. User logs in → receives admin_token cookie
2. Browser sends GraphQL request with cookie
3. Middleware checks admin_token → validates
4. Request reaches GraphQL endpoint → executes
5. Resolver performs admin operation
```

### Mobile App
```
1. User logs in → receives JWT Bearer token
2. App sends GraphQL request with Authorization header
3. Middleware checks Bearer token → validates
4. Request reaches GraphQL endpoint
5. GraphQL context checks device session → provides userId
6. Resolver uses context.userId for user-specific data
```

## Resolver Patterns

### Admin Resolvers (No Context Needed)
```typescript
async createAppScreen(_parent, args) {
  // No userId check needed - middleware already authenticated admin
  const screen = await prisma.appScreen.create({ ... });
  return screen;
}
```

### Mobile User Resolvers (Uses Context)
```typescript
async myProfile(_parent, args, context: GraphQLContext) {
  if (!context.userId) {
    throw new GraphQLError("Authentication required");
  }
  
  const user = await prisma.mobileUser.findUnique({
    where: { id: context.userId }
  });
  return user;
}
```

## Security Verification

### Test 1: Unauthenticated Request
```bash
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ appScreens { screens { id } } }"}'
```

**Expected:** `401 Unauthorized` (blocked by middleware)

### Test 2: Invalid Token
```bash
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=invalid" \
  -d '{"query":"{ appScreens { screens { id } } }"}'
```

**Expected:** `401 Unauthorized` (blocked by middleware)

### Test 3: Valid Admin Token
```bash
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=<valid_token>" \
  -d '{"query":"{ appScreens { screens { id } } }"}'
```

**Expected:** `200 OK` with data

## Potential Improvements

### 1. Add Admin Context to GraphQL
Currently, GraphQL context only handles mobile users. We could add admin user info:

```typescript
export interface GraphQLContext {
  // Mobile user
  userId?: number;
  deviceId?: string;
  sessionId?: string;
  
  // Admin user
  adminUserId?: number;
  isAdmin?: boolean;
}
```

### 2. Explicit Auth Guards
Add helper functions for resolvers:

```typescript
// lib/graphql/auth-guard.ts
export function requireAuth(context: GraphQLContext) {
  if (!context.userId) {
    throw new GraphQLError("Authentication required");
  }
}

// Usage in resolver
async myProfile(_parent, args, context) {
  requireAuth(context); // Throws if not authenticated
  return await prisma.mobileUser.findUnique({ ... });
}
```

### 3. Rate Limiting
Add rate limiting to GraphQL endpoint:

```typescript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

### 4. Query Complexity Analysis
Prevent expensive queries:

```typescript
import { createComplexityLimitRule } from "graphql-validation-complexity";

const complexityLimit = createComplexityLimitRule(1000);
```

## Current Configuration

✅ **Middleware protection:** Enabled  
✅ **Cookie-based auth (admin):** Working  
✅ **JWT Bearer auth (mobile):** Working  
✅ **Token verification:** Enabled  
✅ **Context isolation:** Mobile/Admin separated  

⚠️ **GraphQL Playground:** Disabled in production (yoga default)  
⚠️ **Introspection:** Enabled (should disable in production)  

## Recommendations

1. ✅ **Keep current setup** - middleware protection is sufficient
2. ⚠️ **Disable introspection in production**
3. ⚠️ **Add rate limiting** for additional protection
4. ⚠️ **Monitor query complexity** for DoS prevention
5. ✅ **Current mobile context** works well for app

## Summary

**The GraphQL endpoint is properly secured:**

- ✅ Middleware blocks all unauthenticated requests
- ✅ Admin panel authenticated via admin_token cookie
- ✅ Mobile app authenticated via Bearer token + device session
- ✅ No public access to GraphQL endpoint
- ✅ Token verification on every request

**No immediate security concerns** - the current implementation is solid.
