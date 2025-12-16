# T24 Error Handling Guide

## Common T24 Transaction Errors

### 1. No Records Found (TGVCP-007)

**Error Response:**
```json
{
  "code": "TGVCP-007",
  "message": "No records were found that matched the selection criteria",
  "type": "BUSINESS"
}
```

**HTTP Status:** 404 Not Found

**Handling:**
- ✅ Treated as **success** with empty transactions array
- ✅ User sees friendly "No Transactions Found" message
- ✅ Not logged as error (just info log)

**Why This Happens:**
- Account exists but has no transaction history
- New accounts with zero activity
- Accounts that have been dormant

**User Experience:**
```
╔═══════════════════════════════════════╗
║   📄 No Transactions Found            ║
║                                       ║
║   This account has no transaction     ║
║   history yet. Transactions will      ║
║   appear here once account activity   ║
║   begins.                             ║
║                                       ║
║   [🔄 Refresh]  [← Back to Accounts] ║
╚═══════════════════════════════════════╝
```

---

### 2. Account Not Found

**Error Response:**
```json
{
  "code": "ACCOUNT-404",
  "message": "Account not found in T24 system",
  "type": "BUSINESS"
}
```

**HTTP Status:** 404 Not Found

**Handling:**
- ❌ Treated as **error**
- ❌ User sees error message
- ❌ Logged as error

**Why This Happens:**
- Account number doesn't exist in T24
- Typo in account number
- Account deleted/closed

---

### 3. Network Errors

**Error:**
```
TypeError: fetch failed
```

**Handling:**
- ❌ Treated as **error**
- ❌ Shows: "Network error: Could not connect to T24 Core Banking System"
- ❌ Logged as error

**Why This Happens:**
- T24 ESB is down
- No internet connection
- Firewall blocking requests
- DNS resolution failure

---

### 4. Authentication Errors

**Error Response:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid credentials"
}
```

**HTTP Status:** 401 Unauthorized

**Handling:**
- ❌ Treated as **error**
- ❌ User sees auth error message
- ❌ Logged as error

**Why This Happens:**
- Wrong T24 username/password in `.env`
- Credentials expired
- IP not whitelisted

---

### 5. Server Errors

**HTTP Status:** 500 Internal Server Error

**Handling:**
- ❌ Treated as **error**
- ❌ User sees generic error message
- ❌ Logged with full details

**Why This Happens:**
- T24 internal error
- Database connection issues
- Timeout

---

## Error Detection Logic

```typescript
private isNoRecordsError(statusCode: number, errorData: any): boolean {
  const code = errorData?.code || "";
  const message = (errorData?.message || "").toLowerCase();
  const type = errorData?.type || "";

  return (
    code === "TGVCP-007" ||
    message.includes("no records") ||
    message.includes("no transactions") ||
    message.includes("not found that matched") ||
    (statusCode === 404 && type === "BUSINESS")
  );
}
```

---

## Testing Error Scenarios

### Test 1: Account with No Transactions
```bash
# Use an account that exists but has no transactions
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { accountTransactions(accountNumber: \"1850000614715\") { status totalCount transactions { transactionId } } }"
  }'
```

**Expected Response:**
```json
{
  "data": {
    "accountTransactions": {
      "status": "success",
      "totalCount": 0,
      "transactions": []
    }
  }
}
```

### Test 2: Invalid Account
```bash
# Use an account that doesn't exist
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { accountTransactions(accountNumber: \"INVALID123\") { status totalCount } }"
  }'
```

**Expected Response:**
```json
{
  "data": {
    "accountTransactions": {
      "status": "error",
      "totalCount": 0,
      "transactions": []
    }
  }
}
```

### Test 3: Network Error
```bash
# Temporarily set wrong T24_BASE_URL
T24_BASE_URL=http://invalid-url.local npm run dev
```

---

## Logging Examples

### Success (No Transactions)
```
🔄 Fetching transactions from T24 for account: 1850000614715
❌ T24 API error: 404 Not Found
   Error details: { code: 'TGVCP-007', message: 'No records...', type: 'BUSINESS' }
ℹ️  No transactions found for account 1850000614715
```

### Error (Account Not Found)
```
🔄 Fetching transactions from T24 for account: INVALID123
❌ T24 API error: 404 Not Found
   Error details: { code: 'ACCOUNT-404', message: 'Account not found', type: 'ERROR' }
```

### Error (Network)
```
🔄 Fetching transactions from T24 for account: 1850000614715
❌ T24 transactions fetch failed for 1850000614715: TypeError: fetch failed
```

---

## Configuration

### Environment Variables
```env
# Required
T24_BASE_URL=https://fdh-esb.ngrok.dev
T24_USERNAME=your_username
T24_PASSWORD=your_password

# Optional
T24_TEST_ACCOUNT=1010100007998
```

### Timeout Settings
Default fetch timeout: 30 seconds (browser default)

To customize:
```typescript
const response = await fetchIPv4(url, {
  method: "GET",
  headers: { /* ... */ },
  signal: AbortSignal.timeout(60000), // 60 seconds
});
```

---

## UI States

### 1. Loading State
```
┌─────────────────────────────────────┐
│   🔄 Loading...                     │
│   Loading transactions...           │
└─────────────────────────────────────┘
```

### 2. Success with Transactions
```
┌─────────────────────────────────────┐
│   Transaction History (25)          │
│   ┌────────────────────────────┐   │
│   │ Date │ Ref │ Amount │ ... │   │
│   └────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 3. Success with No Transactions
```
┌─────────────────────────────────────┐
│   📄 No Transactions Found          │
│   This account has no transaction   │
│   history yet.                      │
│   [🔄 Refresh] [← Back]            │
└─────────────────────────────────────┘
```

### 4. Error State
```
┌─────────────────────────────────────┐
│   ⚠️  Failed to Load Transactions   │
│   Could not fetch from T24 CBS.     │
│   [🔄 Try Again]                    │
└─────────────────────────────────────┘
```

---

## Debugging

### Enable Verbose Logging
Add console logs in `lib/services/t24/transactions.ts`:

```typescript
console.log("Request URL:", url);
console.log("Response Status:", response.status);
console.log("Response Body:", await response.text());
```

### Check Network Tab
1. Open browser DevTools
2. Go to Network tab
3. Filter by "graphql"
4. Check request/response

### Check Server Logs
```bash
# In terminal where dev server is running
# Look for logs starting with:
🔄 Fetching transactions from T24...
❌ T24 API error...
ℹ️  No transactions found...
```

---

## Migration from Elixir

### Elixir Error Handling
```elixir
def get_transactions(account_number) do
  HTTPService.get(url, headers)
  |> case do
    {:ok, transactions} -> {:ok, transactions}
    {:error, reason} -> {:error, Error.new(:validation, reason)}
  end
end
```

### Next.js Equivalent
```typescript
async getAccountTransactions(accountNumber: string) {
  try {
    const response = await fetchIPv4(url, { /* ... */ });
    if (!response.ok) {
      const errorData = await response.json();
      if (this.isNoRecordsError(response.status, errorData)) {
        return { status: "success", transactions: [] };
      }
      return { status: "error", error: errorData.message };
    }
    return { status: "success", transactions: data };
  } catch (error) {
    return { status: "error", error: error.message };
  }
}
```

---

## Best Practices

1. **Always handle TGVCP-007 as success** - It's not an error
2. **Log error details** - Include code, message, type
3. **Provide user-friendly messages** - Don't expose technical errors
4. **Offer retry option** - For transient errors
5. **Distinguish empty vs error** - Different UI states
6. **Test edge cases** - New accounts, invalid accounts, network issues

---

## Quick Reference

| Error Code | Status | Treatment | User Message |
|------------|--------|-----------|--------------|
| TGVCP-007 | 404 | Success | "No transactions found" |
| ACCOUNT-404 | 404 | Error | "Account not found" |
| AUTH-401 | 401 | Error | "Authentication failed" |
| NETWORK | - | Error | "Network error" |
| 500 | 500 | Error | "Server error" |
