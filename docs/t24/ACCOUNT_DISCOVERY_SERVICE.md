# Account Discovery Background Service

## Overview

Background service that automatically discovers new accounts for mobile banking users by periodically checking T24 Core Banking System.

**Features:**
- ✅ Runs every 24 hours (configurable)
- ✅ Only checks MOBILE_BANKING users
- ✅ Adds newly discovered accounts
- ✅ Deactivates accounts removed from T24
- ✅ Auto-starts with application

---

## How It Works

### Automatic Discovery (Every 24 Hours)

```
1. Get all active MOBILE_BANKING users with customer numbers
2. For each user:
   - Fetch accounts from T24
   - Compare with database accounts
   - Add new accounts
   - Deactivate removed accounts
3. Log statistics
```

---

## Configuration

### Environment Variables

Add to `.env`:

```env
# Account Discovery Service (optional - defaults shown)
ACCOUNT_DISCOVERY_INTERVAL="86400000"    # 24 hours in milliseconds
ACCOUNT_DISCOVERY_BATCH_SIZE="50"        # Users per batch
```

### Intervals

| Interval | Milliseconds | Description |
|----------|--------------|-------------|
| **1 hour** | 3600000 | Frequent discovery |
| **6 hours** | 21600000 | Moderate |
| **24 hours** | 86400000 | Default (recommended) |
| **7 days** | 604800000 | Infrequent |

---

## Usage

### Auto-Start (Default)

Service starts automatically with the application via `instrumentation.ts`.

**Logs:**
```
🚀 Starting account discovery service...
   Discovery interval: 24h
   Batch size: 50 users
✅ Account discovery service started
```

### Manual Control

```typescript
import { accountDiscoveryService } from '@/lib/services/background/account-discovery';

// Start service
accountDiscoveryService.start();

// Stop service
accountDiscoveryService.stop();

// Get status
const status = accountDiscoveryService.getStatus();
console.log(status);
// { running: true, discovering: false, interval: 86400000 }
```

### Manual Discovery for Specific User

```typescript
import { accountDiscoveryService } from '@/lib/services/background/account-discovery';

// Discover accounts for a specific user
const result = await accountDiscoveryService.discoverForUser(userId);

console.log(`Added ${result.added} new accounts`);
console.log(`Deactivated ${result.deactivated} accounts`);
```

---

## What It Does

### 1. New Account Discovery

**Scenario:** Customer opens a new savings account in T24

```
User has in DB:
  - Account 1010100011599 (Current)
  
T24 shows:
  - Account 1010100011599 (Current)
  - Account 1010100011700 (Savings) ← NEW

Action:
  ✅ Add Account 1010100011700 to database
```

### 2. Account Deactivation

**Scenario:** Customer closes an account in T24

```
User has in DB:
  - Account 1010100011599 (Current)
  - Account 1010100011700 (Savings)
  
T24 shows:
  - Account 1010100011599 (Current)

Action:
  ⚠️ Mark Account 1010100011700 as inactive
```

### 3. No Changes

```
User has in DB:
  - Account 1010100011599
  - Account 1010100011700
  
T24 shows:
  - Account 1010100011599
  - Account 1010100011700

Action:
  ℹ️ No changes needed
```

---

## Integration Examples

### 1. After User Registration

```typescript
import { accountDiscoveryService } from '@/lib/services/background/account-discovery';

async function registerUser(customerNumber: string, username: string) {
  // 1. Create user
  const user = await prisma.mobileUser.create({
    data: {
      customerNumber,
      username,
      context: "MOBILE_BANKING",
      isActive: true,
    },
  });

  // 2. Discover and add accounts immediately
  const result = await accountDiscoveryService.discoverForUser(user.id);
  
  console.log(`User registered with ${result.added} accounts`);
  
  return user;
}
```

### 2. Manual Account Refresh

```typescript
// In GraphQL resolver or API route
import { accountDiscoveryService } from '@/lib/services/background/account-discovery';

const resolvers = {
  Mutation: {
    async refreshUserAccounts(_: any, { userId }: { userId: number }) {
      const result = await accountDiscoveryService.discoverForUser(userId);
      
      return {
        status: 0,
        message: "Accounts refreshed",
        data: {
          added: result.added,
          deactivated: result.deactivated,
        },
      };
    },
  },
};
```

### 3. Admin Dashboard Endpoint

```typescript
// app/api/accounts/discover/route.ts
import { accountDiscoveryService } from '@/lib/services/background/account-discovery';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { userId } = await request.json();
  
  try {
    const result = await accountDiscoveryService.discoverForUser(userId);
    
    return NextResponse.json({
      success: true,
      added: result.added,
      deactivated: result.deactivated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
```

---

## Logging

### Successful Discovery

```
🔍 Starting account discovery...
   Found 75 users to check
   User 1: +2 new, -0 removed
   ✅ Added account 1010100011700 for user 1
   ✅ Added account 1010100011701 for user 1
   User 2: +0 new, -1 removed
   ⚠️ Deactivated account 1040100752797 for user 2
✅ Account discovery complete:
   Users checked: 75
   New accounts added: 5
   Accounts deactivated: 2
   Errors: 0
```

### Errors

```
❌ Failed to discover accounts for user 123: FetchError
❌ Failed to add account 1010100011700: Unique constraint violation
❌ Account discovery failed: Connection timeout
```

---

## Database Schema

### MobileUserAccount Table

Fields updated by discovery:

```typescript
{
  mobileUserId: number;    // Foreign key to MobileUser
  accountNumber: string;   // T24 account number
  isPrimary: boolean;      // First account is primary
  isActive: boolean;       // Set to false if removed from T24
  createdAt: Date;         // When discovered
  updatedAt: Date;         // When last modified
}
```

---

## Performance

### Resource Usage

- **Memory:** Minimal (processes in batches)
- **CPU:** Low (runs once per day)
- **Network:** Moderate (T24 API calls)

### Batch Processing

```
Total users: 1000
Batch size: 50

Batches: 20
Time per batch: ~2 minutes
Total time: ~40 minutes
```

To process faster, increase batch size:

```env
ACCOUNT_DISCOVERY_BATCH_SIZE="100"
```

---

## Monitoring

### Check Service Status

```typescript
import { accountDiscoveryService } from '@/lib/services/background/account-discovery';

const status = accountDiscoveryService.getStatus();

console.log(`Running: ${status.running}`);
console.log(`Currently discovering: ${status.discovering}`);
console.log(`Interval: ${status.interval / 1000 / 60 / 60} hours`);
```

### Database Query

```sql
-- Check recently discovered accounts
SELECT 
  mu.username,
  mua.account_number,
  mua.is_active,
  mua.created_at,
  mua.updated_at
FROM fdh_mobile_user_accounts mua
JOIN fdh_mobile_users mu ON mu.id = mua.mobile_user_id
WHERE mu.context = 'MOBILE_BANKING'
  AND mua.created_at > NOW() - INTERVAL '7 days'
ORDER BY mua.created_at DESC;
```

### Deactivated Accounts

```sql
-- Check recently deactivated accounts
SELECT 
  mu.username,
  mua.account_number,
  mua.updated_at
FROM fdh_mobile_user_accounts mua
JOIN fdh_mobile_users mu ON mu.id = mua.mobile_user_id
WHERE mu.context = 'MOBILE_BANKING'
  AND mua.is_active = false
  AND mua.updated_at > NOW() - INTERVAL '7 days'
ORDER BY mua.updated_at DESC;
```

---

## Error Handling

### T24 Connection Failures

Service continues to next user if one fails:

```
❌ Failed to discover accounts for user 123: Connection timeout
✅ User 124: +1 new, -0 removed
✅ User 125: +0 new, -0 removed
```

### Missing Customer Numbers

Users without customer numbers are skipped:

```sql
WHERE:
  context = "MOBILE_BANKING"
  isActive = true
  customerNumber IS NOT NULL  ← Skips users without this
```

### Duplicate Account Prevention

Database constraint prevents duplicate accounts:

```
UNIQUE(mobile_user_id, account_number)
```

---

## Testing

### Test Manual Discovery

```typescript
import { accountDiscoveryService } from '@/lib/services/background/account-discovery';

async function testDiscovery() {
  // Test for a specific user
  const result = await accountDiscoveryService.discoverForUser(1);
  
  console.log("Discovery result:", result);
  // { added: 2, deactivated: 0 }
}

testDiscovery();
```

### Simulate New Account

```bash
# 1. Get current accounts for test user
curl -u admin:admin https://fdh-esb.ngrok.dev/esb/customer/accounts/v1/api/35042058

# 2. Run discovery
npm run dev
# Wait for discovery to run or trigger manually

# 3. Check database
psql -d service_manager -c "
  SELECT account_number, created_at 
  FROM fdh_mobile_user_accounts 
  WHERE mobile_user_id = 1 
  ORDER BY created_at DESC;
"
```

---

## Production Considerations

### 1. Rate Limiting

Limit T24 API calls to avoid overload:

```typescript
// Add delay between users
await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
```

### 2. Error Notifications

Send alerts for repeated failures:

```typescript
if (stats.errors > 10) {
  // Send notification to admin
  await sendAdminAlert("Account discovery has high error rate");
}
```

### 3. Scheduling

Consider running during off-peak hours:

```env
# Run at 2 AM daily (use cron job instead)
# Or adjust interval to align with preferred time
```

### 4. Audit Log

Log all account changes for audit:

```typescript
await prisma.accountAuditLog.create({
  data: {
    userId,
    action: "ACCOUNT_ADDED",
    accountNumber,
    timestamp: new Date(),
  },
});
```

---

## Files Created

1. ✅ `lib/services/background/account-discovery.ts` - Service implementation (7.1KB)
2. ✅ `instrumentation.ts` - Updated to start service
3. ✅ `.env` - Added configuration
4. ✅ `ACCOUNT_DISCOVERY_SERVICE.md` - This documentation

---

## Comparison with Balance Sync

| Feature | Balance Sync | Account Discovery |
|---------|--------------|-------------------|
| **Frequency** | 5 minutes | 24 hours |
| **Purpose** | Sync balances | Find new accounts |
| **T24 Endpoint** | Balance API | Accounts API |
| **Updates** | Balance fields | Account records |
| **Critical** | High (auth flows) | Low (background) |

---

## Summary

✅ **Account Discovery Service**
- Runs every 24 hours
- Discovers new accounts from T24
- Deactivates closed accounts
- Auto-starts with application
- Processes in batches

**Mobile banking users always have up-to-date account lists! 🔍✅**
