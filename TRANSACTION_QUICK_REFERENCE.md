# Transaction View - Quick Reference

## GraphQL Query

```graphql
query GetAccountTransactions($accountNumber: String!) {
  accountTransactions(accountNumber: $accountNumber) {
    accountNumber
    status
    totalCount
    transactions {
      transactionId
      accountNumber
      transactionDate
      valueDate
      amount
      debitAmount
      creditAmount
      type
      description
      reference
      balance
      currency
      status
      narrative
    }
  }
}
```

## Variables

```json
{
  "accountNumber": "1010100007998"
}
```

## Expected Response

```json
{
  "data": {
    "accountTransactions": {
      "accountNumber": "1010100007998",
      "status": "success",
      "totalCount": 25,
      "transactions": [
        {
          "transactionId": "TXN123456",
          "accountNumber": "1010100007998",
          "transactionDate": "2024-12-13",
          "valueDate": "2024-12-13",
          "amount": "50000",
          "debitAmount": null,
          "creditAmount": "50000",
          "type": "credit",
          "description": "Salary Deposit",
          "reference": "REF789012",
          "balance": "150000",
          "currency": "MWK",
          "status": "completed",
          "narrative": "December Salary"
        }
      ]
    }
  }
}
```

## Routes

| Route | Description |
|-------|-------------|
| `/mobile-banking/accounts` | All accounts list |
| `/mobile-banking/accounts/[accountNumber]/transactions` | Transaction history |

## Example URLs

```
http://localhost:3000/mobile-banking/accounts
http://localhost:3000/mobile-banking/accounts/1010100007998/transactions
http://localhost:3000/mobile-banking/accounts/A000001/transactions
```

## Testing with Apollo Client DevTools

1. Install Apollo Client DevTools extension
2. Open GraphiQL tab
3. Paste the query above
4. Set variables: `{ "accountNumber": "1010100007998" }`
5. Click Execute

## Testing with curl

```bash
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetAccountTransactions($accountNumber: String!) { accountTransactions(accountNumber: $accountNumber) { accountNumber status totalCount transactions { transactionId transactionDate amount type description reference currency } } }",
    "variables": { "accountNumber": "1010100007998" }
  }'
```

## Environment Setup

Ensure these are in your `.env` file:

```env
T24_BASE_URL=https://fdh-esb.ngrok.dev
T24_USERNAME=your_username
T24_PASSWORD=your_password
T24_TEST_ACCOUNT=1010100007998
```

## Transaction Types

| Type | Color | Symbol |
|------|-------|--------|
| `credit` | Green | + |
| `debit` | Red | - |
| `transfer` | Gray | ± |
| Other | Gray | • |

## Status Values

| Status | Badge Color |
|--------|-------------|
| `completed` | Green |
| `success` | Green |
| `pending` | Yellow |
| `processing` | Blue |
| `failed` | Red |

## CSV Export Format

```csv
Transaction ID,Date,Value Date,Reference,Description,Type,Debit,Credit,Balance,Currency,Status
TXN123456,2024-12-13,2024-12-13,REF789012,Salary Deposit,credit,,50000,150000,MWK,completed
```

## Common Issues

### No transactions showing
- ✓ Check T24 credentials in `.env`
- ✓ Verify account exists in T24
- ✓ Check browser console for errors
- ✓ Ensure T24 ESB is reachable

### GraphQL errors
- ✓ Verify resolver is in `resolvers/index.ts`
- ✓ Check schema matches resolver
- ✓ Restart dev server after changes

### Export not working
- ✓ Check transactions array has data
- ✓ Verify browser download permissions
- ✓ Check console for JS errors
