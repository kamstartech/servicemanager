# Transaction Implementation Plan for Next.js Admin
## Based on Elixir Service Manager Architecture Analysis

---

## 🔍 Elixir Implementation Overview

### Database Architecture

The Elixir system uses **TWO separate transaction tables**:

1. **`transactions`** - Main account-to-account transactions (T24 CBS linked)
2. **`wallet_transactions`** - Wallet-specific transactions (internal)
3. **`transaction_status_history`** - Audit trail for all status changes

### Key Schema Fields (from Elixir)

```prisma
// Core transaction fields that MUST be implemented
model Transaction {
  id                      String   @id @default(cuid())
  
  // Transaction Type & Status
  type                    String   // "credit", "debit", "transfer", "direct-transfer", "external-transfer", "reversal"
  status                  String   // "pending", "processing", "completed", "failed", "reversed"
  
  // Amounts
  amount                  Decimal  @db.Decimal(15, 2)
  credit_amount           Decimal? @db.Decimal(15, 2)
  debit_amount            Decimal? @db.Decimal(15, 2)
  
  // Balance Snapshots (CRITICAL for audit trail)
  opening_balance         Decimal? @db.Decimal(15, 2)
  closing_balance         Decimal? @db.Decimal(15, 2)
  
  // References & Metadata
  reference               String   @unique  // Format: "BNK{timestamp}"
  value_date              DateTime
  description             String?  @db.Text
  
  // T24 Integration Fields
  cbs_transaction_reference   String?  @db.Text  // T24's transaction ID
  external_reference          String?  @db.Text  // T24's unique identifier
  callback_status             String   @default("pending")  // "pending", "success", "failed"
  
  // Account References (DUAL approach - string + foreign key)
  sender_account          String?  @db.Text     // String account number
  receiver_account        String?  @db.Text     // String account number
  from_account_id         Int?                  // Optional foreign key
  to_account_id           Int?                  // Optional foreign key
  
  // Relationships
  from_account            MobileUserAccount? @relation("SourceAccount", fields: [from_account_id], references: [id])
  to_account              MobileUserAccount? @relation("DestinationAccount", fields: [to_account_id], references: [id])
  mobile_user_id          Int
  mobile_user             MobileUser @relation(fields: [mobile_user_id], references: [id])
  
  // Reversal Support (CRITICAL feature)
  is_reversal             Boolean  @default(false)
  original_transaction_id String?
  original_transaction    Transaction? @relation("TransactionReversal", fields: [original_transaction_id], references: [id])
  reversed_by             Transaction[] @relation("TransactionReversal")
  
  // Audit & Tracking
  initiated_by            Int      // Admin user ID
  ip_address              String?
  user_agent              String?  @db.Text
  transaction_details     Json?    // Additional metadata
  
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  completedAt             DateTime?
  
  @@index([mobile_user_id])
  @@index([status])
  @@index([type])
  @@index([callback_status])
  @@index([from_account_id])
  @@index([to_account_id])
  @@index([reference])
  @@index([createdAt])
  @@map("fdh_transactions")
}

// Separate table for status history (CRITICAL for compliance)
model TransactionStatusHistory {
  id              String   @id @default(cuid())
  transaction_id  String
  from_status     String?
  to_status       String
  changed_by      Int?     // Admin user ID
  notes           String?  @db.Text
  metadata        Json?    // Additional context
  
  createdAt       DateTime @default(now())
  
  @@index([transaction_id])
  @@index([to_status])
  @@index([createdAt])
  @@map("fdh_transaction_status_history")
}
```

---

## 🏗️ Architecture Patterns from Elixir

### 1. **Async Transaction Processing** (GenServer Pattern)

The Elixir system uses a **background processor** that polls every 1 second:

```elixir
# AccountTransactionProcessor.ex
@poll_interval 1000

def handle_info(:poll, state) do
  process_pending_transactions()
  {:noreply, state}
end

defp process_pending_transactions do
  get_pending_transactions()
  |> Enum.each(&process_transaction/1)
end

defp process_transaction(transaction) do
  # 1. Update status to "processing"
  update_status(transaction, "processing")
  
  # 2. Create pre-transaction balance snapshots
  create_pre_snapshots(transaction)
  
  # 3. Call T24 API
  case initiate_t24_transfer(transaction) do
    {:ok, result} ->
      create_post_snapshots(transaction)
      update_status(transaction, "completed")
      
    {:error, reason} ->
      update_status(transaction, "failed", reason)
  end
end
```

**Next.js Implementation:**
- ✅ Use **Prisma + Cron Jobs** or **BullMQ** for background processing
- ✅ Create transactions with `status: "pending"`
- ✅ Background job polls every 5-10 seconds
- ✅ Updates status to `processing → completed/failed`

### 2. **Flexible Account References** (Hybrid Approach)

The Elixir system supports **4 transaction scenarios**:

```elixir
# Scenario 1: Both accounts exist in local DB
%{from_account_id: 123, to_account_id: 456, sender_account: "A000001", receiver_account: "A000002"}

# Scenario 2: Only destination exists (credit-only)
%{to_account_id: 456, receiver_account: "A000002", sender_account: "EXTERNAL_ACCOUNT"}

# Scenario 3: Only source exists (debit-only)
%{from_account_id: 123, sender_account: "A000001", receiver_account: "EXTERNAL_ACCOUNT"}

# Scenario 4: Neither exists (direct T24 request)
%{sender_account: "A000001", receiver_account: "A000002"}
```

**Why this matters:**
- ✅ Admin can initiate transfers to accounts **not yet synced** to local DB
- ✅ T24 CBS is the source of truth, not the admin database
- ✅ Supports external bank transfers

### 3. **Balance Snapshots** (Pre/Post Transaction)

```elixir
# Before transaction
defp create_pre_transaction_snapshots(transaction) do
  if transaction.from_account_id do
    account = Repo.get(FundAccounts, transaction.from_account_id)
    BalanceSnapshot.create(%{
      account_id: account.id,
      balance: account.current_balance,
      snapshot_type: "pre_transaction",
      transaction_id: transaction.id
    })
  end
end

# After transaction
defp create_post_transaction_snapshots(transaction) do
  # Fetch fresh balance from T24
  {:ok, new_balance} = T24.get_account_balance(account_number)
  BalanceSnapshot.create(%{
    account_id: account.id,
    balance: new_balance,
    snapshot_type: "post_transaction",
    transaction_id: transaction.id
  })
end
```

**Next.js Implementation:**
- ✅ Optional feature for compliance
- ✅ Store in separate `balance_snapshots` table
- ✅ Record before calling T24 API and after success

### 4. **Status Change Tracking** (Automatic Audit Trail)

```elixir
# Automatically triggered on changeset update
defp track_status_changes(changeset, _attrs) do
  case get_change(changeset, :status) do
    new_status when not is_nil(new_status) ->
      transaction = changeset.data
      old_status = transaction.status
      
      TransactionStatusHistoryService.record_status_change(
        transaction.id,
        old_status,
        new_status,
        metadata: %{"changed_at" => DateTime.utc_now()}
      )
      
    _ -> :ok
  end
end
```

**Next.js Implementation:**
- ✅ Create Prisma middleware to auto-track status changes
- ✅ Record every status transition in `TransactionStatusHistory` table
- ✅ Include metadata: changed_by, timestamp, notes

### 5. **Transaction Reference Generation**

```elixir
# Format: BNK{timestamp_milliseconds}
def build_reference do
  "BNK#{:os.system_time(:millisecond)}"
end

# For transfers:
"transfer_#{from_account}_#{to_account}_#{:os.system_time(:millisecond)}"
```

**Next.js Implementation:**
```typescript
export function generateTransactionReference(): string {
  return `BNK${Date.now()}`;
}

export function generateTransferReference(from: string, to: string): string {
  return `transfer_${from}_${to}_${Date.now()}`;
}
```

---

## 🔌 T24 Core Banking Integration

### 1. **Initiate Transaction (Write Operation)**

```typescript
// lib/services/t24/initiate-transaction.ts

interface InitiateTransactionParams {
  transactionType: "AC";  // Account to Account
  debitAccountNumber: string;
  debitAmount: string;
  debitCurrency: "MWK";
  creditAccountNumber: string;
  creditCurrencyId: "MWK";
}

export async function initiateT24Transfer(params: InitiateTransactionParams) {
  const response = await fetch(
    `${process.env.T24_BASE_URL}/api/esb/transaction/1.0/initiate/transaction`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(`${T24_USERNAME}:${T24_PASSWORD}`)}`,
      },
      body: JSON.stringify({
        header: {},
        body: params,
      }),
    }
  );

  const result = await response.json();

  // Extract T24 references
  return {
    cbs_transaction_reference: result.body.header.id,
    external_reference: result.body.header.uniqueIdentifier,
    status: response.ok ? "completed" : "failed",
    raw_response: result,
  };
}
```

### 2. **Fetch Transaction History (Read Operation)**

```typescript
// lib/services/t24/get-transactions.ts

export async function getAccountTransactions(accountNumber: string) {
  const response = await fetch(
    `${process.env.T24_BASE_URL}/api/esb/reports/v1/account/transactions/${accountNumber}`,
    {
      method: "GET",
      headers: {
        "Accept": "*/*",
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(`${T24_USERNAME}:${T24_PASSWORD}`)}`,
      },
    }
  );

  return response.json();
}
```

### 3. **Transaction Error Handling**

From Elixir's `TransactionErrorDecoder`:

```typescript
// lib/services/t24/error-decoder.ts

interface T24Error {
  error_type: "validation" | "insufficient_funds" | "account_not_found" | "network" | "unknown";
  error_code: string;
  error_description: string;
  raw_response: any;
}

export function decodeT24Error(response: any): T24Error {
  // Check for common T24 error patterns
  if (response.error?.message?.includes("insufficient funds")) {
    return {
      error_type: "insufficient_funds",
      error_code: "T24_INSUFFICIENT_FUNDS",
      error_description: "Account has insufficient funds for this transaction",
      raw_response: response,
    };
  }

  if (response.error?.message?.includes("account not found")) {
    return {
      error_type: "account_not_found",
      error_code: "T24_ACCOUNT_NOT_FOUND",
      error_description: "The specified account does not exist",
      raw_response: response,
    };
  }

  // Default error
  return {
    error_type: "unknown",
    error_code: "T24_UNKNOWN_ERROR",
    error_description: response.error?.message || "An unknown error occurred",
    raw_response: response,
  };
}
```

---

## 📊 GraphQL Schema

### Queries

```graphql
type Transaction {
  id: ID!
  type: String!
  status: String!
  amount: String!
  credit_amount: String
  debit_amount: String
  description: String
  reference: String!
  value_date: String!
  
  # Balance tracking
  opening_balance: String
  closing_balance: String
  
  # T24 Integration
  cbs_transaction_reference: String
  external_reference: String
  callback_status: String!
  
  # Account references
  sender_account: String
  receiver_account: String
  from_account: MobileUserAccount
  to_account: MobileUserAccount
  
  # Metadata
  mobile_user: MobileUser!
  is_reversal: Boolean!
  original_transaction: Transaction
  transaction_details: JSON
  
  # Audit
  initiated_by: Int!
  ip_address: String
  createdAt: String!
  updatedAt: String!
  completedAt: String
  
  # Status history
  status_history: [TransactionStatusHistory!]!
}

type TransactionStatusHistory {
  id: ID!
  transaction_id: String!
  from_status: String
  to_status: String!
  changed_by: Int
  notes: String
  metadata: JSON
  createdAt: String!
}

type TransactionConnection {
  transactions: [Transaction!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

extend type Query {
  # Get transaction by ID
  transaction(id: ID!): Transaction
  
  # Get transactions for a specific account
  accountTransactions(
    accountNumber: String!
    status: String
    type: String
    startDate: String
    endDate: String
    minAmount: Float
    maxAmount: Float
    page: Int
    limit: Int
  ): TransactionConnection!
  
  # Get transactions for a mobile user
  userTransactions(
    userId: Int!
    status: String
    type: String
    startDate: String
    endDate: String
    page: Int
    limit: Int
  ): TransactionConnection!
  
  # Get transaction status history
  transactionStatusHistory(transactionId: ID!): [TransactionStatusHistory!]!
}
```

### Mutations

```graphql
input InitiateTransferInput {
  mobile_user_id: Int!
  source_account_number: String!
  destination_account_number: String!
  amount: String!
  description: String
  
  # Optional: If accounts exist in local DB
  from_account_id: Int
  to_account_id: Int
}

input InitiateCreditInput {
  mobile_user_id: Int!
  destination_account_number: String!
  amount: String!
  description: String
  to_account_id: Int
}

input InitiateDebitInput {
  mobile_user_id: Int!
  source_account_number: String!
  amount: String!
  description: String
  from_account_id: Int
}

input ReverseTransactionInput {
  transaction_id: ID!
  reason: String!
}

type TransactionResult {
  success: Boolean!
  transaction: Transaction
  message: String
  errors: [String!]
}

extend type Mutation {
  # Initiate transfer between two accounts
  initiateTransfer(input: InitiateTransferInput!): TransactionResult!
  
  # Credit an account (deposit)
  initiateCredit(input: InitiateCreditInput!): TransactionResult!
  
  # Debit an account (withdrawal)
  initiateDebit(input: InitiateDebitInput!): TransactionResult!
  
  # Reverse a completed transaction
  reverseTransaction(input: ReverseTransactionInput!): TransactionResult!
  
  # Update transaction status manually (admin only)
  updateTransactionStatus(
    transactionId: ID!
    status: String!
    notes: String
  ): TransactionResult!
}
```

---

## 🚀 Implementation Roadmap

### Phase 1: Read-Only Transaction History (Week 1)

**Goal:** Display T24 transaction history in admin panel

✅ **Tasks:**
1. Create T24 service client (`lib/services/t24/client.ts`)
2. Implement `getAccountTransactions()` method
3. Create GraphQL query resolver
4. Build transaction list UI component
5. Add filters (date range, type, status)
6. Add export to CSV functionality

**Files to create:**
```
admin/
├── lib/services/t24/
│   ├── client.ts           # Base T24 client with auth
│   ├── get-transactions.ts # Fetch transaction history
│   └── types.ts            # TypeScript types
├── lib/graphql/schema/
│   ├── transaction.graphql # GraphQL types
│   └── resolvers/
│       └── transaction.ts  # Query resolvers
└── app/mobile-banking/users/[id]/transactions/
    ├── page.tsx            # Transaction list page
    └── components/
        ├── transaction-table.tsx
        ├── transaction-filters.tsx
        └── transaction-detail-modal.tsx
```

**No database changes required!**

---

### Phase 2: Transaction Initiation (Week 2)

**Goal:** Allow admins to initiate transfers

✅ **Tasks:**
1. Run Prisma migration to create `transactions` table
2. Run Prisma migration to create `transaction_status_history` table
3. Implement `initiateT24Transfer()` service
4. Create GraphQL mutations
5. Build transaction form UI
6. Add transaction type selection (transfer, credit, debit)
7. Implement reference generation
8. Add confirmation dialog

**Database migration:**
```bash
npx prisma migrate dev --name create_transactions
```

**Files to create:**
```
admin/
├── prisma/
│   └── migrations/
│       └── xxx_create_transactions/
│           └── migration.sql
├── lib/services/t24/
│   ├── initiate-transaction.ts
│   └── error-decoder.ts
├── lib/graphql/resolvers/
│   └── transaction-mutations.ts
└── app/mobile-banking/users/[id]/transactions/new/
    ├── page.tsx
    └── components/
        ├── transfer-form.tsx
        ├── credit-form.tsx
        └── debit-form.tsx
```

---

### Phase 3: Background Processing (Week 2-3)

**Goal:** Async transaction processing like Elixir GenServer

✅ **Tasks:**
1. Install BullMQ or use Vercel Cron Jobs
2. Create transaction processor job
3. Implement polling logic (every 5-10 seconds)
4. Add status transitions: `pending → processing → completed/failed`
5. Implement automatic status history tracking
6. Add Prisma middleware for audit trail

**Files to create:**
```
admin/
├── lib/jobs/
│   ├── transaction-processor.ts  # Background job
│   └── index.ts
├── lib/prisma/
│   └── middleware.ts             # Auto-track status changes
└── api/cron/
    └── process-transactions/
        └── route.ts              # Cron endpoint
```

**Vercel cron config (`vercel.json`):**
```json
{
  "crons": [{
    "path": "/api/cron/process-transactions",
    "schedule": "*/10 * * * * *"  // Every 10 seconds
  }]
}
```

---

### Phase 4: Advanced Features (Week 3-4)

**Goal:** Reversals, balance snapshots, audit trail

✅ **Tasks:**
1. Implement transaction reversal logic
2. Create balance snapshot recording
3. Add transaction detail view with full history
4. Implement bulk transaction processing
5. Add transaction approval workflow (optional)
6. Create audit trail dashboard
7. Add transaction analytics/charts

**Files to create:**
```
admin/
├── lib/services/
│   ├── transaction-reversal.ts
│   └── balance-snapshot.ts
└── app/mobile-banking/
    ├── transactions/
    │   ├── [id]/
    │   │   ├── page.tsx          # Transaction detail
    │   │   └── reverse/
    │   │       └── page.tsx       # Reversal form
    │   └── bulk/
    │       └── page.tsx            # Bulk operations
    └── audit/
        └── transactions/
            └── page.tsx            # Audit trail
```

---

## 🔐 Security Considerations

### 1. **Admin Authentication**

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const session = await getServerSession();
  
  if (!session?.user) {
    return NextResponse.redirect("/login");
  }
  
  // Check permissions
  if (!hasPermission(session.user, "transactions:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
}
```

### 2. **Transaction Limits**

```typescript
// lib/services/transaction-validator.ts

export function validateTransactionAmount(amount: number, user: User): boolean {
  const MAX_SINGLE_TRANSACTION = 1_000_000; // 1M MWK
  const MAX_DAILY_TOTAL = 5_000_000;         // 5M MWK
  
  if (amount > MAX_SINGLE_TRANSACTION) {
    throw new Error("Transaction exceeds single transaction limit");
  }
  
  // Check daily total
  const todayTotal = getTodayTransactionTotal(user.id);
  if (todayTotal + amount > MAX_DAILY_TOTAL) {
    throw new Error("Transaction exceeds daily limit");
  }
  
  return true;
}
```

### 3. **IP Whitelisting**

```typescript
// Similar to Elixir's IpWhitelistPlug
export function checkIpWhitelist(request: NextRequest): boolean {
  const clientIp = request.headers.get("x-forwarded-for") || 
                   request.headers.get("x-real-ip");
  
  const allowedIps = process.env.ALLOWED_IPS?.split(",") || [];
  
  return allowedIps.includes(clientIp);
}
```

### 4. **Audit Logging**

```typescript
// Record every transaction action
export async function auditLog(action: string, data: any, userId: number) {
  await prisma.auditLog.create({
    data: {
      action,
      entity_type: "transaction",
      entity_id: data.transactionId,
      user_id: userId,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
      metadata: data,
      created_at: new Date(),
    },
  });
}
```

---

## 📝 Key Takeaways

### ✅ **DO's (from Elixir patterns)**

1. ✅ **Use dual account references** - Store both string account numbers AND foreign keys
2. ✅ **Create transactions with "pending" status** - Process asynchronously
3. ✅ **Record balance snapshots** - Pre/post transaction for audit trail
4. ✅ **Auto-track status changes** - Every transition recorded in separate table
5. ✅ **Support external accounts** - Don't require accounts to exist locally
6. ✅ **Generate unique references** - Format: `BNK{timestamp}`
7. ✅ **Store T24 responses** - Keep `cbs_transaction_reference` and `external_reference`
8. ✅ **Enable reversals** - Self-referential `original_transaction_id`
9. ✅ **Rich error handling** - Decode T24 errors and store details
10. ✅ **Complete audit trail** - Track who, what, when, why for compliance

### ❌ **DON'Ts**

1. ❌ **Don't require foreign keys** - Support string account numbers
2. ❌ **Don't process synchronously** - Use background jobs
3. ❌ **Don't skip status history** - Every change must be tracked
4. ❌ **Don't trust local balances** - T24 is source of truth
5. ❌ **Don't delete failed transactions** - Keep for audit trail
6. ❌ **Don't expose raw T24 errors** - Decode and format user-friendly messages

---

## 🎯 Recommended Starting Point

Start with **Option 1: Read-Only Transaction History** because:
- ✅ No database migrations required
- ✅ Immediate value (view transaction history)
- ✅ Establishes UI patterns for Phase 2
- ✅ Tests T24 integration without risk
- ✅ Can be completed in 1-2 days

**First implementation steps:**
1. Create `lib/services/t24/client.ts`
2. Implement `getAccountTransactions(accountNumber)`
3. Add GraphQL query `accountTransactions`
4. Build transaction table component
5. Add date range filter

After this works, proceed to Phase 2 (transaction initiation).

---

## 📚 References

- Elixir Transaction Schema: `/lib/service_manager/schemas/transactions/transactions_schema.ex`
- T24 Integration: `/lib/service_manager/services/t24/messages/`
- Transaction Processor: `/lib/service_manager/processors/account_transaction_processor.ex`
- Transfer System Analysis: `/.information/domain/transfer_system_analysis.md`
- Transaction Reversal Docs: `/.information/domain/transaction_reversal_documentation.md`

---

**Next Steps:** Would you like me to start implementing Phase 1 (Read-Only Transaction History)?
