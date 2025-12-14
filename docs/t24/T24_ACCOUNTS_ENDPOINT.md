# T24 Customer Accounts API - Current Implementation

> ⚠️ **Updated:** 2025-12-13 - This document reflects the current working implementation with pagination and Docker IPv4 fix.

## Endpoint

**URL:** `GET https://fdh-esb.ngrok.dev/esb/customer/accounts/v1/api/{customer_id}`

**Auth:** Basic Auth (username:password)

**Purpose:** Get all accounts belonging to a customer

**Features:**
- ✅ Pagination support (handles 100+ accounts)
- ✅ Docker IPv4 compatibility
- ✅ Background queue for additional pages
- ✅ Full metadata (account ID, category, currency, title)

---

## Current Implementation

### Service File
`lib/services/t24/accounts.ts`

### Key Methods

#### 1. getCustomerAccounts(customerId, pageToken?)
Fetches one page of accounts from T24.

```typescript
const result = await t24AccountsService.getCustomerAccounts("29519407");

// Returns: T24AccountsResponse
{
  header: {
    audit: { T24_time: 640, ... },
    page_start: 1,
    page_token: "202408138121805633.04,99",
    total_size: 37,
    page_size: 99,
    status: "success"
  },
  body: [
    {
      "ACCOUNT.ID": "1010100011629",
      "CUSTOMER.ID": "29519407",
      "CATEGORY": "1001",
      "CURRENCY": "MWK",
      "ACCOUNT.TITLE.1": "Savings Account"
    },
    // ... more accounts
  ]
}
```

#### 2. getCustomerAccountIds(customerId)
Fetches first page and returns metadata.

```typescript
const result = await t24AccountsService.getCustomerAccountIds("29519407");

// Returns:
{
  accountIds: ["1010100011629", "1010100011637", ...],
  hasMore: false,
  nextPageToken: undefined,
  totalSize: 37
}
```

If `hasMore: true`, additional pages are automatically queued for background processing.

#### 3. getAllCustomerAccountIds(customerId)
⚠️ **Use with caution** - Fetches ALL pages synchronously.

```typescript
const allIds = await t24AccountsService.getAllCustomerAccountIds("29519407");
// Returns: ["1010100011629", "1010100011637", ..., "1850002685954"]
// Blocks until all pages fetched
```

---

## Docker Compatibility

### IPv4 Fix Applied ✅

The service uses a custom `fetchIPv4()` wrapper that forces IPv4:

```typescript
import https from "https";

async function fetchIPv4(url: string, options: RequestInit): Promise<Response> {
  // ... implementation with family: 4
}
```

**Why needed:** Node.js `fetch()` prefers IPv6, which doesn't work properly in Docker networks for external HTTPS.

**See:** [T24_DOCKER_IPV6_FIX.md](T24_DOCKER_IPV6_FIX.md)

---

## Environment Configuration

```env
# Base URL (without /esb or /api/esb)
T24_BASE_URL="https://fdh-esb.ngrok.dev"
T24_USERNAME="admin"
T24_PASSWORD="admin"

# Or legacy var
T24_ESB_URL="https://fdh-esb.ngrok.dev"
```

Service constructs full URL:
```typescript
const url = `${baseUrl}/esb/customer/accounts/v1/api/${customerId}`;
```

---

## Integration with Account Discovery

The Account Discovery Service uses this API:

```typescript
// lib/services/background/account-discovery.ts
const result = await t24AccountsService.getCustomerAccountIds(customerNumber);

if (result.hasMore && result.nextPageToken) {
  // Queue additional pages for background processing
  this.paginationQueue.add({
    userId,
    customerNumber,
    pageToken: result.nextPageToken,
    existingAccountNumbers,
    timestamp: Date.now(),
  });
}

// Process first page immediately
return this.processAccountPage(userId, result.accountIds, existingAccountNumbers);
```

**See:** [ACCOUNT_DISCOVERY_SERVICE.md](ACCOUNT_DISCOVERY_SERVICE.md)

---

## Response Format

### Success Response
```json
{
  "header": {
    "audit": {
      "T24_time": 640,
      "responseParse_time": 9,
      "requestParse_time": 15
    },
    "page_start": 1,
    "page_token": "202408138121805633.04,99",
    "total_size": 37,
    "page_size": 99,
    "status": "success"
  },
  "body": [
    {
      "ACCOUNT.ID": "1010100011629",
      "CUSTOMER.ID": "29519407",
      "CATEGORY": "1001",
      "CURRENCY": "MWK",
      "ACCOUNT.TITLE.1": "Account Name"
    }
  ]
}
```

### Error Handling
```typescript
if (!response.ok) {
  console.error(`❌ T24 API error: ${response.status} ${response.statusText}`);
  return null;
}
```

---

## Pagination Details

### Single Page (≤99 accounts)
```
Request:  GET /esb/customer/accounts/v1/api/29519407
Response: 37 accounts, hasMore: false
Action:   Process immediately
```

### Multiple Pages (>99 accounts)
```
Request:  GET /esb/customer/accounts/v1/api/{customer_id}
Response: 99 accounts, hasMore: true, nextPageToken: "..."
Action:   Process page 1, queue page 2+

Background Queue (every 5s):
  - Fetch page 2 with page_token
  - Process page 2
  - Queue page 3 if needed
  - Repeat until hasMore: false
```

**See:** [T24_ACCOUNTS_PAGINATION.md](T24_ACCOUNTS_PAGINATION.md)

---

## Testing

### From Host
```bash
curl -u admin:admin \
  "https://fdh-esb.ngrok.dev/esb/customer/accounts/v1/api/29519407" \
  | jq '.header.total_size, .body[].["ACCOUNT.ID"]'
```

### From Container
```bash
docker exec service_manager_adminpanel node -e "
const https = require('https');
const url = new URL('https://fdh-esb.ngrok.dev/esb/customer/accounts/v1/api/29519407');
const credentials = Buffer.from('admin:admin').toString('base64');

const options = {
  hostname: url.hostname,
  path: url.pathname,
  method: 'GET',
  headers: {
    'Authorization': \`Basic \${credentials}\`
  },
  family: 4  // Force IPv4
};

https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(JSON.parse(data).header));
}).on('error', console.error).end();
"
```

---

## Troubleshooting

### Issue: fetch failed / ETIMEDOUT
**Cause:** IPv6 issue in Docker  
**Fix:** Already implemented with `fetchIPv4()`  
**Verify:** Check `family: 4` in https.request options

### Issue: Only 99 accounts returned
**Cause:** Pagination not handled  
**Fix:** Use `getCustomerAccountIds()` (auto-queues pages)  
**Verify:** Check `hasMore` in response

### Issue: 404 Not Found
**Cause:** Wrong base URL  
**Fix:** Use `T24_BASE_URL="https://fdh-esb.ngrok.dev"` (no /esb suffix)  
**Verify:** Check constructed URL in logs

---

## Related Files

```
lib/services/t24/
├── accounts.ts                      # This API implementation
└── balance.ts                       # Balance API

lib/services/background/
├── account-discovery.ts             # Uses this API
└── balance-sync.ts                  # Balance sync service
```

---

## API Comparison

| Method | Pagination | Blocking | Use Case |
|--------|------------|----------|----------|
| `getCustomerAccounts()` | Single page | No | Get first page |
| `getCustomerAccountIds()` | Auto-queue | No | Recommended |
| `getAllCustomerAccountIds()` | All pages | Yes | Bulk operations |

---

## Production Deployment Checklist

- [ ] Set `T24_BASE_URL` environment variable
- [ ] Set `T24_USERNAME` and `T24_PASSWORD`
- [ ] Verify Docker IPv4 fix is applied
- [ ] Test with customer having 100+ accounts
- [ ] Monitor pagination queue processing
- [ ] Check account discovery service logs

---

*Last Updated: 2025-12-13*

**Status:** ✅ Fully operational with pagination and Docker IPv4 fix
