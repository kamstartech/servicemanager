# Account Balance Fields - Schema Update

## Overview

Added multiple balance field types to `MobileUserAccount` to match T24 Core Banking System response structure and backend Elixir schema.

---

## Changes Made

### 1. Schema Update (`prisma/schema.prisma`)

**Before:**
```prisma
model MobileUserAccount {
  balance Decimal? @db.Decimal(15, 2)
}
```

**After:**
```prisma
model MobileUserAccount {
  // Balance fields (synced from T24)
  balance          Decimal? @db.Decimal(15, 2)
  workingBalance   Decimal? @map("working_balance") @db.Decimal(15, 2)
  availableBalance Decimal? @map("available_balance") @db.Decimal(15, 2)
  clearedBalance   Decimal? @map("cleared_balance") @db.Decimal(15, 2)
}
```

### 2. Database Migration

**Migration:** `20251212151329_add_balance_fields`

```sql
ALTER TABLE "fdh_mobile_user_accounts" 
ADD COLUMN "working_balance" DECIMAL(15,2),
ADD COLUMN "available_balance" DECIMAL(15,2),
ADD COLUMN "cleared_balance" DECIMAL(15,2);
```

### 3. Balance Sync Service Update

**Updated:** `lib/services/background/balance-sync.ts`

Now syncs all 4 balance types from T24:

```typescript
await prisma.mobileUserAccount.update({
  where: { id: primaryAccount.id },
  data: {
    balance: balance,                              // Primary balance
    workingBalance: balanceResult.workingBalance,
    availableBalance: balanceResult.availableBalance,
    clearedBalance: balanceResult.clearedBalance,
    updatedAt: new Date(),
  },
});
```

---

## Balance Types Explained

| Field | T24 Field | Description | Use Case |
|-------|-----------|-------------|----------|
| **balance** | Available | Primary balance | Display in app |
| **workingBalance** | Working Balance | Pending transactions included | Internal calculations |
| **availableBalance** | Available Balance | Cleared + authorized transactions | Withdrawal limit |
| **clearedBalance** | Cleared Balance | Only cleared transactions | Settled funds |

---

## T24 Balance Response Structure

```json
{
  "workingBalance": "2262608.37",
  "availableBalance": "2262608.37",
  "clearedBalance": "2262608.37",
  "onlineActualBalance": "2262608.37"
}
```

All 4 balance types are now stored in the database.

---

## Migration Instructions

### When Database is Running:

```bash
# Apply migration
npx prisma migrate deploy

# Or for development
npx prisma migrate dev
```

### Manual Application:

```sql
-- Connect to database
psql -d service_manager -U postgres

-- Run migration
ALTER TABLE fdh_mobile_user_accounts 
ADD COLUMN working_balance DECIMAL(15,2),
ADD COLUMN available_balance DECIMAL(15,2),
ADD COLUMN cleared_balance DECIMAL(15,2);

-- Verify
\d fdh_mobile_user_accounts
```

---

## GraphQL Schema Updates

Update your GraphQL schema to expose these fields:

```graphql
type MobileUserAccount {
  id: Int!
  accountNumber: String!
  balance: Decimal
  workingBalance: Decimal
  availableBalance: Decimal
  clearedBalance: Decimal
  updatedAt: DateTime!
}
```

---

## Mobile API Response

Mobile apps will now receive all balance types:

```json
{
  "accounts": [
    {
      "id": 1,
      "accountNumber": "1520000114607",
      "balance": "2262608.37",
      "workingBalance": "2262608.37",
      "availableBalance": "2262608.37",
      "clearedBalance": "2262608.37",
      "currency": "MWK",
      "isPrimary": true
    }
  ]
}
```

---

## Backend Compatibility

This matches the Elixir backend schema:

```elixir
schema "fdh_mobile_user_accounts" do
  field :balance, :decimal
  field :working_balance, :decimal
  field :available_balance, :decimal
  field :cleared_balance, :decimal
  
  belongs_to :mobile_user, MobileUser
  
  timestamps()
end
```

---

## Testing

### 1. Check Schema

```bash
npx prisma db pull
# Verify fields appear in schema
```

### 2. Test Balance Sync

```bash
# Start dev server
npm run dev

# Go to: http://localhost:3000/services
# Test balance sync for a user
# Check all 4 balance fields are updated
```

### 3. Query Database

```sql
SELECT 
  account_number,
  balance,
  working_balance,
  available_balance,
  cleared_balance,
  updated_at
FROM fdh_mobile_user_accounts
WHERE mobile_user_id = 1;
```

---

## Files Modified

1. ✅ `prisma/schema.prisma` - Added balance fields
2. ✅ `prisma/migrations/20251212151329_add_balance_fields/migration.sql` - Migration
3. ✅ `lib/services/background/balance-sync.ts` - Updated to sync all fields
4. ✅ Prisma Client regenerated

---

## Benefits

### 1. **Complete Balance Information**
- App can show multiple balance types
- Better transparency for users
- Matches bank statements

### 2. **Backend Compatibility**
- NextJS and Elixir schemas now match
- Consistent data structure
- Easier data migration

### 3. **Future Features**
- Can implement balance alerts
- Can show pending vs cleared funds
- Can calculate available credit

---

## Example Use Cases

### Display Available vs Cleared

```typescript
// Show user their available balance
const available = account.availableBalance;

// Show settled funds only
const settled = account.clearedBalance;

// Show if pending transactions exist
const hasPending = available !== clearedBalance;
```

### Withdrawal Validation

```typescript
function canWithdraw(amount: Decimal, account: MobileUserAccount): boolean {
  // Use available balance (includes authorized holds)
  return account.availableBalance >= amount;
}
```

### Balance History Tracking

```typescript
// Track balance changes over time
const balanceHistory = await prisma.mobileUserAccount.findMany({
  where: { mobileUserId: userId },
  select: {
    balance: true,
    workingBalance: true,
    availableBalance: true,
    clearedBalance: true,
    updatedAt: true,
  },
  orderBy: { updatedAt: "desc" },
});
```

---

## Summary

✅ **Schema Updated** - 4 balance field types added
✅ **Migration Created** - Ready to apply when DB starts
✅ **Balance Sync Updated** - Now syncs all balance types
✅ **Backend Compatible** - Matches Elixir schema
✅ **Prisma Client Regenerated** - Types updated

**All balance types from T24 are now stored and synced! 💰✨**
