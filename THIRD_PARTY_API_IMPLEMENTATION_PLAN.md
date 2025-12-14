# Third-Party API Key Management System - Implementation Plan

## Overview
Design and implement a secure API key management system for third-party integrations, specifically for the registration status endpoint and future third-party APIs.

---

## 1. Database Schema ✅ (Already Added)

### Models Created:
- **ThirdPartyClient** - Represents external systems/partners
- **ThirdPartyApiKey** - API keys with permissions and rate limits
- **ThirdPartyAccessLog** - Audit trail of all API requests

### Key Features:
- ✅ Client management with contact info
- ✅ Multiple API keys per client
- ✅ Granular permissions system
- ✅ IP whitelisting support
- ✅ Rate limiting configuration
- ✅ Key status management (ACTIVE, SUSPENDED, REVOKED, EXPIRED)
- ✅ Comprehensive access logging

---

## 2. API Key Format

### Key Structure:
```
sk_live_abc123xyz...  (Production)
sk_test_abc123xyz...  (Testing)
```

**Components:**
- `sk` - Secret Key prefix
- `live/test` - Environment indicator
- Random string - Actual key material (32+ characters)

### Storage:
- Store **hashed** keys in database (bcrypt/argon2)
- Store **prefix** for display (first 8 chars)
- Never store or log full keys after creation

---

## 3. Implementation Components

### A. Core Services (Priority: HIGH)

#### 3.1 API Key Management Service
**File:** `/lib/services/api-key-service.ts`

**Functions:**
- `generateApiKey()` - Create new key with proper format
- `hashApiKey()` - Secure hashing (bcrypt)
- `verifyApiKey()` - Compare hashed keys
- `validateKeyPermissions()` - Check if key has required permissions
- `recordKeyUsage()` - Update last used timestamp and usage count
- `revokeApiKey()` - Revoke a key
- `rotateApiKey()` - Create new key, revoke old one

#### 3.2 Rate Limiting Service
**File:** `/lib/services/rate-limiter.ts`

**Features:**
- Redis-based rate limiting
- Per-minute and per-hour limits
- Client-specific limits
- Rate limit headers in responses
- Automatic cleanup of old counters

**Functions:**
- `checkRateLimit(clientId, apiKeyId)` - Verify within limits
- `incrementCounter(clientId, apiKeyId)` - Record request
- `getRemainingQuota(clientId, apiKeyId)` - Get available requests

#### 3.3 Access Logging Service
**File:** `/lib/services/access-logger.ts`

**Functions:**
- `logAccess()` - Record API request/response
- `logError()` - Record failed attempts
- `getClientLogs()` - Retrieve access history
- `generateUsageReport()` - Analytics for clients

---

### B. Middleware (Priority: HIGH)

#### 3.4 API Key Verification Middleware
**File:** `/lib/middleware/verify-api-key.ts`

**Features:**
- Extract API key from header (`X-API-Key` or `Authorization: Bearer`)
- Verify key exists and is valid
- Check key status (ACTIVE)
- Validate key not expired
- Check IP whitelist (if configured)
- Verify permissions for endpoint
- Check rate limits
- Log access attempt

**Error Responses:**
- 401 Unauthorized - Missing/invalid key
- 403 Forbidden - No permission for endpoint
- 429 Too Many Requests - Rate limit exceeded

#### 3.5 Update Next.js Middleware
**File:** `/middleware.ts`

**Changes:**
- Add third-party public routes to exceptions
- Routes like `/api/registrations/status` bypass admin auth
- But must pass through API key verification

---

### C. API Endpoints (Priority: MEDIUM)

#### 3.6 Client Management APIs (Admin Only)

**POST** `/api/admin/third-party/clients`
- Create new third-party client

**GET** `/api/admin/third-party/clients`
- List all clients with pagination

**GET** `/api/admin/third-party/clients/[id]`
- Get client details

**PATCH** `/api/admin/third-party/clients/[id]`
- Update client info, IP whitelist, rate limits

**DELETE** `/api/admin/third-party/clients/[id]`
- Soft delete client (keeps logs)

#### 3.7 API Key Management APIs (Admin Only)

**POST** `/api/admin/third-party/clients/[id]/keys`
- Generate new API key for client
- Returns full key ONCE (must be saved by admin)

**GET** `/api/admin/third-party/clients/[id]/keys`
- List keys for client (shows prefix only)

**PATCH** `/api/admin/third-party/keys/[keyId]`
- Update key status, permissions, expiration

**DELETE** `/api/admin/third-party/keys/[keyId]`
- Revoke API key

**POST** `/api/admin/third-party/keys/[keyId]/rotate`
- Generate replacement key, revoke old one

#### 3.8 Access Logs APIs (Admin Only)

**GET** `/api/admin/third-party/clients/[id]/logs`
- View access logs for client

**GET** `/api/admin/third-party/clients/[id]/analytics`
- Usage statistics, error rates, etc.

---

### D. UI Components (Priority: MEDIUM)

#### 3.9 Admin Pages

**Page:** `/app/(dashboard)/system/third-party/page.tsx`
- List all third-party clients
- Quick stats: active keys, today's requests, error rate
- Create new client button

**Page:** `/app/(dashboard)/system/third-party/[id]/page.tsx`
- Client details
- Manage API keys (generate, revoke, rotate)
- View access logs
- Edit client settings (IP whitelist, rate limits)
- Usage analytics dashboard

**Components:**
- `ThirdPartyClientCard` - Display client info
- `ApiKeyGenerator` - Generate and display new keys
- `ApiKeyList` - Show existing keys with status
- `AccessLogsTable` - Paginated log viewer
- `UsageChart` - Visual analytics

---

### E. Protected Endpoints (Priority: HIGH)

#### 3.10 Update Registration Status Endpoint
**File:** `/app/api/registrations/status/route.ts`

**Add:**
- API key verification at the start
- Access logging
- Rate limit checks
- Permission check: `registrations:read`

#### 3.11 Update Registration Creation Endpoint
**File:** `/app/api/registrations/route.ts`

**Add:**
- API key verification for POST
- Permission check: `registrations:create`
- Access logging with request body
- Rate limit enforcement

---

## 4. Security Considerations

### Key Security:
- ✅ Never log full API keys
- ✅ Hash keys with bcrypt (cost factor 12)
- ✅ Display only key prefix in UI
- ✅ One-time display of full key on creation
- ✅ Automatic expiration support
- ✅ Revocation with audit trail

### Network Security:
- ✅ IP whitelisting (optional per client)
- ✅ HTTPS enforcement
- ✅ Rate limiting per client
- ✅ Request/response size limits

### Access Control:
- ✅ Granular permissions system
- ✅ Endpoint-level authorization
- ✅ Admin-only management APIs
- ✅ Comprehensive audit logging

---

## 5. Permissions Model

### Permission Format:
```
resource:action
```

### Available Permissions:
- `registrations:read` - Check registration status
- `registrations:create` - Create new registrations
- `registrations:list` - List registrations (admin-level)
- `*:*` - Full access (use sparingly)

### Example Key Permissions:
```json
[
  "registrations:read",
  "registrations:create"
]
```

---

## 6. Rate Limiting Strategy

### Default Limits:
- **Per Minute:** 60 requests
- **Per Hour:** 1,000 requests
- **Per Day:** 10,000 requests (optional)

### Custom Limits:
- Configurable per client
- Different limits for different environments (test vs prod)

### Rate Limit Headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1702569600
```

---

## 7. Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
1. ✅ Create database schema
2. Run Prisma migration
3. Create API key service (generate, hash, verify)
4. Create rate limiter service (Redis-based)
5. Create access logger service
6. Create verification middleware

### Phase 2: API Endpoints (Week 1-2)
1. Admin: Create/manage clients
2. Admin: Generate/manage API keys
3. Admin: View access logs
4. Update registration status endpoint
5. Update registration creation endpoint

### Phase 3: UI Development (Week 2)
1. Third-party clients list page
2. Client details/management page
3. API key generation modal
4. Access logs viewer
5. Usage analytics dashboard

### Phase 4: Testing & Documentation (Week 2-3)
1. Unit tests for services
2. Integration tests for APIs
3. API documentation (OpenAPI/Swagger)
4. Client onboarding guide
5. Security audit

### Phase 5: Deployment (Week 3)
1. Database migration (production)
2. Create initial clients and keys
3. Monitor access logs
4. Performance optimization
5. Security hardening

---

## 8. Testing Strategy

### Unit Tests:
- API key generation and verification
- Permission validation
- Rate limit calculations
- Key expiration logic

### Integration Tests:
- Full request flow with API key
- Rate limit enforcement
- IP whitelist validation
- Access logging accuracy

### Security Tests:
- Brute force protection
- Invalid key handling
- Permission bypass attempts
- SQL injection prevention

---

## 9. Monitoring & Alerts

### Metrics to Track:
- API key usage per client
- Rate limit violations
- Failed authentication attempts
- Response times
- Error rates

### Alerts:
- Unusual traffic patterns
- Multiple failed auth attempts
- Rate limit abuse
- Key approaching expiration
- High error rates for specific clients

---

## 10. Documentation Deliverables

### For Developers:
- API key management guide
- Integration examples (cURL, JS, Python)
- Error handling guide
- Best practices

### For Third-Party Clients:
- Getting started guide
- Authentication flow
- Available endpoints
- Rate limits and quotas
- Troubleshooting guide

### For Admins:
- Client onboarding process
- Key rotation procedures
- Monitoring dashboard guide
- Incident response playbook

---

## 11. Migration Path

### Existing Systems:
If any third-party integrations exist:
1. Create clients in new system
2. Generate API keys
3. Provide keys to partners
4. Set grace period for migration
5. Enforce API key requirement
6. Deprecate old authentication method

---

## 12. Future Enhancements

### Phase 2 Features:
- API key scopes (read-only, write-only)
- Webhook callbacks for events
- GraphQL API support
- SDK generation (JS, Python, PHP)
- Self-service client portal
- Advanced analytics dashboard
- Cost tracking per API call
- SLA monitoring

---

## 13. Questions to Answer

1. **Should we allow self-service API key creation?**
   - Or admin-only creation?
   - Consider: Client portal for self-management

2. **What should default rate limits be?**
   - Based on expected usage patterns
   - Different for test vs production keys

3. **How long should API keys be valid?**
   - 90 days? 1 year? Never expire?
   - Force rotation policy?

4. **Should we log request/response bodies?**
   - Privacy concerns with customer data
   - Maybe only for debugging/errors?

5. **Do we need different key types?**
   - Production vs Test keys
   - Read-only vs Full access keys

6. **What endpoints need API key protection?**
   - Just registration endpoints?
   - Future third-party APIs?

---

## 14. Next Steps

**Immediate:**
1. Review and approve this plan
2. Decide on rate limits and expiration policies
3. Run Prisma migration to create tables

**Then:**
1. Implement core services (API key, rate limiter, logger)
2. Create verification middleware
3. Protect registration endpoints
4. Build admin UI
5. Test thoroughly
6. Document everything

---

## Success Criteria

- ✅ Secure API key generation and storage
- ✅ Effective rate limiting prevents abuse
- ✅ Comprehensive audit logging
- ✅ Easy for admins to manage clients/keys
- ✅ Clear documentation for third parties
- ✅ Zero downtime deployment
- ✅ Performance impact < 10ms per request

---

**Created:** 2024-12-14  
**Status:** Planning Phase  
**Owner:** Development Team
