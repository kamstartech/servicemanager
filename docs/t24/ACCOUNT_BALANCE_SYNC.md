# Account Balance Sync Service

## Overview

Background service that automatically syncs **MOBILE_BANKING user** account balances from the T24 core banking system. 

**Note:** Only syncs users with `context = MOBILE_BANKING`. Wallet users are excluded.

Based on the Elixir `UserBalanceSyncProcessor` pattern.

---

## Database Structure

### Tables Used

**1. MobileUser** (`fdh_mobile_users`)
- `context` - Must be `MOBILE_BANKING` (not `WALLET`)
- `isActive` - Must be `true`
- `username` - Mobile banking username
- `customerNumber` - T24 customer number
- `accountNumber` - Primary account (deprecated, use `accounts` relation)

**2. MobileUserAccount** (`fdh_mobile_user_accounts`)
- `mobileUserId` - Foreign key to MobileUser
- `accountNumber` - T24 account number
- `balance` - Current balance (synced from T24)
- `accountType` - SAVINGS, CURRENT, etc.
- `isPrimary` - Primary account flag
- `isActive` - Account status

### Relations

```typescript
MobileUser (context: MOBILE_BANKING)
  └── accounts: MobileUserAccount[]
        └── accountNumber → T24 Account
```

---

### Based on Elixir GenServer Pattern

The Elixir application (`lib/service_manager/processors/user_balance_sync_processor.ex`) uses a GenServer with:
- ✅ **5-minute periodic sync** of all pending users
- ✅ **Priority queue** for authentication flows (2-second timeout)
- ✅ **Background queue** for regular syncs
- ✅ **ETS tables** for queue storage (in-memory in Node.js)
- ✅ **T24 integration** for fetching real-time balances

### Node.js Implementation

**File:** `lib/services/background/balance-sync.ts`

**Features:**
- ✅ Periodic sync every 5 minutes (configurable)
- ✅ Priority queue for quick auth responses
- ✅ Background queue for async syncs
- ✅ Updates `MobileUserAccount` table
- ✅ Singleton service pattern
- ✅ Auto-starts with Next.js app

---

## How It Works

### 1. **Periodic Sync** (Every 5 Minutes)

```typescript
// Automatically runs in background
// Syncs all active mobile users
```

**Flow:**
1. Find all active **MOBILE_BANKING** users (excludes WALLET users)
2. Add them to background queue
3. Process queue one at a time
4. Fetch balance from T24
5. Update account in `MobileUserAccount` table

### 2. **Priority Sync** (For Authentication)

```typescript
import { balanceSyncService } from '@/lib/services/background/balance-sync';

// During user login
const result = await balanceSyncService.syncWithTimeout(userId);

if (result.ok) {
  // Balance synced within 2 seconds
  console.log("Balance:", result.balance);
} else {
  // Timeout - continues in background
  console.log("Sync queued for background");
}
```

**Flow:**
1. User logs in
2. Trigger priority sync with 2-second timeout
3. If syncs quickly → return balance
4. If timeout → move to background, return existing balance

### 3. **Background Sync** (Manual Trigger)

```typescript
// Add user to background queue
balanceSyncService.queueSync(userId);
```

---

## Configuration

### Environment Variables

```env
# Balance sync interval in milliseconds (default: 300000 = 5 minutes)
BALANCE_SYNC_INTERVAL=300000
```

### Constants

**File:** `lib/services/background/balance-sync.ts`

```typescript
const SYNC_INTERVAL = 300000;        // 5 minutes
const AUTH_SYNC_TIMEOUT = 2000;      // 2 seconds
const QUEUE_PROCESS_INTERVAL = 1000; // 1 second
```

---

## Usage

### Auto-Start (Default)

The service starts automatically when Next.js initializes via `instrumentation.ts`.

**File:** `instrumentation.ts`

```typescript
import { balanceSyncService } from '@/lib/services/background/balance-sync';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    balanceSyncService.start(); // ✅ Auto-starts
  }
}
```

### Manual Control

```typescript
import { balanceSyncService } from '@/lib/services/background/balance-sync';

// Start service
balanceSyncService.start();

// Stop service
balanceSyncService.stop();

// Get status
const status = balanceSyncService.getStatus();
console.log(status);
// { priority: 0, background: 5, processing: false }
```

---

## Integration Examples

### 1. In Login Flow

**File:** `lib/graphql/schema/resolvers/auth.ts`

```typescript
import { balanceSyncService } from '@/lib/services/background/balance-sync';

// After successful login
const result = await balanceSyncService.syncWithTimeout(user.id);

if (result.ok) {
  // Use fresh balance
  user.balance = result.balance;
} else {
  // Use existing balance, sync continues in background
  user.balance = user.accounts[0]?.balance || "0";
}
```

### 2. Manual Trigger After Transaction

```typescript
import { balanceSyncService } from '@/lib/services/background/balance-sync';

// After completing a transaction
await createTransaction(transactionData);

// Queue balance sync
balanceSyncService.queueSync(userId);
```

### 3. Monitoring Endpoint

**File:** `app/api/sync/status/route.ts`

```typescript
import { balanceSyncService } from '@/lib/services/background/balance-sync';
import { NextResponse } from 'next/server';

export async function GET() {
  const status = balanceSyncService.getStatus();
  return NextResponse.json({
    service: "balance-sync",
    ...status,
  });
}
```

---

## Queue System

### Priority Queue
- **Purpose:** Fast syncs during authentication
- **Timeout:** 2 seconds
- **Behavior:** If timeout → move to background queue

### Background Queue
- **Purpose:** Async syncs that don't need immediate response
- **Processing:** One at a time to avoid overwhelming T24
- **Deduplication:** Same user won't be queued twice

---

## T24 Integration (TODO)

### Current Status
⚠️ **Placeholder implementation** - T24 integration pending

### Implementation Needed

**File:** `lib/services/background/balance-sync.ts`

```typescript
private async fetchBalanceFromT24(accountNumber: string): Promise<string> {
  // TODO: Call T24 API
  // Reference Elixir: ServiceManager.Services.T24.Messages.GetAccountDetails
  
  // Example implementation:
  const response = await fetch(`${T24_API_URL}/account/${accountNumber}/balance`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${T24_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  
  const data = await response.json();
  return data.balance;
}
```

### Elixir Reference

**File:** `lib/service_manager/processors/user_balance_sync_processor.ex`

```elixir
defp fetch_balance_from_t24(account_number) do
  case ServiceManager.Services.T24.Messages.GetAccountDetails.get_account_details_parsed(account_number) do
    {:ok, account_details} ->
      {:ok, account_details["available_balance"]}
    error ->
      error
  end
end
```

---

## Monitoring

### Service Status

```typescript
const status = balanceSyncService.getStatus();

console.log(`Priority queue: ${status.priority} requests`);
console.log(`Background queue: ${status.background} requests`);
console.log(`Processing: ${status.processing ? 'Yes' : 'No'}`);
```

### Logs

```
🚀 Starting account balance sync service...
   Sync interval: 300s
   Auth timeout: 2000ms
✅ Balance sync service started

🔄 Starting periodic balance sync...
   Found 25 users to sync
✅ Periodic sync queued

✅ Synced balance for user 123: 150000.00
```

---

## Production Considerations

### 1. Use Redis for Queues

Replace in-memory queues with Redis for:
- ✅ Persistence across restarts
- ✅ Multi-instance coordination
- ✅ Better monitoring

### 2. Add Retry Logic

```typescript
private async syncUserBalance(userId: number, retries = 3): Promise<string | null> {
  for (let i = 0; i < retries; i++) {
    try {
      return await this.doSync(userId);
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
  return null;
}
```

### 3. Rate Limiting

Limit requests to T24 to avoid overload:

```typescript
private rateLimiter = new RateLimiter({
  tokensPerInterval: 10,
  interval: 'second'
});

await this.rateLimiter.removeTokens(1);
await this.fetchBalanceFromT24(accountNumber);
```

### 4. Error Tracking

Integrate with error monitoring:

```typescript
catch (error) {
  console.error(`Failed to sync user ${userId}:`, error);
  // Sentry.captureException(error);
}
```

---

## Comparison: Elixir vs Node.js

| Feature | Elixir (GenServer) | Node.js (Service) |
|---------|-------------------|-------------------|
| **Pattern** | GenServer with ETS | Class with Arrays |
| **Queues** | ETS tables | In-memory arrays |
| **Timers** | `Process.send_after` | `setInterval` |
| **Concurrency** | Actor model | Event loop |
| **State** | GenServer state | Class properties |
| **Persistence** | None (in-memory) | None (Redis recommended) |

---

## Files Created

1. ✅ `lib/services/background/balance-sync.ts` - Main service (8KB)
2. ✅ `instrumentation.ts` - Updated to start service
3. ✅ `ACCOUNT_BALANCE_SYNC.md` - This documentation

---

## Next Steps

1. **Implement T24 Integration**
   - Add T24 API client
   - Implement `fetchBalanceFromT24()` method
   - Test with staging T24 environment

2. **Add to Login Flow**
   - Update auth resolver to call `syncWithTimeout()`
   - Return fresh balance in login response

3. **Add Monitoring**
   - Create status endpoint
   - Add metrics/logging
   - Set up alerts for failures

4. **Production Setup**
   - Move to Redis queues
   - Add retry logic
   - Implement rate limiting

---

## Testing

```bash
# Start dev server (service auto-starts)
npm run dev

# Check logs for:
🚀 Starting account balance sync service...
✅ Balance sync service started
```

---

**Balance sync service is ready for T24 integration! 🔄💰**
