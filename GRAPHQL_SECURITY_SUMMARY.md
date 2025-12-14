# GraphQL Endpoint Security Analysis

## Current Status: ✅ **PROTECTED** (Mixed Access)

The GraphQL endpoint (`/api/graphql`) **IS protected** by Next.js middleware, but allows **both admin and mobile app access**.

**Access Control:**
- ✅ Admin panel users (context: ADMIN) → Full access
- ✅ Mobile app users (context: MOBILE_BANKING, etc.) → Limited to mobile-specific resolvers
- ❌ Unauthenticated users → Blocked (401 Unauthorized)

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
1. User logs in → receives admin_token cookie (context: ADMIN)
2. Browser sends GraphQL request with cookie
3. Middleware checks admin_token → validates admin context
4. Request reaches GraphQL endpoint → executes
5. Resolver performs admin operation
```

### Mobile App
```
1. User logs in → receives JWT Bearer token (context: MOBILE_BANKING, etc.)
2. App sends GraphQL request with Authorization header
3. Middleware checks Bearer token → validates
4. Request reaches GraphQL endpoint
5. GraphQL context checks device session → provides userId
6. Resolver uses context.userId for user-specific data
```

**Key Difference:**
- Admin resolvers don't check context (middleware already validated ADMIN context)
- Mobile resolvers check `context.userId` (provided by GraphQL context)
- Both can access `/api/graphql` but use different resolvers

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

### Shared Endpoint Architecture

The GraphQL endpoint is **shared** between admin panel and mobile app:

**Why This Works:**
1. **Middleware authenticates ALL requests** (admin or mobile)
2. **Different resolvers for different users:**
   - Admin queries: `appScreens`, `workflows`, `adminWebUsers`, etc.
   - Mobile queries: `myProfile`, `myTransactions`, `myBeneficiaries`, etc.
3. **Context provides mobile user data:**
   - Admin: No context needed (middleware validated ADMIN)
   - Mobile: Context provides `userId`, `deviceId`, `sessionId`
4. **Resolvers enforce their own access:**
   - Admin resolvers assume admin access (via middleware)
   - Mobile resolvers check `context.userId`

**Security Considerations:**
- ⚠️ Mobile users CAN access admin-only queries if not protected
- ✅ Admin resolvers should verify admin context
- ✅ Mobile resolvers already check userId
- ⚠️ Mixed resolver model requires careful access control

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

### 1. ⚠️ **CRITICAL: Separate Admin Context Check**

Currently, mobile users can potentially access admin-only resolvers. Fix:

```typescript
// Update GraphQL context to include admin info
export interface GraphQLContext {
  // Mobile user (from Bearer token + device session)
  userId?: number;
  deviceId?: string;
  sessionId?: string;
  
  // Admin user (from admin_token cookie)
  adminUserId?: number;
  isAdmin?: boolean;
}

// Update createGraphQLContext
export async function createGraphQLContext({ req }): Promise<GraphQLContext> {
  const authHeader = req?.headers?.authorization;
  
  // Check for admin token in cookie (from middleware)
  const adminToken = req?.cookies?.admin_token;
  if (adminToken) {
    const admin = await verifyAdminToken(adminToken);
    if (admin && admin.context === "ADMIN") {
      return {
        adminUserId: admin.userId,
        isAdmin: true,
      };
    }
  }
  
  // Otherwise check for mobile Bearer token
  if (!authHeader?.startsWith("Bearer ")) {
    return {};
  }
  
  // ... existing mobile user logic ...
}
```

### 2. Add Explicit Admin Guards

Protect admin-only resolvers:

```typescript
import { GraphQLError } from "graphql";

function requireAdmin(context: GraphQLContext) {
  if (!context.isAdmin) {
    throw new GraphQLError("Admin access required", {
      extensions: {
        code: "FORBIDDEN",
        http: { status: 403 },
      },
    });
  }
}

// Usage in admin resolvers
async createAppScreen(_parent, args, context) {
  requireAdmin(context); // Throws if not admin
  return await prisma.appScreen.create({ ... });
}
```

### 3. Separate GraphQL Endpoints (Recommended)

Better approach: Split into two endpoints:

**Option A: Separate Routes**
```
/api/graphql/admin  → Admin-only operations
/api/graphql/mobile → Mobile-only operations
```

**Option B: Conditional Schema**
```typescript
const schema = context.isAdmin ? adminSchema : mobileSchema;
```

### 4. Rate Limiting
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

**The GraphQL endpoint has mixed security:**

- ✅ Middleware blocks all unauthenticated requests
- ✅ Admin panel authenticated via admin_token cookie
- ✅ Mobile app authenticated via Bearer token + device session
- ❌ **Mobile users CAN access admin-only resolvers** (no context check)
- ⚠️ Admin resolvers should verify `context.isAdmin`
- ⚠️ Consider separating admin/mobile GraphQL endpoints

**Action Required:**
1. ✅ Update GraphQL context to include admin info
2. ✅ Add `requireAdmin()` guards to admin resolvers
3. ⚠️ Consider separate GraphQL endpoints for better security
4. ✅ Protect admin mutations explicitly

**Current Risk Level: MEDIUM**
- Mobile users authenticated but could access admin operations
- Admin operations not explicitly protected by context
- Relies on middleware only (single layer of defense)
