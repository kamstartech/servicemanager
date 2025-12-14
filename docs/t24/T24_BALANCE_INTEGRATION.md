# T24 Balance Sync Integration - Complete

## ✅ What Was Implemented

### T24 API Endpoint

**URL:** `GET https://fdh-esb.ngrok.dev/api/esb/accounts/account/v1/balances/{account_number}`

**Auth:** Basic Auth (username:password)

**Response:** Returns 4 balance types:
1. `workingBalance` - Current working balance
2. `availableBalance` - Available for withdrawal
3. `clearedBalance` - Cleared funds
4. `onlineActualBalance` - Real-time actual balance

---

## Files Created

### 1. T24 Balance Service
**File:** `lib/services/t24/balance.ts`

Implements T24 API client with methods:
- `getAccountBalance()` - Fetch balance from T24
- `getAccountBalanceExtended()` - Get all balance types
- `testConnection()` - Test T24 connectivity

### 2. Updated Balance Sync Service
**File:** `lib/services/background/balance-sync.ts`

Now uses real T24 API instead of placeholder.

---

## How It Works

### 1. T24 API Call

```typescript
import { t24BalanceService } from '@/lib/services/t24/balance';

// Fetch balance from T24
const result = await t24BalanceService.getAccountBalanceExtended(accountNumber);

if (result.ok) {
  console.log("Available:", result.availableBalance);
  console.log("Working:", result.workingBalance);
  console.log("Cleared:", result.clearedBalance);
  console.log("Online:", result.onlineActualBalance);
}
```

### 2. Request Format

```http
GET /api/esb/accounts/account/v1/balances/1520000114607 HTTP/1.1
Host: fdh-esb.ngrok.dev
Authorization: Basic <base64(username:password)>
Content-Type: application/json
Accept: */*
```

### 3. Response Format

```json
{
  "header": {
    "audit": {
      "T24_time": 1234567890,
      "responseParse_time": 45,
      "requestParse_time": 12
    },
    "page_start": 0,
    "page_token": "",
    "total_size": 1,
    "page_size": 1,
    "status": "success"
  },
  "body": [
    {
      "workingBalance": "150000.00",
      "availableBalance": "148500.00",
      "clearedBalance": "150000.00",
      "onlineActualBalance": "148500.00",
      "currencyId": "MWK"
    }
  ]
}
```

### 4. Flattened Response

```typescript
{
  working_balance: "150000.00",
  available_balance: "148500.00",
  cleared_balance: "150000.00",
  online_actual_balance: "148500.00",
  currency_id: "MWK"
}
```

---

## Configuration

### Environment Variables

```env
# T24 ESB Configuration
T24_ESB_URL=https://fdh-esb.ngrok.dev/api/esb
T24_USERNAME=your_username
T24_PASSWORD=your_password
T24_TEST_ACCOUNT=1520000114607

# Balance Sync Configuration
BALANCE_SYNC_INTERVAL=300000  # 5 minutes
```

---

## Usage

### Auto-Sync (Background)

Service runs automatically every 5 minutes:

```
🔄 Starting periodic balance sync...
   Found 75 mobile banking users to sync
   Queued 120 accounts for sync
✅ Periodic sync queued

🔄 Fetching balance from T24 for account: 1520000114607
✅ Synced balance for user 1 (john_doe): 148500.00
```

### Manual Sync (Priority)

```typescript
import { balanceSyncService } from '@/lib/services/background/balance-sync';

// Sync user balance immediately (2 second timeout)
const result = await balanceSyncService.syncWithTimeout(userId);

if (result.ok) {
  console.log("Fresh balance:", result.balance);
} else {
  console.log("Sync continues in background");
}
```

### Test T24 Connection

```typescript
import { t24BalanceService } from '@/lib/services/t24/balance';

const connected = await t24BalanceService.testConnection();
console.log("T24 API:", connected ? "✅ Connected" : "❌ Failed");
```

---

## Database Updates

### MobileUserAccount Table

The sync updates these fields:

```typescript
{
  balance: "148500.00",           // availableBalance from T24
  workingBalance: "150000.00",    // workingBalance from T24
  clearedBalance: "150000.00",    // clearedBalance from T24
  updatedAt: new Date()
}
```

**Note:** `onlineActualBalance` is fetched but not stored (can be added if needed).

---

## Error Handling

### API Errors

```typescript
// T24 API returns error
❌ T24 API error: 401 Unauthorized
❌ T24 API error: 404 Not Found
❌ T24 API error: 500 Internal Server Error
```

### Missing Data

```typescript
// No balance in response
❌ Empty T24 response body
❌ Missing working balance in T24 response
```

### Network Errors

```typescript
// Connection timeout or network error
❌ T24 balance fetch failed for 1520000114607: FetchError
❌ T24 connection test failed: Error
```

---

## Comparison: Elixir vs Node.js

| Feature | Elixir | Node.js |
|---------|--------|---------|
| **Endpoint** | Same | Same |
| **Auth** | Basic Auth | Basic Auth |
| **Method** | GET | GET |
| **Response** | Flattened | Flattened |
| **Error Handling** | Pattern matching | Try/catch |
| **HTTP Client** | HTTPService (Finch) | fetch() |

---

## Testing

### Test T24 Integration

```bash
# Start dev server
npm run dev

# Check startup logs:
🚀 Starting account balance sync service...
✅ Balance sync service started

# After 5 seconds (first sync):
🔄 Starting periodic balance sync...
   Found 75 mobile banking users to sync
🔄 Fetching balance from T24 for account: 1520000114607
✅ Synced balance for user 1 (john_doe): 148500.00
```

### Test Specific Account

Create a test script:

```typescript
import { t24BalanceService } from '@/lib/services/t24/balance';

async function test() {
  const result = await t24BalanceService.getAccountBalanceExtended(
    "1520000114607"
  );
  
  console.log(result);
}

test();
```

---

## Monitoring

### Check Sync Logs

```bash
# Real-time logs
tail -f logs/balance-sync.log

# Expected output:
🔄 Fetching balance from T24 for account: 1520000114607
✅ Synced balance for user 1 (john_doe): 148500.00
🔄 Fetching balance from T24 for account: 1520000114608
✅ Synced balance for user 2 (mary_smith): 85000.00
```

### Check Database

```sql
-- Check recently synced balances
SELECT 
  mu.username,
  mua.account_number,
  mua.balance,
  mua.working_balance,
  mua.cleared_balance,
  mua.updated_at
FROM fdh_mobile_user_accounts mua
JOIN fdh_mobile_users mu ON mu.id = mua.mobile_user_id
WHERE mu.context = 'MOBILE_BANKING'
ORDER BY mua.updated_at DESC
LIMIT 10;
```

---

## Production Checklist

- [ ] Set T24 production URL
- [ ] Configure secure credentials
- [ ] Test with real accounts
- [ ] Monitor API rate limits
- [ ] Set up error alerts
- [ ] Configure retry logic
- [ ] Test failover scenarios
- [ ] Document API limits
- [ ] Add logging/metrics
- [ ] Test load handling

---

## Troubleshooting

### "401 Unauthorized"
```env
# Check credentials in .env
T24_USERNAME=correct_username
T24_PASSWORD=correct_password
```

### "404 Not Found"
```
# Check account number is valid T24 account
# Account format: usually 13 digits
```

### "Empty T24 response body"
```
# T24 may not have balance data for account
# Check account exists and is active in T24
```

### Connection Timeout
```env
# Increase timeout or check network
T24_ESB_URL=https://fdh-esb.ngrok.dev/api/esb
```

---

## Next Steps

1. ✅ T24 integration implemented
2. ✅ Balance sync service updated
3. ⏳ Test with production T24
4. ⏳ Add retry logic for failures
5. ⏳ Implement rate limiting
6. ⏳ Add metrics/monitoring

---

## Summary

✅ **T24 API Integration Complete**
- Endpoint: `GET /accounts/account/v1/balances/{account_number}`
- Returns: 4 balance types
- Auth: Basic Auth
- Service: Auto-syncs every 5 minutes
- Updates: MobileUserAccount table

**Balance sync now fetches real-time data from T24! 💰✅**
