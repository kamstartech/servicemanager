# Background Services Monitor - Frontend UI

## Overview

Web-based monitoring dashboard for T24 integration background services with manual testing capabilities.

**URL:** `/services`

---

## Features

### 1. Real-Time Service Status

**Balance Sync Service:**
- Processing status (Idle/Processing)
- Priority queue size
- Background queue size
- Sync interval (minutes)

**Account Discovery Service:**
- Running status (Running/Stopped)
- Discovery status (Active/Idle)
- Discovery interval (hours)

**Auto-refresh:** Every 5 seconds

---

### 2. Manual Testing Tools

#### **A. Balance Sync Test**
- Input: User ID
- Action: Trigger immediate balance sync
- Response: Balance amount or error message

#### **B. Account Discovery Test**
- Input: User ID
- Action: Discover new accounts for user
- Response: Accounts added/deactivated count

#### **C. T24 Balance API Test**
- Input: Account Number
- Action: Test T24 balance endpoint directly
- Response: All 4 balance types (working, available, cleared, online)

#### **D. T24 Accounts API Test**
- Input: Customer ID
- Action: Test T24 accounts endpoint directly
- Response: List of customer accounts with details

---

## API Endpoints Created

### 1. **GET** `/api/services/status`
Get status of all background services

**Response:**
```json
{
  "success": true,
  "services": {
    "balanceSync": {
      "processing": false,
      "priority": 0,
      "background": 5,
      "interval": 300000,
      "intervalMinutes": 5
    },
    "accountDiscovery": {
      "running": true,
      "discovering": false,
      "interval": 86400000,
      "intervalHours": 24
    }
  }
}
```

### 2. **POST** `/api/services/balance-sync`
Manually trigger balance sync for a user

**Request:**
```json
{
  "userId": 1
}
```

**Response:**
```json
{
  "success": true,
  "balance": "148500.00",
  "message": "Balance synced: 148500.00"
}
```

### 3. **POST** `/api/services/account-discovery`
Manually discover accounts for a user

**Request:**
```json
{
  "userId": 1
}
```

**Response:**
```json
{
  "success": true,
  "added": 2,
  "deactivated": 0,
  "message": "Found 2 new accounts, deactivated 0 accounts"
}
```

### 4. **POST** `/api/services/t24-test`
Test T24 API endpoints directly

**Request (Balance):**
```json
{
  "type": "balance",
  "accountNumber": "1520000114607"
}
```

**Request (Accounts):**
```json
{
  "type": "accounts",
  "customerId": "35042058"
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "count": 3
}
```

---

## Usage

### Access the Monitor

```
http://localhost:3000/services
```

### Test Balance Sync

1. Enter a User ID (e.g., `1`)
2. Click "Run Test"
3. View result:
   - ✅ Success: Shows synced balance
   - ❌ Error: Shows error message

### Test Account Discovery

1. Enter a User ID (e.g., `1`)
2. Click "Run Test"
3. View result:
   - Shows accounts added/deactivated
   - Displays success message

### Test T24 APIs

**Balance API:**
1. Enter Account Number (default: `1520000114607`)
2. Click "Run Test"
3. View JSON response with all balance types

**Accounts API:**
1. Enter Customer ID (default: `35042058`)
2. Click "Run Test"
3. View list of customer accounts

---

## Visual Indicators

### Status Badges

| Badge | Meaning |
|-------|---------|
| 🟢 **Idle** | Balance sync not processing |
| 🔵 **Processing** | Balance sync active |
| 🟢 **Running** | Account discovery service active |
| 🔴 **Stopped** | Account discovery service stopped |
| 🟢 **No** | Not currently discovering |
| 🔵 **Yes** | Currently discovering accounts |

### Icons

| Icon | Meaning |
|------|---------|
| ✅ | Success |
| ❌ | Error/Failure |
| 🔄 | Loading/Processing |
| ▶️ | Run Test |

---

## Files Created

### API Routes

1. ✅ `app/api/services/status/route.ts` - Service status endpoint
2. ✅ `app/api/services/balance-sync/route.ts` - Balance sync trigger
3. ✅ `app/api/services/account-discovery/route.ts` - Account discovery trigger
4. ✅ `app/api/services/t24-test/route.ts` - T24 API testing

### Frontend

1. ✅ `app/(authenticated)/services/page.tsx` - Monitor UI (14KB)

---

## Example Workflow

### 1. Check Service Status

**Page loads automatically showing:**
- Balance Sync: Idle, 0 priority, 3 background
- Account Discovery: Running, Not discovering

### 2. Test Balance Sync

**Input:** User ID = `1`

**Output:**
```
✅ Balance synced: 148500.00 - Balance: 148500.00
```

**Console Log:**
```
🔄 Manual balance sync triggered for user 1
🔄 Fetching balance from T24 for account: 1520000114607
✅ Synced balance for user 1 (john_doe): 148500.00
```

### 3. Test Account Discovery

**Input:** User ID = `1`

**Output:**
```
✅ Found 2 new accounts, deactivated 0 accounts (Added: 2, Deactivated: 0)
```

**Console Log:**
```
🔍 Manual account discovery triggered for user 1
🔄 Fetching accounts from T24 for customer: 35042058
✅ Found 3 accounts for customer 35042058
✅ Added account 1010100011700 for user 1
✅ Added account 1010100011701 for user 1
```

### 4. Test T24 Balance API

**Input:** Account = `1520000114607`

**Output:**
```json
✅ Success!
{
  "workingBalance": "150000.00",
  "availableBalance": "148500.00",
  "clearedBalance": "150000.00",
  "onlineActualBalance": "148500.00"
}
```

### 5. Test T24 Accounts API

**Input:** Customer = `35042058`

**Output:**
```
✅ Found 3 accounts
[
  {
    "accountId": "1010100011599",
    "customerId": "35042058",
    "category": "1001",
    "currency": "MWK",
    "title": "John Doe Savings"
  },
  ...
]
```

---

## Troubleshooting

### Services Not Running

**Check console logs:**
```bash
npm run dev

# Look for:
🚀 Starting account balance sync service...
✅ Balance sync service started
🚀 Starting account discovery service...
✅ Account discovery service started
```

### API Errors

**401 Unauthorized:**
- Check T24 credentials in `.env`

**404 Not Found:**
- Check user ID exists
- Check customer number is valid

**500 Internal Server Error:**
- Check database connection
- Check T24 API is accessible

---

## Development

### Add New Test

```typescript
// In page.tsx
const runNewTest = async () => {
  const result = await fetch("/api/services/new-test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ param: value }),
  });
  const data = await result.json();
  setResults((prev) => ({ ...prev, newTest: data }));
};
```

### Adjust Auto-Refresh

```typescript
// Change interval (currently 5 seconds)
const interval = setInterval(fetchStatus, 10000); // 10 seconds
```

---

## Security Considerations

1. **Authentication Required:** Page should be behind auth
2. **Rate Limiting:** Consider limiting API calls
3. **Input Validation:** User IDs validated server-side
4. **Error Messages:** Don't expose sensitive data

---

## Summary

✅ **Services Monitor Dashboard**
- Real-time service status
- Manual testing tools
- 4 API endpoints
- Auto-refreshing UI
- Visual feedback

**Access at:** `http://localhost:3000/services` 🎛️✨
