# Multi-Account Support for Mobile Banking Users

## Current State

**Database Schema (Prisma):**
- `MobileUser` has single fields: `customerNumber`, `accountNumber`
- No separate accounts table/relation

**GraphQL Schema:**
- `MobileUser` type has single `customerNumber` and `accountNumber` fields

**UI Display:**
- Shows single customer number and account number

## Proposed Solution

### Option 1: JSON Array Field (Quick Implementation)

Store multiple accounts as JSON array in existing fields.

**Schema Changes:**
```typescript
// Prisma
model MobileUser {
  // ... existing fields
  customerNumber String?  @db.Text  // Keep for backward compatibility
  accountNumber  String?  @db.Text  // Keep as primary account
  accounts       Json?               // NEW: Array of account objects
}
```

**GraphQL Changes:**
```graphql
type Account {
  accountNumber: String!
  accountName: String
  accountType: String
  currency: String
  balance: String
  isPrimary: Boolean!
}

type MobileUser {
  id: ID!
  context: MobileUserContext!
  username: String
  phoneNumber: String
  customerNumber: String
  accountNumber: String        # Deprecated: use accounts[0]
  accounts: [Account!]!         # NEW: List of accounts
  isActive: Boolean!
  createdAt: String!
  updatedAt: String!
}
```

**Pros:**
- ✅ Quick to implement (no migration needed)
- ✅ Backward compatible
- ✅ Flexible schema

**Cons:**
- ❌ Can't query/filter by account fields efficiently
- ❌ No referential integrity
- ❌ Limited validation

---

### Option 2: Separate Accounts Table (Recommended)

Create a proper `MobileUserAccount` table with relations.

**Schema Changes:**
```typescript
// Prisma
model MobileUser {
  id           Int               @id @default(autoincrement())
  context      MobileUserContext
  username     String?           @db.Text
  phoneNumber  String?           @db.Text
  customerNumber String?         @db.Text
  accountNumber  String?         @db.Text  // Keep for backward compatibility
  
  // Relations
  accounts     MobileUserAccount[]  // NEW: One-to-many
  
  @@map("fdh_mobile_users")
}

model MobileUserAccount {
  id            Int      @id @default(autoincrement())
  mobileUserId  Int
  
  accountNumber String   @db.Text
  accountName   String?  @db.Text
  accountType   String?  @db.Text   // SAVINGS, CURRENT, etc.
  currency      String   @default("MWK")
  balance       Decimal? @db.Decimal(15, 2)
  isPrimary     Boolean  @default(false)
  isActive      Boolean  @default(true)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  mobileUser    MobileUser @relation(fields: [mobileUserId], references: [id], onDelete: Cascade)
  
  @@unique([mobileUserId, accountNumber])
  @@index([mobileUserId])
  @@map("fdh_mobile_user_accounts")
}
```

**GraphQL Changes:**
```graphql
type Account {
  id: ID!
  accountNumber: String!
  accountName: String
  accountType: String
  currency: String!
  balance: String
  isPrimary: Boolean!
  isActive: Boolean!
  createdAt: String!
  updatedAt: String!
}

type MobileUser {
  id: ID!
  context: MobileUserContext!
  username: String
  phoneNumber: String
  customerNumber: String
  accountNumber: String        # Deprecated: returns primary account
  accounts: [Account!]!        # NEW: List of accounts
  primaryAccount: Account      # NEW: Quick access to primary
  isActive: Boolean!
  createdAt: String!
  updatedAt: String!
}

extend type Query {
  mobileUserAccounts(userId: ID!): [Account!]!
}

extend type Mutation {
  linkAccountToUser(
    userId: ID!
    accountNumber: String!
    accountName: String
    accountType: String
    isPrimary: Boolean
  ): Account!
  
  unlinkAccountFromUser(userId: ID!, accountId: ID!): Boolean!
  setPrimaryAccount(userId: ID!, accountId: ID!): Boolean!
}
```

**Pros:**
- ✅ Proper data normalization
- ✅ Easy to query/filter
- ✅ Referential integrity
- ✅ Can add account-specific fields
- ✅ Supports account linking/unlinking

**Cons:**
- ⚠️ Requires database migration
- ⚠️ More complex implementation

---

## Recommended Implementation Plan

### Phase 1: Database Schema (Option 2)

1. **Create Migration:**
```typescript
// admin/prisma/migrations/XXX_add_mobile_user_accounts/migration.sql
CREATE TABLE "fdh_mobile_user_accounts" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "mobileUserId" INTEGER NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT,
    "accountType" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'MWK',
    "balance" DECIMAL(15,2),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fdh_mobile_user_accounts_mobileUserId_fkey" 
        FOREIGN KEY ("mobileUserId") REFERENCES "fdh_mobile_users"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "fdh_mobile_user_accounts_mobileUserId_accountNumber_key" 
    ON "fdh_mobile_user_accounts"("mobileUserId", "accountNumber");
    
CREATE INDEX "fdh_mobile_user_accounts_mobileUserId_idx" 
    ON "fdh_mobile_user_accounts"("mobileUserId");

-- Migrate existing data
INSERT INTO "fdh_mobile_user_accounts" 
    ("mobileUserId", "accountNumber", "isPrimary", "isActive", "createdAt", "updatedAt")
SELECT 
    id, 
    "accountNumber", 
    true, 
    true, 
    "created_at", 
    "updated_at"
FROM "fdh_mobile_users"
WHERE "accountNumber" IS NOT NULL AND "context" = 'MOBILE_BANKING';
```

2. **Update Prisma Schema** (see Option 2 above)

3. **Run Migration:**
```bash
npx prisma migrate dev --name add_mobile_user_accounts
npx prisma generate
```

### Phase 2: GraphQL Layer

1. **Update TypeDefs** (`admin/lib/graphql/schema/typeDefs.ts`)
2. **Create Account Resolvers** (`admin/lib/graphql/schema/resolvers/mobileUserAccount.ts`)
3. **Update MobileUser Resolver** to include accounts

### Phase 3: UI Components

1. **Create Accounts Section** in user details:

```tsx
// admin/components/users/accounts-section.tsx
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>Accounts</CardTitle>
      <Button size="sm" onClick={() => setShowLinkAccount(true)}>
        <Plus className="h-4 w-4 mr-1" />
        Link Account
      </Button>
    </div>
  </CardHeader>
  <CardContent>
    {accounts.length === 0 ? (
      <p className="text-sm text-muted-foreground">No accounts linked</p>
    ) : (
      <div className="space-y-3">
        {accounts.map(account => (
          <div key={account.id} className="flex items-center justify-between p-3 border rounded">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{account.accountNumber}</span>
                {account.isPrimary && (
                  <Badge variant="default" size="sm">Primary</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {account.accountName || "No name"} • {account.accountType || "Unknown"} • {account.currency}
              </p>
              {account.balance && (
                <p className="text-sm font-medium mt-1">
                  Balance: {formatCurrency(account.balance, account.currency)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!account.isPrimary && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setPrimary(account.id)}
                >
                  Set Primary
                </Button>
              )}
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => unlinkAccount(account.id)}
              >
                Unlink
              </Button>
            </div>
          </div>
        ))}
      </div>
    )}
  </CardContent>
</Card>
```

2. **Update User Details Component:**
```tsx
// In admin/components/users/user-details.tsx
const ACCOUNTS_QUERY = gql`
  query GetUserAccounts($userId: ID!) {
    mobileUserAccounts(userId: $userId) {
      id
      accountNumber
      accountName
      accountType
      currency
      balance
      isPrimary
      isActive
      createdAt
    }
  }
`;

// Add to component
const { data: accountsData } = useQuery(ACCOUNTS_QUERY, {
  variables: { userId: id },
  skip: !id || context !== "MOBILE_BANKING",
});

const accounts = accountsData?.mobileUserAccounts ?? [];
const primaryAccount = accounts.find(a => a.isPrimary);
```

3. **Update Details Card:**
```tsx
<CardContent className="space-y-4 text-sm">
  {/* ... existing fields ... */}
  {context === "MOBILE_BANKING" && primaryAccount && (
    <div>
      <span className="font-medium">Primary account:</span>{" "}
      <span className="text-muted-foreground">
        {primaryAccount.accountNumber}
        {primaryAccount.accountName && ` (${primaryAccount.accountName})`}
      </span>
    </div>
  )}
  {context === "MOBILE_BANKING" && accounts.length > 1 && (
    <div>
      <span className="font-medium">Total accounts:</span>{" "}
      <span className="text-muted-foreground">{accounts.length}</span>
    </div>
  )}
</CardContent>
```

### Phase 4: Integration with Phoenix Backend

The Phoenix backend needs to:
1. Support multiple accounts per user
2. Provide APIs to link/unlink accounts
3. Sync account data from T24

**Phoenix Schema Updates:**
```elixir
# lib/service_manager/schemas/account.ex
defmodule ServiceManager.Schemas.Account do
  use Ecto.Schema
  import Ecto.Changeset

  schema "accounts" do
    field :account_number, :string
    field :account_name, :string
    field :account_type, :string
    field :currency, :string, default: "MWK"
    field :balance, :decimal
    field :is_primary, :boolean, default: false
    field :is_active, :boolean, default: true
    
    belongs_to :user, ServiceManager.Schemas.User
    
    timestamps()
  end
end
```

---

## Migration Strategy

### For Existing Users

1. **Data Migration** - Copy single `accountNumber` to new table as primary account
2. **Dual Write** - During transition, update both old and new fields
3. **Deprecation** - Mark old `accountNumber` field as deprecated
4. **Cleanup** - After full migration, remove old field (future phase)

### Backward Compatibility

- Keep `accountNumber` field in MobileUser
- Return primary account number in deprecated field
- GraphQL resolver maps `accountNumber` → `accounts[0].accountNumber`

---

## Testing Checklist

- [ ] Create user with single account
- [ ] Link multiple accounts to existing user
- [ ] Set primary account
- [ ] Unlink non-primary account
- [ ] Try to unlink primary account (should fail or promote another)
- [ ] Delete user (cascade delete accounts)
- [ ] Query accounts by userId
- [ ] Display in UI correctly
- [ ] Test with no accounts
- [ ] Test with 10+ accounts

---

## Timeline Estimate

- **Phase 1** (Database): 2 hours
- **Phase 2** (GraphQL): 3 hours  
- **Phase 3** (UI): 4 hours
- **Phase 4** (Backend Integration): 4 hours
- **Testing**: 3 hours

**Total: ~16 hours** (2 working days)

---

## Next Steps

1. ✅ Document the approach (this file)
2. ⏳ Get approval on Option 2 (Separate Accounts Table)
3. ⏳ Create Prisma migration
4. ⏳ Implement GraphQL resolvers
5. ⏳ Build UI components
6. ⏳ Integrate with Phoenix backend
7. ⏳ Test thoroughly
8. ⏳ Deploy to staging
9. ⏳ Production rollout

## ✅ Implementation Complete!

### What Was Done:

**Phase 1: Database Schema** ✅
- Created  table
- Added foreign key to 
- Added unique constraint on (userId, accountNumber)
- Migration includes data migration for existing accounts

**Phase 2: GraphQL Layer** ✅
- Added  type
- Added  field (array)
- Added  field
- Added  query
- Added mutations: linkAccountToUser, unlinkAccountFromUser, setPrimaryAccount, updateAccount

**Phase 3: Resolvers** ✅
- Created  with full CRUD operations
- Added field resolvers to MobileUser for accounts and primaryAccount
- Integrated into resolver index

### Test Queries:

```graphql
# Get user with accounts
query {
  mobileUsers(context: MOBILE_BANKING) {
    id
    username
    accountNumber
    accounts {
      id
      accountNumber
      accountName
      isPrimary
    }
    primaryAccount {
      accountNumber
      accountName
    }
  }
}

# Get accounts for specific user
query {
  mobileUserAccounts(userId: "58") {
    id
    accountNumber
    accountName
    accountType
    currency
    balance
    isPrimary
    isActive
  }
}

# Link new account
mutation {
  linkAccountToUser(
    userId: "58"
    accountNumber: "A123456"
    accountName: "Savings Account"
    accountType: "SAVINGS"
    isPrimary: true
  ) {
    id
    accountNumber
    isPrimary
  }
}
```

### Next: UI Implementation (Phase 3)
Ready to build the UI components for displaying and managing accounts.


---

## ✅ Implementation Status: COMPLETE

### Completed Phases:

**✅ Phase 1: Database Schema** - DONE
- Created `fdh_mobile_user_accounts` table
- Migration applied successfully
- Data migration ready for existing accounts

**✅ Phase 2: GraphQL Layer** - DONE
- Account type defined
- Queries: `mobileUserAccounts(userId)`
- Mutations: linkAccountToUser, unlinkAccountFromUser, setPrimaryAccount, updateAccount
- MobileUser fields: accounts[], primaryAccount

**✅ Phase 2b: Resolvers** - DONE
- `mobileUserAccountResolvers` created
- Field resolvers for MobileUser.accounts and MobileUser.primaryAccount
- All integrated into schema

### Ready for Phase 3: UI Implementation

The backend is complete and ready for UI development!
