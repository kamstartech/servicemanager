# Mobile User Account Management Features

## Overview
Added account management features allowing mobile users to personalize, freeze, and hide their accounts through GraphQL.

---

## New Features

### 1. Account Nickname
Users can set custom nicknames for their accounts for easier identification.

### 2. Freeze Account
Users can temporarily freeze their accounts to prevent transactions (useful for security).

### 3. Hide Account
Users can hide accounts from their main view (accounts remain active but hidden from list).

---

## Database Changes

### New Field Added
- `isHidden` (Boolean, default: false) - Hide account from mobile app view

### Existing Fields Used
- `frozen` (Boolean, default: false) - Freeze account from transactions
- `nickName` (String, optional) - Custom account nickname

---

## GraphQL Schema Updates

### Account Type - New Fields
```graphql
type Account {
  id: ID!
  accountNumber: String!
  accountName: String
  accountType: String
  currency: String!
  nickName: String        # NEW - Custom nickname
  balance: String
  frozen: Boolean!        # NEW - Freeze status
  isHidden: Boolean!      # NEW - Hide status
  isPrimary: Boolean!
  isActive: Boolean!
  mobileUserId: String!
  createdAt: String!
  updatedAt: String!
}
```

### New Mutations
```graphql
# Set custom nickname for account
setAccountNickname(accountId: ID!, nickName: String!): Account!

# Freeze account (prevent transactions)
freezeAccount(accountId: ID!): Account!
unfreezeAccount(accountId: ID!): Account!

# Hide/unhide account from view
hideAccount(accountId: ID!): Account!
unhideAccount(accountId: ID!): Account!
```

---

## Usage Examples

### 1. Set Account Nickname
```graphql
mutation {
  setAccountNickname(
    accountId: "123"
    nickName: "My Savings"
  ) {
    id
    accountNumber
    nickName
  }
}
```

**Response:**
```json
{
  "data": {
    "setAccountNickname": {
      "id": "123",
      "accountNumber": "1234567890",
      "nickName": "My Savings"
    }
  }
}
```

---

### 2. Freeze Account
Temporarily freeze an account to prevent any transactions.

```graphql
mutation {
  freezeAccount(accountId: "123") {
    id
    accountNumber
    frozen
  }
}
```

**Use Cases:**
- User suspects unauthorized access
- User traveling and wants extra security
- User wants to prevent accidental transactions

**Response:**
```json
{
  "data": {
    "freezeAccount": {
      "id": "123",
      "accountNumber": "1234567890",
      "frozen": true
    }
  }
}
```

---

### 3. Unfreeze Account
```graphql
mutation {
  unfreezeAccount(accountId: "123") {
    id
    accountNumber
    frozen
  }
}
```

---

### 4. Hide Account
Hide an account from the main account list in mobile app.

```graphql
mutation {
  hideAccount(accountId: "123") {
    id
    accountNumber
    isHidden
  }
}
```

**Use Cases:**
- User has multiple accounts and wants to simplify view
- User wants to focus on specific accounts
- User wants to hide dormant accounts

**Restrictions:**
- ❌ Cannot hide primary account
- ✅ Account remains active and functional
- ✅ Account can still receive transactions
- ✅ Can be unhidden anytime

**Response:**
```json
{
  "data": {
    "hideAccount": {
      "id": "123",
      "accountNumber": "1234567890",
      "isHidden": true
    }
  }
}
```

---

### 5. Unhide Account
```graphql
mutation {
  unhideAccount(accountId: "123") {
    id
    accountNumber
    isHidden
  }
}
```

---

### 6. Get Accounts (includes new fields)
```graphql
query {
  myAccounts {
    id
    accountNumber
    accountName
    nickName
    balance
    frozen
    isHidden
    isPrimary
  }
}
```

**Response:**
```json
{
  "data": {
    "myAccounts": [
      {
        "id": "1",
        "accountNumber": "1234567890",
        "accountName": "Savings Account",
        "nickName": "Emergency Fund",
        "balance": "50000.00",
        "frozen": false,
        "isHidden": false,
        "isPrimary": true
      },
      {
        "id": "2",
        "accountNumber": "0987654321",
        "accountName": "Current Account",
        "nickName": "Business",
        "balance": "25000.00",
        "frozen": false,
        "isHidden": true,
        "isPrimary": false
      }
    ]
  }
}
```

---

## Mobile App Integration

### Account List Display
```typescript
// Filter out hidden accounts for main view
const visibleAccounts = accounts.filter(acc => !acc.isHidden);

// Show all accounts in settings/manage accounts
const allAccounts = accounts;
```

### Account Card Display
```tsx
<AccountCard>
  <AccountName>{account.nickName || account.accountName}</AccountName>
  <AccountNumber>{account.accountNumber}</AccountNumber>
  <Balance>{account.balance}</Balance>
  
  {account.frozen && (
    <FrozenBadge>Account Frozen</FrozenBadge>
  )}
  
  {account.isHidden && (
    <HiddenBadge>Hidden</HiddenBadge>
  )}
</AccountCard>
```

### Freeze Account Flow
```typescript
const handleFreezeAccount = async (accountId: string) => {
  const confirmed = await showConfirmDialog({
    title: "Freeze Account?",
    message: "No transactions will be possible until you unfreeze this account.",
  });
  
  if (confirmed) {
    await freezeAccountMutation({ accountId });
    showSuccess("Account frozen successfully");
  }
};
```

---

## Security & Authorization

### Account Ownership Verification
All mutations verify that the account belongs to the authenticated user:
- Uses `context.userId` to check ownership
- Throws error if account doesn't belong to user
- Admin users can bypass ownership check

### Restrictions
1. **Cannot hide primary account**
   - Primary account must always be visible
   - Set another account as primary first

2. **Frozen accounts**
   - No transactions allowed (debit/credit)
   - Account details still visible
   - Balance queries still work

---

## Business Logic

### Freeze Account
- Sets `frozen = true`
- Transactions should check `frozen` status before processing
- User can unfreeze anytime
- Admin can also freeze/unfreeze accounts

### Hide Account
- Sets `isHidden = true`
- Account remains fully functional
- Only affects display in mobile app
- Admin panel shows all accounts regardless of hidden status

### Nickname
- Custom text field (max recommended: 50 characters)
- Falls back to `accountName` if no nickname set
- Can be updated anytime
- Empty string clears nickname

---

## Database Migration

Run the migration to add the `isHidden` field:

```sql
ALTER TABLE "fdh_mobile_user_accounts" 
ADD COLUMN IF NOT EXISTS "is_hidden" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "fdh_mobile_user_accounts_is_hidden_idx" 
ON "fdh_mobile_user_accounts"("is_hidden");
```

---

## API Reference

### Queries
- `myAccounts` - Returns accounts with `frozen`, `isHidden`, `nickName` fields
- `myPrimaryAccount` - Returns primary account with new fields
- `mobileUserAccounts(userId)` - Admin query with new fields
- `allMobileUserAccounts` - Admin query with new fields

### Mutations

| Mutation | Parameters | Authorization | Returns |
|----------|-----------|---------------|---------|
| `setAccountNickname` | `accountId`, `nickName` | Owner or Admin | Account |
| `freezeAccount` | `accountId` | Owner or Admin | Account |
| `unfreezeAccount` | `accountId` | Owner or Admin | Account |
| `hideAccount` | `accountId` | Owner or Admin | Account |
| `unhideAccount` | `accountId` | Owner or Admin | Account |

---

## Error Handling

### Common Errors

**Account Not Found:**
```json
{
  "errors": [{
    "message": "Account not found or does not belong to you"
  }]
}
```

**Cannot Hide Primary:**
```json
{
  "errors": [{
    "message": "Cannot hide primary account"
  }]
}
```

**Authentication Required:**
```json
{
  "errors": [{
    "message": "Authentication required"
  }]
}
```

---

## Testing Checklist

- [ ] Set nickname on account
- [ ] Clear nickname (empty string)
- [ ] Freeze account
- [ ] Verify frozen account blocks transactions
- [ ] Unfreeze account
- [ ] Hide non-primary account
- [ ] Verify hidden account not in myAccounts (when filtered)
- [ ] Unhide account
- [ ] Try to hide primary account (should fail)
- [ ] Verify ownership check (try to modify another user's account)

---

## Files Modified

1. `prisma/schema.prisma` - Added `isHidden` field
2. `lib/graphql/schema/typeDefs.ts` - Added fields and mutations
3. `lib/graphql/schema/resolvers/mobileUserAccount.ts` - Added mutation resolvers
4. `lib/graphql/schema/resolvers/mobile.ts` - Updated myAccounts query
5. `ACCOUNT_MANAGEMENT_FEATURES.md` - This documentation

---

## Future Enhancements

- [ ] Bulk freeze/unfreeze multiple accounts
- [ ] Account freeze history/audit log
- [ ] Scheduled freeze/unfreeze
- [ ] Freeze reason tracking
- [ ] Push notification when account is frozen/unfrozen
- [ ] Hidden accounts section in app
