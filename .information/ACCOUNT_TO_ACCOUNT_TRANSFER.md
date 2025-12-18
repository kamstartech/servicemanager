# Account-to-Account Transfer (GraphQL)

## Overview
This repo supports creating account-to-account transfers as **pending** records in `fdh_transactions` and processing them asynchronously via the transaction processor job.

## GraphQL API
### Mutation
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

Types:
- `FDH_BANK`: Internal bank account-to-account
- `EXTERNAL_BANK`: External beneficiary bank account-to-account
- `FDH_WALLET`: Internal wallet transfer (wallet accounts are represented by account numbers)
- `EXTERNAL_WALLET`: Wallet to external wallet
- `SELF`: Destination account must belong to the same authenticated user

## Validation Rules
- Source account must belong to the authenticated `mobileUser`.
- Source account context must be `MOBILE_BANKING`.
- Source account must be active.
- Destination account number must be non-empty.
- Self-transfer is rejected (source account number cannot equal destination).

## Processing Lifecycle
- The mutation creates an `fdhTransaction` with:
  - `type = TRANSFER`
  - `source = MOBILE_BANKING`
  - `status = PENDING`
  - `transferType` and `transferContext` stored for deterministic routing
  - `t24RequestBody` populated for audit/debug
- Background worker `lib/jobs/transaction-processor-job.ts` runs every 10 seconds and processes:
  - `PENDING` transactions
  - retryable `FAILED` transactions (`nextRetryAt <= now`)
- The processor `lib/services/transaction-processor.ts` updates status:
  - `PENDING -> PROCESSING -> COMPLETED` on success
  - `PENDING -> PROCESSING -> FAILED` with retry schedule on failure

## T24 / ESB Posting

When processing account-based transfers, the backend posts to the FDH ESB which routes the request to T24.

Routing is based on `transferType`:

- `FDH_BANK`, `SELF`: Internal account-to-account transfer
  - `POST {T24_ESB_URL}/api/esb/transaction/1.0/initiate/transaction`
- `EXTERNAL_BANK`: External bank transfer
  - `POST {T24_ESB_URL}/api/esb/transfers/other/1.0/bank`

Authentication is Basic Auth:

- `T24_USERNAME`
- `T24_PASSWORD`

Base URL selection:

- `T24_ESB_URL` (preferred)
- `T24_BASE_URL`
- `T24_API_URL`

The transfer client implementation is in `lib/services/t24-service.ts`.

## Viewing Created Transfers (Admin UI)
- Navigate to `Mobile banking` -> `Transactions`.
- This view lists the `fdhTransaction` records created by the `createTransfer` mutation.

Admin action:
- Admins can create a transaction from this screen using the `Add` button.
- `fromAccountId` is selected from the accounts dropdown (accounts with `context = MOBILE_BANKING`).
- `toAccountNumber` is provided as a string.
- `Transaction Type` corresponds to `transferType`.
- Admins can view the status history for a transaction using the `History` action in the table.

## Key Files
- `lib/graphql/schema/typeDefs.ts`
- `lib/graphql/resolvers/transactions.ts`
- `lib/jobs/transaction-processor-job.ts`
- `lib/services/transaction-processor.ts`
- `lib/services/t24-service.ts`
