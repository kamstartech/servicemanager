# T24 Customer Accounts Endpoint

## Endpoint

**URL:** `GET https://fdh-esb.ngrok.dev/esb/customer/accounts/v1/api/{customer_id}`

**Auth:** Basic Auth (username:password)

**Purpose:** Get all accounts belonging to a customer

---

## Usage

### 1. Get All Accounts

```typescript
import { t24AccountsService } from '@/lib/services/t24/accounts';

const accounts = await t24AccountsService.getCustomerAccounts("35042058");

// Returns:
// [
//   {
//     "ACCOUNT.ID": "1010100011599",
//     "CUSTOMER.ID": "35042058",
//     "CATEGORY": "1001",
//     "CURRENCY": "MWK",
//     "ACCOUNT.TITLE.1": "John Doe Savings"
//   },
//   {
//     "ACCOUNT.ID": "1010100011602",
//     "CUSTOMER.ID": "35042058",
//     "CATEGORY": "1040",
//     "CURRENCY": "MWK",
//     "ACCOUNT.TITLE.1": "John Doe Current"
//   }
// ]
```

### 2. Get Just Account IDs

```typescript
const accountIds = await t24AccountsService.getCustomerAccountIds("35042058");

// Returns:
// ["1010100011599", "1010100011602", "1040100752797"]
```

### 3. Get Detailed Account Info

```typescript
const result = await t24AccountsService.getCustomerAccountsDetailed("35042058");

if (result.ok) {
  console.log(result.accounts);
  // [
  //   {
  //     accountId: "1010100011599",
  //     customerId: "35042058",
  //     category: "1001",
  //     currency: "MWK",
  //     title: "John Doe Savings"
  //   }
  // ]
}
```

---

## Request Format

```http
GET /esb/customer/accounts/v1/api/35042058 HTTP/1.1
Host: fdh-esb.ngrok.dev
Authorization: Basic <base64(username:password)>
Content-Type: application/json
Accept: */*
```

---

## Response Format

```json
{
  "header": {
    "audit": {
      "T24_time": 1234567890,
      "responseParse_time": 45,
      "requestParse_time": 12
    },
    "page_start": 0,
    "page_token": "",
    "total_size": 3,
    "page_size": 3,
    "status": "success"
  },
  "body": [
    {
      "ACCOUNT.ID": "1010100011599",
      "CUSTOMER.ID": "35042058",
      "CATEGORY": "1001",
      "CURRENCY": "MWK",
      "ACCOUNT.TITLE.1": "John Doe Savings",
      "WORKING.BALANCE": "150000.00",
      "ONLINE.ACTUAL.BAL": "148500.00"
    },
    {
      "ACCOUNT.ID": "1010100011602",
      "CUSTOMER.ID": "35042058",
      "CATEGORY": "1040",
      "CURRENCY": "MWK",
      "ACCOUNT.TITLE.1": "John Doe Current",
      "WORKING.BALANCE": "85000.00",
      "ONLINE.ACTUAL.BAL": "85000.00"
    },
    {
      "ACCOUNT.ID": "1040100752797",
      "CUSTOMER.ID": "35042058",
      "CATEGORY": "1004",
      "CURRENCY": "USD",
      "ACCOUNT.TITLE.1": "John Doe USD Account",
      "WORKING.BALANCE": "1500.00",
      "ONLINE.ACTUAL.BAL": "1500.00"
    }
  ]
}
```

---

## Configuration

Add to `.env`:

```env
# T24 Customer ID for testing
T24_TEST_CUSTOMER="35042058"
```

---

## Integration Examples

### 1. Pull Accounts During User Registration

```typescript
import { t24AccountsService } from '@/lib/services/t24/accounts';
import { prisma } from '@/lib/db/prisma';

async function registerMobileUser(customerNumber: string, username: string) {
  // 1. Create mobile user
  const user = await prisma.mobileUser.create({
    data: {
      customerNumber,
      username,
      context: "MOBILE_BANKING",
      isActive: true,
    },
  });

  // 2. Pull accounts from T24
  const accountIds = await t24AccountsService.getCustomerAccountIds(customerNumber);

  // 3. Create account records
  for (const accountId of accountIds) {
    await prisma.mobileUserAccount.create({
      data: {
        mobileUserId: user.id,
        accountNumber: accountId,
        isPrimary: accountIds.indexOf(accountId) === 0, // First account is primary
        isActive: true,
      },
    });
  }

  return user;
}
```

### 2. Refresh User Accounts

```typescript
async function refreshUserAccounts(userId: number) {
  const user = await prisma.mobileUser.findUnique({
    where: { id: userId },
    include: { accounts: true },
  });

  if (!user?.customerNumber) {
    throw new Error("User has no customer number");
  }

  // Get fresh list from T24
  const accountIds = await t24AccountsService.getCustomerAccountIds(
    user.customerNumber
  );

  // Compare with existing accounts
  const existingIds = user.accounts.map((a) => a.accountNumber);
  const newIds = accountIds.filter((id) => !existingIds.includes(id));

  // Add new accounts
  for (const accountId of newIds) {
    await prisma.mobileUserAccount.create({
      data: {
        mobileUserId: user.id,
        accountNumber: accountId,
        isActive: true,
      },
    });
  }

  console.log(`Added ${newIds.length} new accounts for user ${userId}`);
}
```

### 3. GraphQL Resolver

```typescript
// In resolvers/mobileUser.ts
import { t24AccountsService } from '@/lib/services/t24/accounts';

const resolvers = {
  Query: {
    async pullProfileAccounts(_: any, { customerId }: { customerId: string }) {
      const result = await t24AccountsService.getCustomerAccountsDetailed(customerId);
      
      if (!result.ok) {
        throw new Error(result.error);
      }

      return {
        status: 0,
        message: "Accounts fetched successfully",
        data: {
          accounts: result.accounts,
          total: result.accounts?.length || 0,
        },
      };
    },
  },
};
```

---

## Error Handling

### API Errors

```typescript
❌ T24 API error: 401 Unauthorized
❌ T24 API error: 404 Not Found (customer doesn't exist)
❌ T24 API error: 500 Internal Server Error
```

### Invalid Response

```typescript
❌ Invalid T24 response: no body array
❌ T24 accounts fetch failed for 35042058: FetchError
```

### Empty Results

```typescript
✅ Found 0 accounts for customer 35042058
// Returns empty array, not error
```

---

## Testing

### Test the Service

```typescript
import { t24AccountsService } from '@/lib/services/t24/accounts';

async function test() {
  // Test connection
  const connected = await t24AccountsService.testConnection();
  console.log("Connected:", connected);

  // Test fetching accounts
  const accounts = await t24AccountsService.getCustomerAccounts("35042058");
  console.log("Accounts:", accounts);

  // Test getting IDs only
  const ids = await t24AccountsService.getCustomerAccountIds("35042058");
  console.log("Account IDs:", ids);
}

test();
```

### Expected Output

```
🔄 Fetching accounts from T24 for customer: 35042058
✅ Found 3 accounts for customer 35042058
Connected: true
Accounts: [
  { "ACCOUNT.ID": "1010100011599", ... },
  { "ACCOUNT.ID": "1010100011602", ... },
  { "ACCOUNT.ID": "1040100752797", ... }
]
Account IDs: ["1010100011599", "1010100011602", "1040100752797"]
```

---

## Comparison with Elixir

| Feature | Elixir | Node.js |
|---------|--------|---------|
| **Module** | `PullProfileAccounts` | `T24AccountsService` |
| **Method** | `get_accounts/1` | `getCustomerAccounts()` |
| **IDs Only** | `get_account_ids_direct!/1` | `getCustomerAccountIds()` |
| **Endpoint** | Same | Same |
| **Auth** | Basic Auth | Basic Auth |
| **Response** | Full T24 response | Full T24 response |

---

## Files Created

1. ✅ `lib/services/t24/accounts.ts` - T24 accounts service (4.2KB)
2. ✅ `T24_ACCOUNTS_ENDPOINT.md` - This documentation

---

## Related Endpoints

- **Balance:** `GET /api/esb/accounts/account/v1/balances/{account_number}`
- **Account Details:** `GET /api/esb/accounts/1.0/account/{account_number}`
- **Customer Accounts:** `GET /esb/customer/accounts/v1/api/{customer_id}` ← This one

---

## Summary

✅ **Customer Accounts Endpoint Implemented**
- Endpoint: `GET /esb/customer/accounts/v1/api/{customer_id}`
- Returns: List of all customer accounts
- Methods: Get all, get IDs only, get detailed
- Use case: Pull accounts during registration or refresh

**Now you can fetch all accounts for a mobile banking user! 🏦📋**
