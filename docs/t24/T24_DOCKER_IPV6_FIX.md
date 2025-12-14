# T24 Accounts Pagination & Docker IPv6 Fix

## Issues Fixed

### 1. **URL Path Issues** ✅
**Problem:** Inconsistent base URL configuration between services
- `.env` had: `T24_ESB_URL="https://fdh-esb.ngrok.dev/api/esb"`
- Balance service expected: `/api/esb/accounts/...`
- Accounts service expected: `/esb/customer/...`
- Result: Double `/esb` in URL

**Solution:**
- Changed base URL to: `T24_BASE_URL="https://fdh-esb.ngrok.dev"`
- Balance service constructs: `${baseUrl}/api/esb/accounts/...`
- Accounts service constructs: `${baseUrl}/esb/customer/...`
- Both services fallback to `T24_BASE_URL` or `T24_ESB_URL`

### 2. **Docker Container IPv6 Network Issue** ✅
**Problem:** Node.js `fetch()` failing in Docker with "fetch failed"
- Container DNS resolution worked
- IPv4 connectivity worked
- Node.js `fetch()` defaulting to IPv6 caused failures

**Solution:** Custom `fetchIPv4()` wrapper using native `https` module
```typescript
import https from "https";

async function fetchIPv4(url: string, options: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || "GET",
      headers: options.headers as Record<string, string>,
      family: 4, // Force IPv4 - KEY FIX
    };

    const req = https.request(requestOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          ok: res.statusCode! >= 200 && res.statusCode! < 300,
          status: res.statusCode!,
          statusText: res.statusMessage!,
          json: async () => JSON.parse(data),
          text: async () => data,
        } as Response);
      });
    });

    req.on("error", reject);
    req.end();
  });
}
```

### 3. **Docker Compose Environment Variables** ✅
**Problem:** Duplicate environment sections in docker-compose.yml causing YAML errors

**Solution:** Consolidated environment variables with defaults:
```yaml
environment:
  T24_BASE_URL: "${T24_BASE_URL:-https://fdh-esb.ngrok.dev}"
  T24_USERNAME: "${T24_USERNAME:-admin}"
  T24_PASSWORD: "${T24_PASSWORD:-admin}"
```

## Test Results ✅

### Account Discovery Working:
```
🔍 Starting account discovery...
   Found 1 users to check
🔄 Fetching accounts from T24 for customer: 29519407
✅ Found 37 accounts for customer 29519407 (total: 37)
   ✅ Added account 1010100011629 for user 55
   ✅ Added account 1010100011637 for user 55
   ... (34 more accounts)
   User 55: +36 new accounts
✅ Account discovery complete:
   Users checked: 1
   New accounts added: 36
   Accounts deactivated: 0
   Errors: 0
```

### Balance Sync Working:
```
🔄 Starting periodic balance sync...
   Queued 1 accounts for sync
🔄 Fetching balance from T24 for account: 1850002685954
✅ Synced balance for user 58: 2262608.37
```

## Files Changed

### 1. `lib/services/t24/accounts.ts`
- Added `fetchIPv4()` function with IPv4 forcing
- Updated base URL handling (supports both `T24_ESB_URL` and `T24_BASE_URL`)
- Updated endpoint path: `${baseUrl}/esb/customer/accounts/v1/api/`
- Replaced `fetch()` with `fetchIPv4()`

### 2. `lib/services/t24/balance.ts`
- Added `fetchIPv4()` function
- Updated base URL handling
- Updated endpoint path: `${baseUrl}/api/esb/accounts/account/v1/balances/`
- Replaced `fetch()` with `fetchIPv4()`

### 3. `.env`
```diff
- T24_ESB_URL="https://fdh-esb.ngrok.dev/api/esb"
+ T24_ESB_URL="https://fdh-esb.ngrok.dev"
```

### 4. `.env.example`
```diff
- T24_ESB_URL="https://fdh-esb.ngrok.dev/api/esb"
+ T24_ESB_URL="https://fdh-esb.ngrok.dev"
```

### 5. `docker-compose.yml`
- Removed duplicate environment sections
- Added default values for T24 variables
- Fixed YAML syntax error at line 124

## Root Causes

1. **URL Mismatch:** Different T24 endpoints use different path prefixes:
   - Accounts: `/esb/customer/...`
   - Balance: `/api/esb/accounts/...`

2. **Docker IPv6:** Node.js 20.x `fetch()` prefers IPv6, but Docker network didn't support it properly for external HTTPS

3. **Environment Variables:** docker-compose.yml wasn't setting T24 env vars without a root `.env` file

## Verification

```bash
# Test from host (works)
curl -u admin:admin "https://fdh-esb.ngrok.dev/esb/customer/accounts/v1/api/29519407"

# Test from container with fetch (failed before fix)
docker exec service_manager_adminpanel node -e "fetch('https://fdh-esb.ngrok.dev/...')"

# Test from container with https + IPv4 (works)
docker exec service_manager_adminpanel node -e "https.request({...family:4})"
```

## Pagination Implementation Status

✅ **Implemented** (from previous session):
- T24 accounts service returns pagination metadata
- Background queue for additional pages
- Non-blocking pagination processing
- Handles 100+ accounts per customer

✅ **Tested with real data:**
- Customer 29519407 has 37 accounts
- All 37 accounts fetched and stored successfully
- No pagination needed (under 99 account limit)

## Recommendations

### Production Deployment:
1. **Set environment variables** in docker-compose or .env file
2. **Monitor IPv6** issues on different hosting platforms
3. **Consider reverse proxy** with IPv4-only backend if needed
4. **Test pagination** with customers having 100+ accounts

### Alternative Solutions (if needed):
```bash
# Force IPv4 at Docker level
docker run --sysctl net.ipv6.conf.all.disable_ipv6=1 ...

# Or use Node.js flags
NODE_OPTIONS="--dns-result-order=ipv4first"
```

## Date
2025-12-13

## Summary
Fixed T24 API connectivity in Docker by:
1. Correcting base URL configuration
2. Implementing IPv4-only fetch wrapper
3. Fixing docker-compose YAML syntax
4. Successfully tested with 37-account customer

**Result:** Account discovery and balance sync services now working perfectly in Docker environment! 🎉
