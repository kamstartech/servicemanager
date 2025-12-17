# Transaction System Implementation

## Summary
Implementation plan for a **unified transaction tracking system** that handles both wallet and mobile banking transactions in the Next.js admin app. This system provides comprehensive transaction lifecycle management with automatic retry mechanisms, balance tracking, audit trails, and background processing.

## Problem/Context
The admin system needs a **single unified table** to track all financial transactions (wallet AND mobile banking) with:
- **Unified transaction tracking**: One table for all transaction types
- **Wallet support**: Full integration with wallet (`FdhMobileUser` with `WALLET` context)
- **Mobile Banking support**: Integration with mobile banking accounts
- **Cross-platform transfers**: Wallet-to-Account, Account-to-Wallet, Account-to-Account, Wallet-to-Wallet
- **Automatic retry mechanism**: Failed transactions automatically retried with exponential backoff
- **Comprehensive status tracking**: Every status change recorded for audit
- **Balance snapshots**: Pre/post transaction balances for reconciliation
- **GraphQL API**: Complete query and mutation support
- **Background processing**: Async transaction processing with queue management

## Solution
Implement a transaction system with the following components:
1. **Prisma Schema**: Transaction models with relationships
2. **GraphQL API**: Mutations and queries for transaction operations
3. **Transaction Processor**: Background job system for processing pending transactions
4. **Balance Snapshot Service**: Pre/post transaction balance tracking
5. **Status Management**: Transaction lifecycle handling
6. **Error Handling**: Comprehensive error tracking and recovery

## Implementation Details

### Phase 1: Database Schema (Prisma)

#### 1.1 Create Transaction Models

**File**: `prisma/schema.prisma`

```prisma
// Transaction Status Enum - Enhanced for retry tracking
enum TransactionStatus {
  PENDING           // Initial state, waiting to be processed
  PROCESSING        // Currently being processed
  COMPLETED         // Successfully completed
  FAILED            // Failed, eligible for retry
  FAILED_PERMANENT  // Failed permanently, no more retries
  REVERSED          // Transaction was reversed
  PENDING_REVERSAL  // Reversal initiated but not complete
}

// Transaction Type Enum - Unified for Wallet and Banking
enum TransactionType {
  // Mobile Banking Types
  DEBIT                    // Debit from account
  CREDIT                   // Credit to account
  TRANSFER                 // Account to Account transfer
  DIRECT_TRANSFER          // Direct bank transfer
  EXTERNAL_TRANSFER        // External bank transfer
  
  // Wallet Types
  WALLET_DEBIT            // Debit from wallet
  WALLET_CREDIT           // Credit to wallet
  WALLET_TRANSFER         // Wallet to Wallet transfer
  
  // Cross-Platform Types
  ACCOUNT_TO_WALLET       // Mobile Banking Account → Wallet
  WALLET_TO_ACCOUNT       // Wallet → Mobile Banking Account
}

// Transaction Source - Identifies origin system
enum TransactionSource {
  MOBILE_BANKING    // Originated from mobile banking
  WALLET            // Originated from wallet
  ADMIN_PANEL       // Initiated by admin
  API               // External API call
  SYSTEM            // System-initiated (e.g., fees, interest)
}

// Main Unified Transaction Model
model FdhTransaction {
  id        String   @id @default(cuid())
  
  // Transaction Identity
  type      TransactionType
  source    TransactionSource @default(SYSTEM)
  reference String   @unique @db.VarChar(100)
  status    TransactionStatus @default(PENDING)
  
  // Amount Tracking
  amount         Decimal  @db.Decimal(19, 4)
  creditAmount   Decimal  @default(0) @db.Decimal(19, 4) @map("credit_amount")
  debitAmount    Decimal  @default(0) @db.Decimal(19, 4) @map("debit_amount")
  currency       String   @default("MWK") @db.VarChar(3)
  
  // Balance Tracking (for both account and wallet)
  fromOpeningBalance Decimal? @db.Decimal(19, 4) @map("from_opening_balance")
  fromClosingBalance Decimal? @db.Decimal(19, 4) @map("from_closing_balance")
  toOpeningBalance   Decimal? @db.Decimal(19, 4) @map("to_opening_balance")
  toClosingBalance   Decimal? @db.Decimal(19, 4) @map("to_closing_balance")
  
  // Transaction Details
  description    String   @db.Text
  valueDate      DateTime @map("value_date") @db.Date
  
  // Mobile Banking Account References
  fromAccountId  String?  @map("from_account_id")
  toAccountId    String?  @map("to_account_id")
  
  // Wallet References (FdhMobileUser with context=WALLET)
  fromWalletId   String?  @map("from_wallet_id")
  toWalletId     String?  @map("to_wallet_id")
  
  // Account/Wallet Numbers (for direct reference and display)
  fromAccountNumber String?  @map("from_account_number") @db.VarChar(50)
  toAccountNumber   String?  @map("to_account_number") @db.VarChar(50)
  fromWalletNumber  String?  @map("from_wallet_number") @db.VarChar(50)
  toWalletNumber    String?  @map("to_wallet_number") @db.VarChar(50)
  
  // External System References
  cbsTransactionReference String? @unique @map("cbs_transaction_reference") @db.VarChar(100)
  externalReference       String? @map("external_reference") @db.VarChar(100)
  
  // Retry Management
  retryCount        Int      @default(0) @map("retry_count")
  maxRetries        Int      @default(3) @map("max_retries")
  lastRetryAt       DateTime? @map("last_retry_at")
  nextRetryAt       DateTime? @map("next_retry_at")
  retryStrategy     String   @default("exponential") @map("retry_strategy") // "exponential", "linear", "none"
  
  // Status & Error Tracking
  failureReason      String? @db.Text @map("failure_reason")
  failureCode        String? @db.VarChar(50) @map("failure_code")
  transactionDetails Json?   @default("{}") @map("transaction_details")
  callbackStatus     String? @default("pending") @map("callback_status") @db.VarChar(20)
  
  // Reversal Support
  isReversal              Boolean @default(false) @map("is_reversal")
  originalTransactionId   String? @map("original_transaction_id")
  reversalReason          String? @db.Text @map("reversal_reason")
  originalTransaction     FdhTransaction? @relation("TransactionReversal", fields: [originalTransactionId], references: [id], onDelete: SetNull)
  reversalTransaction     FdhTransaction? @relation("TransactionReversal")
  
  // Processing Metadata
  processingStartedAt DateTime? @map("processing_started_at")
  processingCompletedAt DateTime? @map("processing_completed_at")
  processingDuration Int? @map("processing_duration") // milliseconds
  
  // Relationships - Mobile Banking Accounts
  fromAccount FdhMobileBankingAccount? @relation("FromAccountTransactions", fields: [fromAccountId], references: [id], onDelete: SetNull)
  toAccount   FdhMobileBankingAccount? @relation("ToAccountTransactions", fields: [toAccountId], references: [id], onDelete: SetNull)
  
  // Relationships - Wallets (FdhMobileUser with context=WALLET)
  fromWallet  FdhMobileUser? @relation("FromWalletTransactions", fields: [fromWalletId], references: [id], onDelete: SetNull)
  toWallet    FdhMobileUser? @relation("ToWalletTransactions", fields: [toWalletId], references: [id], onDelete: SetNull)
  
  // User who initiated (for admin/system initiated transactions)
  initiatedByUserId String? @map("initiated_by_user_id")
  initiatedBy       FdhMobileUser? @relation("InitiatedTransactions", fields: [initiatedByUserId], references: [id], onDelete: SetNull)
  
  // Audit Trail
  balanceSnapshots FdhBalanceSnapshot[]
  statusHistory    FdhTransactionStatusHistory[]
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@index([status])
  @@index([reference])
  @@index([type])
  @@index([source])
  @@index([createdAt])
  @@index([fromAccountId])
  @@index([toAccountId])
  @@index([fromWalletId])
  @@index([toWalletId])
  @@index([cbsTransactionReference])
  @@index([status, nextRetryAt]) // For retry queries
  @@index([status, type]) // For filtering
  @@map("fdh_transactions")
}

// Balance Snapshot Model (Audit Trail for Both Account and Wallet)
model FdhBalanceSnapshot {
  id            String   @id @default(cuid())
  
  // Snapshot Type
  snapshotType  String   @map("snapshot_type") // "pre" or "post"
  category      String   // "transaction_credit", "wallet_debit", etc.
  
  // Entity Type - identifies if this is for account or wallet
  entityType    String   @map("entity_type") // "account" or "wallet"
  
  // Mobile Banking Account Reference
  accountId     String?  @map("account_id")
  accountNumber String?  @map("account_number") @db.VarChar(50)
  
  // Wallet Reference (FdhMobileUser with context=WALLET)
  walletId      String?  @map("wallet_id")
  walletNumber  String?  @map("wallet_number") @db.VarChar(50) // phone number
  
  // Balance Information
  balance       Decimal  @db.Decimal(19, 4)
  currency      String   @default("MWK") @db.VarChar(3)
  
  // Transaction Reference
  transactionId String   @map("transaction_id")
  transaction   FdhTransaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  
  // Metadata (additional context)
  metadata      Json?    @default("{}")
  
  // Timestamps
  createdAt     DateTime @default(now()) @map("created_at")
  
  @@index([transactionId])
  @@index([accountId])
  @@index([walletId])
  @@index([snapshotType])
  @@index([entityType])
  @@map("fdh_balance_snapshots")
}

// Transaction Status History - Enhanced with retry tracking
model FdhTransactionStatusHistory {
  id            String   @id @default(cuid())
  
  transactionId String   @map("transaction_id")
  transaction   FdhTransaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  
  fromStatus    TransactionStatus @map("from_status")
  toStatus      TransactionStatus @map("to_status")
  
  reason        String?  @db.Text
  errorCode     String?  @db.VarChar(50) @map("error_code")
  retryNumber   Int?     @map("retry_number") // Which retry attempt this was (0 = first attempt)
  
  // Metadata including retry details, error details, etc.
  metadata      Json?    @default("{}")
  
  createdAt     DateTime @default(now()) @map("created_at")
  
  @@index([transactionId])
  @@index([toStatus])
  @@map("fdh_transaction_status_history")
}

// REMOVED: FdhTransactionQueue (queue functionality now in main transaction table)
// The retry logic is built into the FdhTransaction model itself via:
// - retryCount, maxRetries, lastRetryAt, nextRetryAt fields
// - Transactions with status=FAILED and retryCount < maxRetries are auto-retried
  
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  
  @@index([nextRetryAt])
  @@index([priority])
  @@map("fdh_transaction_queue")
}
```

Admin UI:
- Admin users can create transfer transactions from the Admin Panel at `Mobile banking` -> `Transactions` using the `Add` button.

#### 1.2 Update Existing Models

Add transaction relationships to existing models:

```prisma
model FdhMobileBankingAccount {
  // ... existing fields ...
  
  // Add transaction relationships for mobile banking
  outgoingTransactions FdhTransaction[] @relation("FromAccountTransactions")
  incomingTransactions FdhTransaction[] @relation("ToAccountTransactions")
  
  // ... rest of the model ...
}

model FdhMobileUser {
  // ... existing fields ...
  
  // Add wallet transaction relationships (for users with context=WALLET)
  outgoingWalletTransactions FdhTransaction[] @relation("FromWalletTransactions")
  incomingWalletTransactions FdhTransaction[] @relation("ToWalletTransactions")
  initiatedTransactions      FdhTransaction[] @relation("InitiatedTransactions")
  
  // Add wallet balance field if not exists (for WALLET context users)
  // walletBalance Decimal? @db.Decimal(19, 4) @map("wallet_balance")
  
  // ... rest of the model ...
}
```

### Transaction Type Use Cases

#### Mobile Banking Transactions
1. **DEBIT**: Withdraw from mobile banking account
2. **CREDIT**: Deposit to mobile banking account  
3. **TRANSFER**: Transfer between two mobile banking accounts
4. **DIRECT_TRANSFER**: Direct bank transfer (same bank)
5. **EXTERNAL_TRANSFER**: Transfer to external bank

#### Wallet Transactions (FdhMobileUser with context=WALLET)
1. **WALLET_DEBIT**: Withdraw from wallet
2. **WALLET_CREDIT**: Deposit to wallet
3. **WALLET_TRANSFER**: Transfer between two wallets

#### Cross-Platform Transactions
1. **ACCOUNT_TO_WALLET**: Transfer from mobile banking account to wallet
2. **WALLET_TO_ACCOUNT**: Transfer from wallet to mobile banking account

### How Unified Transaction Tracking Works

#### 1. Single Transaction Table for All Types
The `FdhTransaction` table tracks:
- ✅ Mobile banking account transactions (using `fromAccountId`/`toAccountId`)
- ✅ Wallet transactions (using `fromWalletId`/`toWalletId`)
- ✅ Cross-platform transfers (using both account and wallet IDs)

#### 2. Automatic Retry Mechanism

**Built-in Retry Fields:**
```typescript
retryCount: 0        // Current retry attempt
maxRetries: 3        // Maximum retries before FAILED_PERMANENT
lastRetryAt: null    // When last retry occurred
nextRetryAt: null    // When next retry should occur
retryStrategy: "exponential"  // "exponential", "linear", "none"
```

**Retry Flow:**
```
1. Transaction created → status: PENDING
2. Processing fails → status: FAILED, retryCount: 0
3. Cron job picks up → nextRetryAt calculated (e.g., 2 minutes)
4. After 2 minutes → retryCount: 1, status: PENDING
5. Processing fails again → status: FAILED, retryCount: 1
6. After 4 minutes → retryCount: 2, status: PENDING
7. If fails 3 times → status: FAILED_PERMANENT (no more retries)
```

**Retry Strategies:**
- **Exponential**: 2^retryCount minutes (1min, 2min, 4min, 8min...)
- **Linear**: retryCount * 5 minutes (5min, 10min, 15min...)
- **None**: No automatic retry

#### 3. Balance Snapshot for Both Account and Wallet

Each transaction captures:
- Pre-transaction balance (both sender and receiver)
- Post-transaction balance (both sender and receiver)
- Entity type: "account" or "wallet"

Example for Account-to-Wallet transfer:
```typescript
// Pre-snapshots
[
  { entityType: "account", accountId: "acc123", balance: "1000.00", snapshotType: "pre" },
  { entityType: "wallet", walletId: "wallet456", balance: "500.00", snapshotType: "pre" }
]

// Post-snapshots  
[
  { entityType: "account", accountId: "acc123", balance: "900.00", snapshotType: "post" },
  { entityType: "wallet", walletId: "wallet456", balance: "600.00", snapshotType: "post" }
]
```

#### 4. Status History with Retry Tracking

Every status change is recorded:
```typescript
{
  fromStatus: "PENDING",
  toStatus: "FAILED",
  retryNumber: 0,
  reason: "Insufficient funds",
  errorCode: "INSUFFICIENT_FUNDS"
}

// After retry
{
  fromStatus: "FAILED", 
  toStatus: "PENDING",
  retryNumber: 1,
  reason: "Automatic retry"
}
```

### Phase 1.3: Query Helpers

Add these to help fetch retryable transactions:

```typescript
// In your service layer
async function getRetryableTransactions() {
  return await prisma.fdhTransaction.findMany({
    where: {
      status: TransactionStatus.FAILED,
      retryCount: { lt: prisma.fdhTransaction.fields.maxRetries },
      nextRetryAt: { lte: new Date() }
    },
    orderBy: { nextRetryAt: 'asc' }
  });
}
```



### Phase 2: GraphQL Schema & Resolvers

#### 2.1 GraphQL Type Definitions

**File**: `lib/graphql/schema/transactions.ts`

```typescript
import { gql } from "graphql-tag";

export const transactionTypeDefs = gql`
  # Enums
  enum TransactionStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
    FAILED_PERMANENT
    REVERSED
    PENDING_REVERSAL
  }

  enum TransactionType {
    # Mobile Banking
    DEBIT
    CREDIT
    TRANSFER
    DIRECT_TRANSFER
    EXTERNAL_TRANSFER
    
    # Wallet
    WALLET_DEBIT
    WALLET_CREDIT
    WALLET_TRANSFER
    
    # Cross-Platform
    ACCOUNT_TO_WALLET
    WALLET_TO_ACCOUNT
  }

  enum TransactionSource {
    MOBILE_BANKING
    WALLET
    ADMIN_PANEL
    API
    SYSTEM
  }

  # Types
  type Transaction {
    id: ID!
    type: TransactionType!
    source: TransactionSource!
    reference: String!
    status: TransactionStatus!
    
    # Amounts
    amount: Decimal!
    creditAmount: Decimal!
    debitAmount: Decimal!
    currency: String!
    
    # Balance Tracking
    fromOpeningBalance: Decimal
    fromClosingBalance: Decimal
    toOpeningBalance: Decimal
    toClosingBalance: Decimal
    
    description: String!
    valueDate: Date!
    
    # Mobile Banking Account References
    fromAccountId: String
    toAccountId: String
    fromAccountNumber: String
    toAccountNumber: String
    
    # Wallet References
    fromWalletId: String
    toWalletId: String
    fromWalletNumber: String
    toWalletNumber: String
    
    # External System References
    cbsTransactionReference: String
    externalReference: String
    
    # Retry Management
    retryCount: Int!
    maxRetries: Int!
    lastRetryAt: DateTime
    nextRetryAt: DateTime
    retryStrategy: String!
    
    # Status & Error Tracking
    failureReason: String
    failureCode: String
    transactionDetails: JSON
    callbackStatus: String
    
    # Reversal Support
    isReversal: Boolean!
    originalTransactionId: String
    reversalReason: String
    
    # Processing Metadata
    processingStartedAt: DateTime
    processingCompletedAt: DateTime
    processingDuration: Int
    
    # Relationships
    fromAccount: MobileBankingAccount
    toAccount: MobileBankingAccount
    fromWallet: MobileUser
    toWallet: MobileUser
    initiatedBy: MobileUser
    
    balanceSnapshots: [BalanceSnapshot!]!
    statusHistory: [TransactionStatusHistory!]!
    
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type BalanceSnapshot {
    id: ID!
    snapshotType: String!
    category: String!
    entityType: String!
    balance: Decimal!
    currency: String!
    accountNumber: String
    walletNumber: String
    metadata: JSON
    createdAt: DateTime!
  }

  type TransactionStatusHistory {
    id: ID!
    fromStatus: TransactionStatus!
    toStatus: TransactionStatus!
    reason: String
    errorCode: String
    retryNumber: Int
    metadata: JSON
    createdAt: DateTime!
  }

  # Input Types
  input CreateTransactionInput {
    type: TransactionType!
    source: TransactionSource
    amount: Decimal!
    description: String!
    currency: String
    
    # Mobile Banking Account IDs
    fromAccountId: String
    toAccountId: String
    
    # Wallet IDs (FdhMobileUser with context=WALLET)
    fromWalletId: String
    toWalletId: String
    
    # Direct account/wallet numbers (alternative to IDs)
    fromAccountNumber: String
    toAccountNumber: String
    fromWalletNumber: String
    toWalletNumber: String
    
    # Retry configuration
    maxRetries: Int
    retryStrategy: String
    
    transactionDetails: JSON
  }

  input TransactionFilterInput {
    status: TransactionStatus
    type: TransactionType
    source: TransactionSource
    dateFrom: DateTime
    dateTo: DateTime
    minAmount: Decimal
    maxAmount: Decimal
    accountId: String
    walletId: String
    includeRetryable: Boolean
    search: String
  }

  # Response Types
  type CreateTransactionResponse {
    success: Boolean!
    transaction: Transaction
    message: String!
    errors: [String!]
  }

  type TransactionConnection {
    transactions: [Transaction!]!
    totalCount: Int!
    pageInfo: PageInfo!
  }
  
  type RetryStats {
    totalRetryable: Int!
    byStatus: JSON!
    nextRetryTime: DateTime
  }

  # Queries
  extend type Query {
    transaction(id: ID!): Transaction
    transactionByReference(reference: String!): Transaction
    transactions(
      filter: TransactionFilterInput
      page: Int = 1
      limit: Int = 20
    ): TransactionConnection!
    
    # Account-specific transactions (mobile banking)
    accountTransactions(
      accountId: ID!
      page: Int = 1
      limit: Int = 20
    ): TransactionConnection!
    
    # Wallet-specific transactions
    walletTransactions(
      walletId: ID!
      page: Int = 1
      limit: Int = 20
    ): TransactionConnection!
    
    # Get transactions ready for processing
    pendingTransactions(
      limit: Int = 100
    ): [Transaction!]!
    
    # Get transactions eligible for retry
    retryableTransactions(
      limit: Int = 100
    ): [Transaction!]!
    
    # Get retry statistics
    transactionRetryStats: RetryStats!
  }

  # Mutations
  extend type Mutation {
    createTransaction(input: CreateTransactionInput!): CreateTransactionResponse!
    
    # Manual processing trigger
    processTransaction(id: ID!): CreateTransactionResponse!
    
    # Retry a failed transaction
    retryFailedTransaction(id: ID!): CreateTransactionResponse!
    
    reverseTransaction(
      transactionId: ID!
      reason: String!
    ): CreateTransactionResponse!
  }
`;
```

#### 2.2 Transaction Resolvers

**File**: `lib/graphql/resolvers/transactions.ts`

```typescript
import { GraphQLError } from "graphql";
import { GraphQLContext } from "../context";
import prisma from "@/lib/prisma";
import { Prisma, TransactionStatus, TransactionType } from "@prisma/client";
import { createBalanceSnapshot } from "@/lib/services/balance-snapshot-service";
import { enqueueTransaction } from "@/lib/services/transaction-queue-service";
import { generateTransactionReference } from "@/lib/utils/reference-generator";
import { Decimal } from "@prisma/client/runtime/library";

export const transactionResolvers = {
  Query: {
    transaction: async (
      _: any,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      if (!context.adminUser && !context.mobileUser) {
        throw new GraphQLError("Unauthorized", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const transaction = await prisma.fdhTransaction.findUnique({
        where: { id },
        include: {
          fromAccount: true,
          toAccount: true,
          fromWallet: true,
          toWallet: true,
          balanceSnapshots: true,
          statusHistory: true,
        },
      });

      if (!transaction) {
        throw new GraphQLError("Transaction not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      // Authorization: mobile users can only see their own transactions
      if (context.mobileUser) {
        const hasAccess =
          transaction.fromWalletId === context.mobileUser.id ||
          transaction.toWalletId === context.mobileUser.id ||
          transaction.fromAccountId ===
            context.mobileUser.mobileBankingAccounts?.[0]?.id ||
          transaction.toAccountId ===
            context.mobileUser.mobileBankingAccounts?.[0]?.id;

        if (!hasAccess) {
          throw new GraphQLError("Forbidden", {
            extensions: { code: "FORBIDDEN" },
          });
        }
      }

      return transaction;
    },

    transactionByReference: async (
      _: any,
      { reference }: { reference: string },
      context: GraphQLContext
    ) => {
      if (!context.adminUser && !context.mobileUser) {
        throw new GraphQLError("Unauthorized", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      return await prisma.fdhTransaction.findUnique({
        where: { reference },
        include: {
          fromAccount: true,
          toAccount: true,
          fromWallet: true,
          toWallet: true,
          balanceSnapshots: true,
          statusHistory: true,
        },
      });
    },

    transactions: async (
      _: any,
      {
        filter,
        page = 1,
        limit = 20,
      }: {
        filter?: any;
        page?: number;
        limit?: number;
      },
      context: GraphQLContext
    ) => {
      if (!context.adminUser) {
        throw new GraphQLError("Admin access required", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const where: Prisma.FdhTransactionWhereInput = {};

      if (filter) {
        if (filter.status) where.status = filter.status;
        if (filter.type) where.type = filter.type;
        if (filter.dateFrom || filter.dateTo) {
          where.createdAt = {};
          if (filter.dateFrom) where.createdAt.gte = new Date(filter.dateFrom);
          if (filter.dateTo) where.createdAt.lte = new Date(filter.dateTo);
        }
        if (filter.minAmount || filter.maxAmount) {
          where.amount = {};
          if (filter.minAmount) where.amount.gte = new Decimal(filter.minAmount);
          if (filter.maxAmount) where.amount.lte = new Decimal(filter.maxAmount);
        }
        if (filter.accountId) {
          where.OR = [
            { fromAccountId: filter.accountId },
            { toAccountId: filter.accountId },
          ];
        }
        if (filter.search) {
          where.OR = [
            { reference: { contains: filter.search, mode: "insensitive" } },
            { description: { contains: filter.search, mode: "insensitive" } },
            {
              senderAccount: { contains: filter.search, mode: "insensitive" },
            },
            {
              receiverAccount: { contains: filter.search, mode: "insensitive" },
            },
          ];
        }
      }

      const [transactions, totalCount] = await Promise.all([
        prisma.fdhTransaction.findMany({
          where,
          include: {
            fromAccount: true,
            toAccount: true,
            fromWallet: true,
            toWallet: true,
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.fdhTransaction.count({ where }),
      ]);

      return {
        transactions,
        totalCount,
        pageInfo: {
          hasNextPage: page * limit < totalCount,
          hasPreviousPage: page > 1,
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    },

    accountTransactions: async (
      _: any,
      {
        accountId,
        page = 1,
        limit = 20,
      }: { accountId: string; page?: number; limit?: number },
      context: GraphQLContext
    ) => {
      if (!context.adminUser && !context.mobileUser) {
        throw new GraphQLError("Unauthorized", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      // Verify account ownership for mobile users
      if (context.mobileUser) {
        const account = await prisma.fdhMobileBankingAccount.findUnique({
          where: { id: accountId },
        });

        if (account?.userId !== context.mobileUser.id) {
          throw new GraphQLError("Forbidden", {
            extensions: { code: "FORBIDDEN" },
          });
        }
      }

      const where: Prisma.FdhTransactionWhereInput = {
        OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
      };

      const [transactions, totalCount] = await Promise.all([
        prisma.fdhTransaction.findMany({
          where,
          include: {
            fromAccount: true,
            toAccount: true,
            fromWallet: true,
            toWallet: true,
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.fdhTransaction.count({ where }),
      ]);

      return {
        transactions,
        totalCount,
        pageInfo: {
          hasNextPage: page * limit < totalCount,
          hasPreviousPage: page > 1,
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    },

    pendingTransactions: async (
      _: any,
      { limit = 100 }: { limit?: number },
      context: GraphQLContext
    ) => {
      if (!context.adminUser) {
        throw new GraphQLError("Admin access required", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      return await prisma.fdhTransaction.findMany({
        where: { status: TransactionStatus.PENDING },
        orderBy: { createdAt: "asc" },
        take: limit,
        include: {
          fromAccount: true,
          toAccount: true,
          fromWallet: true,
          toWallet: true,
        },
      });
    },
  },

  Mutation: {
    createTransaction: async (
      _: any,
      { input }: { input: any },
      context: GraphQLContext
    ) => {
      if (!context.adminUser && !context.mobileUser) {
        throw new GraphQLError("Unauthorized", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      try {
        // Generate unique reference
        const reference = generateTransactionReference();

        // Calculate credit/debit amounts
        const amount = new Decimal(input.amount);
        const creditAmount =
          input.type === TransactionType.CREDIT ||
          input.type === TransactionType.TRANSFER
            ? amount
            : new Decimal(0);
        const debitAmount =
          input.type === TransactionType.DEBIT ||
          input.type === TransactionType.TRANSFER
            ? amount
            : new Decimal(0);

        // Create transaction
        const transaction = await prisma.fdhTransaction.create({
          data: {
            type: input.type,
            reference,
            status: TransactionStatus.PENDING,
            amount,
            creditAmount,
            debitAmount,
            description: input.description,
            valueDate: new Date(),
            fromAccountId: input.fromAccountId,
            toAccountId: input.toAccountId,
            fromWalletId: input.fromWalletId,
            toWalletId: input.toWalletId,
            senderAccount: input.senderAccount,
            receiverAccount: input.receiverAccount,
            transactionDetails: input.transactionDetails || {},
          },
          include: {
            fromAccount: true,
            toAccount: true,
            fromWallet: true,
            toWallet: true,
          },
        });

        // Create status history
        await prisma.fdhTransactionStatusHistory.create({
          data: {
            transactionId: transaction.id,
            fromStatus: TransactionStatus.PENDING,
            toStatus: TransactionStatus.PENDING,
            reason: "Transaction created",
          },
        });

        // Enqueue for processing
        await enqueueTransaction(transaction.id);

        return {
          success: true,
          transaction,
          message: "Transaction created successfully",
          errors: [],
        };
      } catch (error) {
        console.error("Create transaction error:", error);
        return {
          success: false,
          transaction: null,
          message: "Failed to create transaction",
          errors: [error instanceof Error ? error.message : "Unknown error"],
        };
      }
    },

    processTransaction: async (
      _: any,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      if (!context.adminUser) {
        throw new GraphQLError("Admin access required", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      // Re-enqueue for processing
      await enqueueTransaction(id, 10); // High priority

      const transaction = await prisma.fdhTransaction.findUnique({
        where: { id },
        include: {
          fromAccount: true,
          toAccount: true,
          fromWallet: true,
          toWallet: true,
        },
      });

      return {
        success: true,
        transaction,
        message: "Transaction queued for processing",
        errors: [],
      };
    },

    retryFailedTransaction: async (
      _: any,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      if (!context.adminUser) {
        throw new GraphQLError("Admin access required", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const transaction = await prisma.fdhTransaction.findUnique({
        where: { id },
      });

      if (!transaction) {
        throw new GraphQLError("Transaction not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      if (transaction.status !== TransactionStatus.FAILED) {
        throw new GraphQLError("Only failed transactions can be retried", {
          extensions: { code: "BAD_REQUEST" },
        });
      }

      // Reset to pending
      const updatedTransaction = await prisma.fdhTransaction.update({
        where: { id },
        data: {
          status: TransactionStatus.PENDING,
          failureReason: null,
        },
        include: {
          fromAccount: true,
          toAccount: true,
          fromWallet: true,
          toWallet: true,
        },
      });

      // Create status history
      await prisma.fdhTransactionStatusHistory.create({
        data: {
          transactionId: id,
          fromStatus: TransactionStatus.FAILED,
          toStatus: TransactionStatus.PENDING,
          reason: "Manual retry by admin",
        },
      });

      // Enqueue for processing
      await enqueueTransaction(id, 10);

      return {
        success: true,
        transaction: updatedTransaction,
        message: "Transaction retry initiated",
        errors: [],
      };
    },

    reverseTransaction: async (
      _: any,
      { transactionId, reason }: { transactionId: string; reason: string },
      context: GraphQLContext
    ) => {
      if (!context.adminUser) {
        throw new GraphQLError("Admin access required", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const originalTransaction = await prisma.fdhTransaction.findUnique({
        where: { id: transactionId },
        include: {
          fromAccount: true,
          toAccount: true,
          fromWallet: true,
          toWallet: true,
        },
      });

      if (!originalTransaction) {
        throw new GraphQLError("Transaction not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      if (originalTransaction.status !== TransactionStatus.COMPLETED) {
        throw new GraphQLError("Only completed transactions can be reversed", {
          extensions: { code: "BAD_REQUEST" },
        });
      }

      if (originalTransaction.isReversal) {
        throw new GraphQLError("Cannot reverse a reversal transaction", {
          extensions: { code: "BAD_REQUEST" },
        });
      }

      // Create reversal transaction (swap from/to)
      const reversalReference = generateTransactionReference();
      const reversalTransaction = await prisma.fdhTransaction.create({
        data: {
          type: originalTransaction.type,
          reference: reversalReference,
          status: TransactionStatus.PENDING,
          amount: originalTransaction.amount,
          creditAmount: originalTransaction.debitAmount,
          debitAmount: originalTransaction.creditAmount,
          description: `Reversal: ${reason}`,
          valueDate: new Date(),
          fromAccountId: originalTransaction.toAccountId, // Swap
          toAccountId: originalTransaction.fromAccountId, // Swap
          fromWalletId: originalTransaction.toWalletId, // Swap
          toWalletId: originalTransaction.fromWalletId, // Swap
          senderAccount: originalTransaction.receiverAccount,
          receiverAccount: originalTransaction.senderAccount,
          isReversal: true,
          originalTransactionId: originalTransaction.id,
          transactionDetails: {
            reversalReason: reason,
            originalReference: originalTransaction.reference,
          },
        },
        include: {
          fromAccount: true,
          toAccount: true,
          fromWallet: true,
          toWallet: true,
        },
      });

      // Update original transaction status
      await prisma.fdhTransaction.update({
        where: { id: transactionId },
        data: { status: TransactionStatus.REVERSED },
      });

      // Enqueue reversal for processing
      await enqueueTransaction(reversalTransaction.id, 10);

      return {
        success: true,
        transaction: reversalTransaction,
        message: "Reversal transaction created",
        errors: [],
      };
    },
  },

  Transaction: {
    fromAccount: async (parent: any) => {
      if (!parent.fromAccountId) return null;
      return (
        parent.fromAccount ||
        (await prisma.fdhMobileBankingAccount.findUnique({
          where: { id: parent.fromAccountId },
        }))
      );
    },
    toAccount: async (parent: any) => {
      if (!parent.toAccountId) return null;
      return (
        parent.toAccount ||
        (await prisma.fdhMobileBankingAccount.findUnique({
          where: { id: parent.toAccountId },
        }))
      );
    },
    fromWallet: async (parent: any) => {
      if (!parent.fromWalletId) return null;
      return (
        parent.fromWallet ||
        (await prisma.fdhMobileUser.findUnique({
          where: { id: parent.fromWalletId },
        }))
      );
    },
    toWallet: async (parent: any) => {
      if (!parent.toWalletId) return null;
      return (
        parent.toWallet ||
        (await prisma.fdhMobileUser.findUnique({
          where: { id: parent.toWalletId },
        }))
      );
    },
    balanceSnapshots: async (parent: any) => {
      return (
        parent.balanceSnapshots ||
        (await prisma.fdhBalanceSnapshot.findMany({
          where: { transactionId: parent.id },
          orderBy: { createdAt: "asc" },
        }))
      );
    },
    statusHistory: async (parent: any) => {
      return (
        parent.statusHistory ||
        (await prisma.fdhTransactionStatusHistory.findMany({
          where: { transactionId: parent.id },
          orderBy: { createdAt: "asc" },
        }))
      );
    },
  },
};
```

### Phase 3: Background Transaction Processor

#### 3.1 Transaction Queue Service

**File**: `lib/services/transaction-queue-service.ts`

```typescript
import prisma from "@/lib/prisma";
import { TransactionStatus } from "@prisma/client";

export async function enqueueTransaction(
  transactionId: string,
  priority: number = 0
): Promise<void> {
  await prisma.fdhTransactionQueue.upsert({
    where: { transactionId },
    create: {
      transactionId,
      priority,
      nextRetryAt: new Date(),
    },
    update: {
      priority,
      nextRetryAt: new Date(),
    },
  });
}

export async function getNextPendingTransactions(
  limit: number = 10
): Promise<string[]> {
  const now = new Date();
  
  const queueItems = await prisma.fdhTransactionQueue.findMany({
    where: {
      OR: [
        { nextRetryAt: { lte: now } },
        { nextRetryAt: null },
      ],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: limit,
  });

  return queueItems.map((item) => item.transactionId);
}

export async function markQueueItemProcessed(
  transactionId: string
): Promise<void> {
  await prisma.fdhTransactionQueue.delete({
    where: { transactionId },
  });
}

export async function markQueueItemFailed(
  transactionId: string,
  error: string
): Promise<void> {
  const queueItem = await prisma.fdhTransactionQueue.findUnique({
    where: { transactionId },
  });

  if (!queueItem) return;

  const attempts = queueItem.attempts + 1;
  const maxAttempts = queueItem.maxAttempts;

  if (attempts >= maxAttempts) {
    // Max retries reached, remove from queue
    await prisma.fdhTransactionQueue.delete({
      where: { transactionId },
    });

    // Mark transaction as failed
    await prisma.fdhTransaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.FAILED,
        failureReason: `Max retries exceeded: ${error}`,
      },
    });
  } else {
    // Schedule next retry with exponential backoff
    const nextRetryAt = new Date(
      Date.now() + Math.pow(2, attempts) * 60000 // 2^attempts minutes
    );

    await prisma.fdhTransactionQueue.update({
      where: { transactionId },
      data: {
        attempts,
        lastError: error,
        nextRetryAt,
      },
    });
  }
}
```

#### 3.2 Transaction Processor

**File**: `lib/services/transaction-processor.ts`

```typescript
import prisma from "@/lib/prisma";
import { TransactionStatus, TransactionType } from "@prisma/client";
import { createBalanceSnapshot } from "./balance-snapshot-service";
import {
  markQueueItemProcessed,
  markQueueItemFailed,
} from "./transaction-queue-service";

export async function processTransaction(transactionId: string): Promise<void> {
  const transaction = await prisma.fdhTransaction.findUnique({
    where: { id: transactionId },
    include: {
      fromAccount: true,
      toAccount: true,
      fromWallet: true,
      toWallet: true,
    },
  });

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  if (transaction.status !== TransactionStatus.PENDING) {
    console.log(
      `Transaction ${transactionId} is not pending (status: ${transaction.status})`
    );
    return;
  }

  try {
    // Update status to PROCESSING
    await updateTransactionStatus(
      transactionId,
      TransactionStatus.PENDING,
      TransactionStatus.PROCESSING
    );

    // Create pre-transaction snapshots
    await createPreTransactionSnapshots(transaction);

    // Process based on type
    switch (transaction.type) {
      case TransactionType.CREDIT:
        await processCreditTransaction(transaction);
        break;
      case TransactionType.DEBIT:
        await processDebitTransaction(transaction);
        break;
      case TransactionType.TRANSFER:
      case TransactionType.DIRECT_TRANSFER:
      case TransactionType.EXTERNAL_TRANSFER:
        await processTransferTransaction(transaction);
        break;
      default:
        throw new Error(`Unsupported transaction type: ${transaction.type}`);
    }

    // Create post-transaction snapshots
    await createPostTransactionSnapshots(transaction);

    // Update status to COMPLETED
    await updateTransactionStatus(
      transactionId,
      TransactionStatus.PROCESSING,
      TransactionStatus.COMPLETED
    );

    // Update processed timestamp
    await prisma.fdhTransaction.update({
      where: { id: transactionId },
      data: { processedAt: new Date() },
    });

    // Remove from queue
    await markQueueItemProcessed(transactionId);

    console.log(`Transaction ${transactionId} processed successfully`);
  } catch (error) {
    console.error(`Error processing transaction ${transactionId}:`, error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Update status to FAILED
    await updateTransactionStatus(
      transactionId,
      TransactionStatus.PROCESSING,
      TransactionStatus.FAILED,
      errorMessage
    );

    // Mark queue item as failed (will retry or remove)
    await markQueueItemFailed(transactionId, errorMessage);
  }
}

async function processCreditTransaction(transaction: any): Promise<void> {
  if (!transaction.toAccountId && !transaction.toWalletId) {
    throw new Error("No destination account or wallet specified for credit");
  }

  // For now, this would integrate with T24 or update local balance
  // Placeholder for external system integration
  console.log(`Processing credit transaction ${transaction.id}`);

  // TODO: Integrate with T24 API for actual balance updates
  // await t24Service.creditAccount(transaction.toAccount.accountNumber, transaction.amount);
}

async function processDebitTransaction(transaction: any): Promise<void> {
  if (!transaction.fromAccountId && !transaction.fromWalletId) {
    throw new Error("No source account or wallet specified for debit");
  }

  // For now, this would integrate with T24 or update local balance
  console.log(`Processing debit transaction ${transaction.id}`);

  // TODO: Integrate with T24 API for actual balance updates
  // await t24Service.debitAccount(transaction.fromAccount.accountNumber, transaction.amount);
}

async function processTransferTransaction(transaction: any): Promise<void> {
  if (
    (!transaction.fromAccountId && !transaction.fromWalletId) ||
    (!transaction.toAccountId && !transaction.toWalletId)
  ) {
    throw new Error(
      "Source and destination accounts/wallets must be specified for transfer"
    );
  }

  console.log(`Processing transfer transaction ${transaction.id}`);

  // TODO: Integrate with T24 API for actual transfers
  // await t24Service.transferFunds(
  //   transaction.fromAccount.accountNumber,
  //   transaction.toAccount.accountNumber,
  //   transaction.amount
  // );
}

async function createPreTransactionSnapshots(transaction: any): Promise<void> {
  if (transaction.fromAccountId) {
    await createBalanceSnapshot({
      snapshotType: "pre",
      category: `transaction_${transaction.type.toLowerCase()}`,
      accountId: transaction.fromAccountId,
      accountNumber: transaction.fromAccount?.accountNumber,
      balance: transaction.fromAccount?.balance || "0",
      transactionId: transaction.id,
    });
  }

  if (transaction.toAccountId) {
    await createBalanceSnapshot({
      snapshotType: "pre",
      category: `transaction_${transaction.type.toLowerCase()}`,
      accountId: transaction.toAccountId,
      accountNumber: transaction.toAccount?.accountNumber,
      balance: transaction.toAccount?.balance || "0",
      transactionId: transaction.id,
    });
  }

  // Similar for wallets if applicable
  if (transaction.fromWalletId) {
    await createBalanceSnapshot({
      snapshotType: "pre",
      category: `transaction_${transaction.type.toLowerCase()}`,
      walletId: transaction.fromWalletId,
      balance: transaction.fromWallet?.walletBalance || "0",
      transactionId: transaction.id,
    });
  }

  if (transaction.toWalletId) {
    await createBalanceSnapshot({
      snapshotType: "pre",
      category: `transaction_${transaction.type.toLowerCase()}`,
      walletId: transaction.toWalletId,
      balance: transaction.toWallet?.walletBalance || "0",
      transactionId: transaction.id,
    });
  }
}

async function createPostTransactionSnapshots(transaction: any): Promise<void> {
  // Refetch accounts/wallets to get updated balances
  if (transaction.fromAccountId) {
    const account = await prisma.fdhMobileBankingAccount.findUnique({
      where: { id: transaction.fromAccountId },
    });
    await createBalanceSnapshot({
      snapshotType: "post",
      category: `transaction_${transaction.type.toLowerCase()}`,
      accountId: transaction.fromAccountId,
      accountNumber: account?.accountNumber,
      balance: account?.balance || "0",
      transactionId: transaction.id,
    });
  }

  if (transaction.toAccountId) {
    const account = await prisma.fdhMobileBankingAccount.findUnique({
      where: { id: transaction.toAccountId },
    });
    await createBalanceSnapshot({
      snapshotType: "post",
      category: `transaction_${transaction.type.toLowerCase()}`,
      accountId: transaction.toAccountId,
      accountNumber: account?.accountNumber,
      balance: account?.balance || "0",
      transactionId: transaction.id,
    });
  }

  // Similar for wallets
  if (transaction.fromWalletId) {
    const wallet = await prisma.fdhMobileUser.findUnique({
      where: { id: transaction.fromWalletId },
    });
    await createBalanceSnapshot({
      snapshotType: "post",
      category: `transaction_${transaction.type.toLowerCase()}`,
      walletId: transaction.fromWalletId,
      balance: wallet?.walletBalance || "0",
      transactionId: transaction.id,
    });
  }

  if (transaction.toWalletId) {
    const wallet = await prisma.fdhMobileUser.findUnique({
      where: { id: transaction.toWalletId },
    });
    await createBalanceSnapshot({
      snapshotType: "post",
      category: `transaction_${transaction.type.toLowerCase()}`,
      walletId: transaction.toWalletId,
      balance: wallet?.walletBalance || "0",
      transactionId: transaction.id,
    });
  }
}

async function updateTransactionStatus(
  transactionId: string,
  fromStatus: TransactionStatus,
  toStatus: TransactionStatus,
  reason?: string
): Promise<void> {
  await prisma.fdhTransaction.update({
    where: { id: transactionId },
    data: { status: toStatus, ...(reason && { failureReason: reason }) },
  });

  await prisma.fdhTransactionStatusHistory.create({
    data: {
      transactionId,
      fromStatus,
      toStatus,
      reason,
    },
  });
}
```

#### 3.3 Balance Snapshot Service

**File**: `lib/services/balance-snapshot-service.ts`

```typescript
import prisma from "@/lib/prisma";

interface CreateBalanceSnapshotInput {
  snapshotType: "pre" | "post";
  category: string;
  accountId?: string;
  walletId?: string;
  accountNumber?: string;
  balance: string;
  transactionId: string;
  metadata?: any;
}

export async function createBalanceSnapshot(
  input: CreateBalanceSnapshotInput
): Promise<void> {
  await prisma.fdhBalanceSnapshot.create({
    data: {
      snapshotType: input.snapshotType,
      category: input.category,
      accountId: input.accountId,
      walletId: input.walletId,
      accountNumber: input.accountNumber,
      balance: input.balance,
      transactionId: input.transactionId,
      metadata: input.metadata || {},
    },
  });
}
```

#### 3.4 Cron Job for Processing

**File**: `lib/jobs/transaction-processor-job.ts`

```typescript
import cron from "node-cron";
import { getNextPendingTransactions } from "@/lib/services/transaction-queue-service";
import { processTransaction } from "@/lib/services/transaction-processor";

// Process transactions every 10 seconds
export function startTransactionProcessor() {
  console.log("Starting transaction processor job...");

  cron.schedule("*/10 * * * * *", async () => {
    try {
      const transactionIds = await getNextPendingTransactions(10);

      if (transactionIds.length === 0) {
        return;
      }

      console.log(`Processing ${transactionIds.length} pending transactions`);

      // Process transactions in parallel (limit concurrency)
      await Promise.allSettled(
        transactionIds.map((id) => processTransaction(id))
      );
    } catch (error) {
      console.error("Error in transaction processor job:", error);
    }
  });
}
```

#### 3.5 Initialize Job in instrumentation.ts

**File**: `instrumentation.ts` (add to existing file)

```typescript
import { startTransactionProcessor } from "@/lib/jobs/transaction-processor-job";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Start transaction processor in server runtime
    startTransactionProcessor();
    
    // ... other existing jobs ...
  }
}
```

### Phase 4: Utility Functions

#### 4.1 Reference Generator

**File**: `lib/utils/reference-generator.ts`

```typescript
export function generateTransactionReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN${timestamp}${random}`;
}
```

## Usage

### Creating a Transaction via GraphQL

```graphql
mutation CreateTransaction {
  createTransaction(
    input: {
      type: TRANSFER
      context: MOBILE_BANKING
      transferType: FDH_BANK
      amount: "100.50"
      currency: "MWK"
      description: "Transfer to savings"
      fromAccountNumber: "ACC001"
      toAccountNumber: "ACC002"
    }
  ) {
    success
    message
    transaction {
      id
      reference
      status
      amount
    }
    errors
  }
}
```

### Creating a Transfer (Unified API)

Use `createTransfer` when you want a single mutation to support multiple transfer types.

Types:
- `FDH_BANK`: Internal/FDH bank account-to-account transfer
- `EXTERNAL_BANK`: Bank-to-other-bank (external beneficiary) transfer
- `FDH_WALLET`: Internal wallet-to-wallet transfer (wallet accounts are represented by account numbers)
- `EXTERNAL_WALLET`: Wallet-to-external-wallet transfer
- `SELF`: Transfer between two accounts owned by the same user

```graphql
mutation CreateTransfer {
  createTransfer(
    input: {
      type: FDH_BANK
      context: MOBILE_BANKING
      fromAccountId: 123
      toAccountNumber: "0987654321"
      amount: "100.50"
      currency: "MWK"
      description: "Funds transfer"
    }
  ) {
    success
    message
    transaction {
      id
      reference
      status
    }
    errors
  }
}
```

Notes:
- The system creates a `PENDING` `TRANSFER` transaction and the processor will execute it asynchronously.
- For `SELF`, the destination account must exist and belong to the same authenticated user.

Implementation notes:
- `FdhTransaction` persists routing fields `transferType` and `transferContext`.
- Wallet transfers are represented using `MobileUserAccount` with `context = WALLET` (wallet-specific transaction columns were removed).
- The transaction processor routes execution based on `transferType` (wallet types handled by wallet handler, bank types sent to T24).

### Querying Transactions

```graphql
query GetAccountTransactions {
  accountTransactions(accountId: "account-123", page: 1, limit: 20) {
    transactions {
      id
      reference
      type
      status
      amount
      description
      createdAt
      fromAccount {
        accountNumber
      }
      toAccount {
        accountNumber
      }
      balanceSnapshots {
        snapshotType
        balance
      }
    }
    totalCount
    pageInfo {
      hasNextPage
      currentPage
      totalPages
    }
  }
}
```

### Reversing a Transaction

```graphql
mutation ReverseTransaction {
  reverseTransaction(transactionId: "txn-123", reason: "Customer request") {
    success
    message
    transaction {
      id
      reference
      isReversal
      originalTransactionId
    }
  }
}
```

## Testing

### 1. Database Migration
```bash
npx prisma migrate dev --name add_transaction_system
npx prisma generate
```

### 2. Test Transaction Creation
```bash
# Use GraphiQL at /api/graphql
# Create test transaction and verify it appears in queue
```

### 3. Verify Background Processing
```bash
# Check logs for transaction processor job
# Verify transactions move from PENDING → PROCESSING → COMPLETED
```

### 4. Test Transaction Queries
```bash
# Query transactions by account
# Verify balance snapshots are created
# Check status history tracking
```

## Files Changed

### New Files
1. `docs/features/TRANSACTION_SYSTEM_IMPLEMENTATION.md` - This documentation
2. `lib/graphql/schema/transactions.ts` - GraphQL type definitions
3. `lib/graphql/resolvers/transactions.ts` - Transaction resolvers
4. `lib/services/transaction-processor.ts` - Core processing logic
5. `lib/services/transaction-queue-service.ts` - Queue management
6. `lib/services/balance-snapshot-service.ts` - Balance audit trail
7. `lib/jobs/transaction-processor-job.ts` - Cron job
8. `lib/utils/reference-generator.ts` - Reference generation

### Modified Files
1. `prisma/schema.prisma` - Add transaction models
2. `instrumentation.ts` - Initialize transaction processor job
3. `lib/graphql/schema/index.ts` - Include transaction schema
4. `lib/graphql/resolvers/index.ts` - Include transaction resolvers

## Related Documentation
- [PROJECT_RULES.md](../../PROJECT_RULES.md)
- [GraphQL Security](../api/GRAPHQL_SECURITY.md)
- [Background Jobs](../infrastructure/BACKGROUND_JOBS.md)
- [Prisma Schema Guide](../guides/PRISMA_SCHEMA_GUIDE.md)

## Notes

### Design Decisions

1. **Background Processing**: Uses cron jobs (10-second intervals) instead of immediate processing to handle load and provide retry mechanisms.

2. **Pessimistic Locking**: Not implemented at this layer since T24 handles the actual balance updates. If implementing local balance management, add Prisma transaction isolation.

3. **Queue System**: Implements exponential backoff (2^attempts minutes) for failed transactions with max 3 retries.

4. **Balance Snapshots**: Captures pre/post balances for audit compliance and reconciliation.

5. **Reference Format**: Uses `TXN{timestamp}{random}` for uniqueness and temporal ordering.

6. **Status Flow**: `PENDING → PROCESSING → COMPLETED/FAILED`, with optional `REVERSED` state.

### Future Enhancements

1. **T24 Integration**: Add actual T24 API calls for balance updates
2. **Real-time Notifications**: WebSocket support for transaction updates
3. **Webhook Callbacks**: Notify external systems of transaction completion
4. **Advanced Retry Logic**: Configurable retry strategies per transaction type
5. **Transaction Reconciliation**: Automated reconciliation with T24 statements
6. **Transaction Limits**: Implement velocity checks and threshold enforcement
7. **Fraud Detection**: Add suspicious transaction flagging
8. **Batch Processing**: Support bulk transaction uploads
9. **Transaction Templates**: Reusable transaction patterns
10. **Performance Optimization**: Database indexing analysis and query optimization

### Limitations

1. Currently uses placeholder for actual T24 API integration
2. Local balance management not implemented (relies on T24)
3. No rate limiting on transaction creation (add if needed)
4. No transaction approval workflows (can be added)
5. Webhook callbacks not implemented
6. No transaction fees/charges calculation

### Security Considerations

1. **Authorization**: Mobile users can only access their own transactions
2. **Admin Actions**: Reversal and retry operations restricted to admins
3. **Rate Limiting**: GraphQL rate limits apply to transaction operations
4. **Audit Trail**: Complete status history and balance snapshots
5. **Validation**: Input validation on amounts, account IDs, and references

---
*Last Updated: 2025-12-14*
