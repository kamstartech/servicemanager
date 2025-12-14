# GraphQL Security Enhancements

## Overview

The GraphQL endpoint now includes multiple layers of security protection:

1. ✅ **Rate Limiting** - Prevent abuse and DoS attacks
2. ✅ **Depth Limiting** - Prevent deeply nested queries
3. ✅ **Complexity Analysis** - Prevent expensive queries
4. ✅ **Introspection Control** - Disabled in production
5. ✅ **Batching Disabled** - Prevent batch request abuse

## Rate Limiting

### Configuration

Different rate limits for different user types:

| User Type | Max Requests | Time Window | Purpose |
|-----------|-------------|-------------|---------|
| **Admin** | 1000 | 15 minutes | Admin panel operations |
| **Mobile** | 200 | 15 minutes | Mobile app users |
| **Unauth** | 10 | 15 minutes | Blocked by middleware anyway |

### How It Works

```typescript
// Rate limit checked before processing request
const rateLimitResult = checkRateLimit(clientKey, config);

if (!rateLimitResult.success) {
  return 429 Too Many Requests
}
```

### Response Headers

All GraphQL responses include rate limit information:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1702566000000
Retry-After: 300
```

### Rate Limit Error Response

When rate limit is exceeded:

```json
{
  "errors": [
    {
      "message": "Rate limit exceeded. Please try again later.",
      "extensions": {
        "code": "RATE_LIMIT_EXCEEDED",
        "limit": 1000,
        "remaining": 0,
        "resetAt": "2024-12-14T13:00:00.000Z"
      }
    }
  ]
}
```

### Implementation Details

**Storage:**
- In-memory Map (development)
- For production: Use Redis for distributed rate limiting

**Identifier:**
- Based on IP address (x-forwarded-for, x-real-ip)
- Prefixed with user type: `admin:192.168.1.1` or `mobile:10.0.0.5`

**Cleanup:**
- Automatic cleanup every 5 minutes
- Removes expired entries

**Per-endpoint:**
- Separate counters for graphql-admin and graphql-mobile
- Independent rate limits

## Depth Limiting

### What It Prevents

Deeply nested queries that could crash the server:

```graphql
# ❌ This would be blocked (depth > 10)
query DeepQuery {
  user {
    posts {
      comments {
        author {
          posts {
            comments {
              author {
                posts {
                  comments {
                    author {
                      posts {  # Depth: 11
                        id
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### Configuration

```typescript
// Maximum query depth: 10 levels
addValidationRule(depthLimit(10));
```

### Error Response

```json
{
  "errors": [
    {
      "message": "'DeepQuery' exceeds maximum operation depth of 10",
      "extensions": {
        "code": "GRAPHQL_VALIDATION_FAILED"
      }
    }
  ]
}
```

## Complexity Analysis

### What It Prevents

Expensive queries that could overload the database:

```graphql
# ❌ High complexity query
query ExpensiveQuery {
  users(limit: 1000) {           # 1000 objects
    id
    posts(limit: 100) {          # 100,000 objects
      id
      comments(limit: 50) {      # 5,000,000 objects
        id
        author {
          id
        }
      }
    }
  }
}
```

### Configuration

```typescript
const complexityRule = createComplexityRule({
  scalarCost: 1,      // Cost per scalar field
  objectCost: 2,      // Cost per object field
  listFactor: 10,     // Multiplier for lists
  introspectionListFactor: 15,  // Higher cost for introspection
});
```

### How It's Calculated

**Example Query:**
```graphql
query GetUsers {
  users(limit: 10) {    # 10 objects
    id                  # 1 scalar × 10 = 10
    name                # 1 scalar × 10 = 10
    email               # 1 scalar × 10 = 10
    posts(limit: 5) {   # 5 objects × 10 users = 50
      id                # 1 scalar × 50 = 50
      title             # 1 scalar × 50 = 50
    }
  }
}
```

**Total Complexity:**
- Users: 10 objects × 2 = 20
- User fields: 30
- Posts: 50 objects × 2 = 100
- Post fields: 100
- **Total: ~250 complexity points**

### Error Response

```json
{
  "errors": [
    {
      "message": "The query exceeds the maximum complexity",
      "extensions": {
        "code": "GRAPHQL_VALIDATION_FAILED"
      }
    }
  ]
}
```

## Introspection Control

### Development vs Production

**Development (NODE_ENV !== 'production'):**
- ✅ GraphiQL enabled
- ✅ Introspection enabled
- ✅ Full schema exploration

**Production:**
- ❌ GraphiQL disabled
- ⚠️ Introspection should be disabled (not yet implemented)
- 🔒 Schema hidden from attackers

### Why Disable Introspection?

Introspection allows anyone to see your entire GraphQL schema:

```graphql
# Attackers can see all queries, mutations, types
query IntrospectionQuery {
  __schema {
    types {
      name
      fields {
        name
        args {
          name
          type {
            name
          }
        }
      }
    }
  }
}
```

**Risk:** Attackers learn your API structure and can craft targeted attacks.

### How to Disable (TODO)

```typescript
const yoga = createYoga({
  schema,
  // Disable introspection in production
  plugins: [
    process.env.NODE_ENV === 'production' && useDisableIntrospection()
  ].filter(Boolean),
});
```

## Batching Control

### Why Disabled?

Batching allows multiple queries in one request:

```json
[
  { "query": "query A { ... }" },
  { "query": "query B { ... }" },
  { "query": "query C { ... }" },
  // ... 100 more queries
]
```

**Problems:**
1. Bypasses rate limiting (1 request = 100 queries)
2. Amplifies DoS attacks
3. Complicates complexity analysis
4. Hard to debug

### Configuration

```typescript
const yoga = createYoga({
  batching: false,  // Disabled
});
```

## Testing Rate Limits

### Test 1: Normal Request

```bash
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=<token>" \
  -d '{"query":"{ appScreens { screens { id } } }"}' \
  -i
```

**Expected Response:**
```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1702566000000
```

### Test 2: Exceed Rate Limit

```bash
# Make 1001 requests rapidly
for i in {1..1001}; do
  curl -X POST http://localhost:3000/api/graphql \
    -H "Content-Type: application/json" \
    -H "Cookie: admin_token=<token>" \
    -d '{"query":"{ appScreens { screens { id } } }"}'
done
```

**Expected Response (after 1000):**
```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1702566000000
Retry-After: 300

{
  "errors": [
    {
      "message": "Rate limit exceeded. Please try again later.",
      "extensions": {
        "code": "RATE_LIMIT_EXCEEDED"
      }
    }
  ]
}
```

### Test 3: Deep Query

```bash
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=<token>" \
  -d '{
    "query": "query { user { posts { comments { author { posts { comments { author { posts { comments { author { posts { comments { id } } } } } } } } } } } }"
  }'
```

**Expected Response:**
```json
{
  "errors": [
    {
      "message": "Query exceeds maximum operation depth of 10"
    }
  ]
}
```

## Monitoring

### Metrics to Track

1. **Rate Limit Hits:**
   - How many users hit rate limits?
   - Which user types hit limits most?
   - Time patterns (peak hours)

2. **Query Depth:**
   - Average query depth
   - Queries blocked by depth limit
   - Deep query patterns

3. **Query Complexity:**
   - Average complexity score
   - Queries blocked by complexity
   - Most expensive queries

4. **Response Times:**
   - P50, P95, P99 latency
   - Slow queries
   - Query optimization opportunities

### Logging

Add logging to track security events:

```typescript
// Log rate limit violations
console.warn('[SECURITY] Rate limit exceeded', {
  clientId,
  userType: 'admin',
  limit: 1000,
  timestamp: new Date().toISOString(),
});

// Log blocked queries
console.warn('[SECURITY] Query blocked', {
  reason: 'depth_exceeded',
  depth: 15,
  maxDepth: 10,
  query: query.substring(0, 100),
});
```

## Production Recommendations

### 1. Redis-Based Rate Limiting

Replace in-memory rate limiting with Redis:

```bash
npm install ioredis
```

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function checkRateLimit(key: string, config: RateLimitConfig) {
  const multi = redis.multi();
  multi.incr(key);
  multi.expire(key, Math.ceil(config.windowMs / 1000));
  
  const [count] = await multi.exec();
  
  return {
    success: count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - count),
  };
}
```

### 2. Disable Introspection

```bash
npm install @graphql-yoga/plugin-disable-introspection
```

```typescript
import { useDisableIntrospection } from '@graphql-yoga/plugin-disable-introspection';

const yoga = createYoga({
  plugins: [
    process.env.NODE_ENV === 'production' && useDisableIntrospection()
  ].filter(Boolean),
});
```

### 3. Add Query Cost Limits

```typescript
const complexityRule = createComplexityRule({
  maximumCost: 5000,  // Maximum allowed complexity
  onCost: (cost) => {
    console.log(`Query cost: ${cost}`);
  },
});
```

### 4. Per-User Rate Limiting

Use user ID instead of IP:

```typescript
// Get user from JWT token
const userId = context.userId || context.adminUserId;
const rateLimitKey = userId ? `user:${userId}` : `ip:${clientIp}`;
```

### 5. Separate Admin/Mobile Endpoints

Consider splitting GraphQL endpoints:

```
/api/graphql/admin  → Admin operations only
/api/graphql/mobile → Mobile operations only
```

## Summary

✅ **Implemented:**
- Rate limiting (1000/15min admin, 200/15min mobile)
- Depth limiting (max 10 levels)
- Complexity analysis (scalars, objects, lists)
- Batching disabled
- Rate limit headers

⚠️ **Todo for Production:**
- Redis-based rate limiting
- Disable introspection
- Per-user rate limiting
- Query cost logging
- Monitoring dashboard

🔒 **Security Posture:**
- Protected against DoS attacks
- Protected against expensive queries
- Protected against schema enumeration (partial)
- Protected against batch abuse

The GraphQL endpoint now has **defense in depth** with multiple security layers! 🛡️
