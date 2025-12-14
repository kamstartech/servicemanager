# T24 Integration Documentation

## Overview

This directory contains documentation for T24 Core Banking System integration. The admin panel communicates with T24 via ESB (Enterprise Service Bus) for accounts, balances, and transactions.

## 📚 Documentation Index

### Getting Started
1. **[T24_ACCOUNTS_ENDPOINT.md](T24_ACCOUNTS_ENDPOINT.md)** - Customer accounts API reference
2. **[T24_BALANCE_INTEGRATION.md](T24_BALANCE_INTEGRATION.md)** - Account balance sync service
3. **[T24_DOCKER_IPV6_FIX.md](T24_DOCKER_IPV6_FIX.md)** - ⚠️ **READ THIS FIRST** - Critical Docker networking fix

### Advanced Features
4. **[T24_ACCOUNTS_PAGINATION.md](T24_ACCOUNTS_PAGINATION.md)** - Pagination for 100+ accounts per customer
5. **[ACCOUNT_DISCOVERY_SERVICE.md](ACCOUNT_DISCOVERY_SERVICE.md)** - Automatic account discovery background service
6. **[ACCOUNT_ENRICHMENT_SERVICE.md](ACCOUNT_ENRICHMENT_SERVICE.md)** - ⭐ **NEW** - Automatic account details enrichment

### Historical/Reference
- **[ACCOUNT_BALANCE_SYNC.md](ACCOUNT_BALANCE_SYNC.md)** - Balance sync implementation details
- **[ACCOUNT_BALANCE_FIELDS_UPDATE.md](ACCOUNT_BALANCE_FIELDS_UPDATE.md)** - Schema changes
- **[ACCOUNT_BALANCE_SYNC_SUMMARY.md](ACCOUNT_BALANCE_SYNC_SUMMARY.md)** - Summary

## 🔧 Quick Setup

### 1. Environment Variables

```env
# T24 ESB Configuration
T24_BASE_URL="https://fdh-esb.ngrok.dev"
T24_USERNAME="admin"
T24_PASSWORD="admin"

# Test Credentials
T24_TEST_ACCOUNT="1520000114607"
T24_TEST_CUSTOMER="35042058"

# Background Services
BALANCE_SYNC_INTERVAL="300000"              # 5 minutes
ACCOUNT_DISCOVERY_INTERVAL="86400000"       # 24 hours
ACCOUNT_DISCOVERY_BATCH_SIZE="50"
```

### 2. Docker Configuration

⚠️ **Critical:** The Node.js `fetch()` API has IPv6 issues in Docker. See [T24_DOCKER_IPV6_FIX.md](T24_DOCKER_IPV6_FIX.md) for the required fix.

```yaml
# docker-compose.yml
environment:
  T24_BASE_URL: "${T24_BASE_URL:-https://fdh-esb.ngrok.dev}"
  T24_USERNAME: "${T24_USERNAME:-admin}"
  T24_PASSWORD: "${T24_PASSWORD:-admin}"
```

### 3. Service Files

```
lib/services/t24/
├── accounts.ts      # Customer accounts API (with IPv4 fix)
├── balance.ts       # Account balance API (with IPv4 fix)
└── [future]

lib/services/background/
├── account-discovery.ts  # Auto-discovers new accounts
└── balance-sync.ts       # Syncs balances every 5min
```

## 📡 T24 API Endpoints

### Customer Accounts
```
GET /esb/customer/accounts/v1/api/{customer_id}
```
- Fetches all accounts for a customer
- Returns paginated results (99 accounts per page)
- Includes account metadata
- See: [T24_ACCOUNTS_ENDPOINT.md](T24_ACCOUNTS_ENDPOINT.md)

### Account Balance
```
GET /api/esb/accounts/account/v1/balances/{account_number}
```
- Fetches current balance for an account
- Returns working, available, cleared balances
- Real-time data from T24
- See: [T24_BALANCE_INTEGRATION.md](T24_BALANCE_INTEGRATION.md)

## 🔄 Background Services

### Balance Sync Service
- **Frequency:** Every 5 minutes
- **Purpose:** Keeps account balances up-to-date
- **Implementation:** `lib/services/background/balance-sync.ts`
- **Priority Queue:** Auth flows get 2-second sync
- **Status:** ✅ Operational

### Account Discovery Service
- **Frequency:** Every 24 hours
- **Purpose:** Auto-discovers new accounts from T24
- **Implementation:** `lib/services/background/account-discovery.ts`
- **Batch Size:** 50 users per batch
- **Pagination:** Automatic queue for 100+ accounts
- **Status:** ✅ Operational

### Account Enrichment Service
- **Frequency:** Every 12 hours
- **Purpose:** Enriches accounts with detailed information from T24
- **Implementation:** `lib/services/background/account-enrichment.ts`
- **Batch Size:** 20 accounts per batch
- **Rate Limiting:** 2 seconds between requests
- **Status:** ✅ Operational

## 🐛 Known Issues & Solutions

### Issue: fetch() fails in Docker
**Symptom:** `TypeError: fetch failed` or `ETIMEDOUT`

**Cause:** Node.js fetch() prefers IPv6, Docker network doesn't support it properly

**Solution:** Use custom `fetchIPv4()` wrapper (already implemented)

**Documentation:** [T24_DOCKER_IPV6_FIX.md](T24_DOCKER_IPV6_FIX.md)

### Issue: Customers with 100+ accounts
**Symptom:** Only 99 accounts fetched

**Cause:** T24 API returns paginated results (99 per page)

**Solution:** Background pagination queue (already implemented)

**Documentation:** [T24_ACCOUNTS_PAGINATION.md](T24_ACCOUNTS_PAGINATION.md)

### Issue: URL path mismatch
**Symptom:** 404 Not Found

**Cause:** Different endpoints use different base paths:
- Accounts: `/esb/customer/...`
- Balance: `/api/esb/accounts/...`

**Solution:** Set `T24_BASE_URL` without path, construct full URL in services

## 📊 Current Status

| Feature | Status | Documentation |
|---------|--------|---------------|
| Accounts API | ✅ Working | T24_ACCOUNTS_ENDPOINT.md |
| Balance API | ✅ Working | T24_BALANCE_INTEGRATION.md |
| Account Details API | ✅ Working | ACCOUNT_ENRICHMENT_SERVICE.md |
| Docker IPv4 Fix | ✅ Implemented | T24_DOCKER_IPV6_FIX.md |
| Pagination | ✅ Implemented | T24_ACCOUNTS_PAGINATION.md |
| Account Discovery | ✅ Operational | ACCOUNT_DISCOVERY_SERVICE.md |
| Account Enrichment | ✅ Operational | ACCOUNT_ENRICHMENT_SERVICE.md |
| Balance Sync | ✅ Operational | T24_BALANCE_INTEGRATION.md |

## 🧪 Testing

### Test Customer: 35042058
```bash
# From host
curl -u admin:admin "https://fdh-esb.ngrok.dev/esb/customer/accounts/v1/api/35042058"

# From container
docker exec service_manager_adminpanel node -e "
  const https = require('https');
  // ... test code
"
```

### Test Account: 1520000114607
```bash
curl -u admin:admin "https://fdh-esb.ngrok.dev/api/esb/accounts/account/v1/balances/1520000114607"
```

## 🔐 Authentication

All T24 API requests use **Basic Authentication**:
```typescript
const credentials = Buffer.from(`${username}:${password}`).toString('base64');
headers: {
  'Authorization': `Basic ${credentials}`
}
```

## 📝 Contributing

When updating T24 integration:
1. Update relevant documentation
2. Test in Docker environment
3. Verify IPv4 connectivity
4. Check pagination for large datasets
5. Update this README if adding new endpoints

## 🔗 Related Documentation

- **Phoenix Backend T24 Docs:** `/.information/integrations/T24/`
- **API Documentation:** `/docs/guides/MOBILE_API_DOCUMENTATION.md`
- **Infrastructure:** `/docs/infrastructure/`

---

*Last Updated: 2025-12-13*

**⚠️ Important:** Always read [T24_DOCKER_IPV6_FIX.md](T24_DOCKER_IPV6_FIX.md) before deploying to Docker!
