import { gql } from "graphql-tag";

export const transactionTypeDefs = gql`
  # Enums
  enum TransactionType {
    DEBIT
    CREDIT
    TRANSFER
    WALLET_TRANSFER
    WALLET_DEBIT
    WALLET_CREDIT
    ACCOUNT_TO_WALLET
    WALLET_TO_ACCOUNT
  }

  enum TransactionStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
    FAILED_PERMANENT
    REVERSED
  }

  enum TransactionSource {
    MOBILE_BANKING
    WALLET
    ADMIN
    API
  }

  # Types
  type Transaction {
    id: ID!
    reference: String!
    type: TransactionType!
    source: TransactionSource!
    status: TransactionStatus!
    
    amount: Decimal!
    currency: String!
    description: String!
    
    # Sender
    fromAccountId: Int
    fromAccountNumber: String
    fromWalletId: Int
    fromWalletNumber: String
    
    # Receiver
    toAccountId: Int
    toAccountNumber: String
    toWalletId: Int
    toWalletNumber: String
    
    # Wallet Relationships
    fromWallet: MobileUser
    toWallet: MobileUser
    
    # T24 Integration
    t24Reference: String
    t24Response: JSON
    t24RequestBody: JSON
    
    # Retry Management
    retryCount: Int!
    maxRetries: Int!
    nextRetryAt: DateTime
    lastRetryAt: DateTime
    
    # Error Tracking
    errorMessage: String
    errorCode: String
    
    # Reversal
    isReversal: Boolean!
    originalTxnId: String
    reversalReason: String
    
    # Relationships
    fromAccount: MobileUserAccount
    toAccount: MobileUserAccount
    fromWallet: MobileUser
    toWallet: MobileUser
    initiatedBy: MobileUser
    
    # Audit Trail
    statusHistory: [TransactionStatusHistory!]!
    
    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!
    completedAt: DateTime
  }

  type TransactionStatusHistory {
    id: ID!
    fromStatus: TransactionStatus!
    toStatus: TransactionStatus!
    reason: String
    retryNumber: Int
    createdAt: DateTime!
  }

  # Input Types
  input CreateTransactionInput {
    type: TransactionType!
    source: TransactionSource
    amount: Decimal!
    description: String!
    currency: String
    
    # Sender (provide either ID or number)
    fromAccountId: Int
    fromAccountNumber: String
    fromWalletId: Int
    fromWalletNumber: String
    
    # Receiver (provide either ID or number)
    toAccountId: Int
    toAccountNumber: String
    toWalletId: Int
    toWalletNumber: String
    
    # Optional retry configuration
    maxRetries: Int
  }

  input TransactionFilterInput {
    status: TransactionStatus
    type: TransactionType
    source: TransactionSource
    dateFrom: DateTime
    dateTo: DateTime
    minAmount: Decimal
    maxAmount: Decimal
    accountId: Int
    walletId: Int
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
    totalFailed: Int!
    totalPending: Int!
    nextRetryTime: DateTime
  }

  # Queries
  extend type Query {
    # Get single transaction
    transaction(id: ID!): Transaction
    transactionByReference(reference: String!): Transaction
    
    # List transactions with filters
    transactions(
      filter: TransactionFilterInput
      page: Int = 1
      limit: Int = 20
    ): TransactionConnection!
    
    # Account-specific transactions
    accountTransactions(
      accountId: Int!
      page: Int = 1
      limit: Int = 20
    ): TransactionConnection!
    
    # Wallet-specific transactions
    walletTransactions(
      walletId: Int!
      page: Int = 1
      limit: Int = 20
    ): TransactionConnection!
    
    # Get retryable transactions (admin only)
    retryableTransactions(limit: Int = 100): [Transaction!]!
    
    # Get retry statistics (admin only)
    transactionRetryStats: RetryStats!
  }

  # Mutations
  extend type Mutation {
    # Create new transaction
    createTransaction(input: CreateTransactionInput!): CreateTransactionResponse!
    
    # Manually retry a failed transaction
    retryTransaction(id: ID!): CreateTransactionResponse!
    
    # Reverse a completed transaction
    reverseTransaction(
      id: ID!
      reason: String!
    ): CreateTransactionResponse!
  }
`;
