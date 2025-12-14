# Mobile Biller Integration - GraphQL API

## Summary
Complete GraphQL API for mobile app biller integration. This is Layer 2 of the biller system - the mobile-facing API that wraps the T24 ESB integration layer.

## Architecture

```
Mobile App → GraphQL API (Layer 2) → Biller Service (Layer 1) → T24 ESB → External Billers
                ↓
         Authentication
                ↓
         Transaction Logging
                ↓
         User Context
```

## Problem/Context
Mobile apps need a secure, user-friendly API to:
- View available billers
- Lookup biller accounts
- Make bill payments
- Track transaction history
- Handle invoice-based and bundle-based payments

Layer 1 (REST API) handles direct T24 ESB communication.
Layer 2 (GraphQL API) provides mobile-optimized interface with authentication and user context.

## GraphQL Schema

### Types

```graphql
enum BillerType {
  REGISTER_GENERAL
  BWB_POSTPAID
  LWB_POSTPAID
  SRWB_POSTPAID
  SRWB_PREPAID
  MASM
  AIRTEL_VALIDATION
  TNM_BUNDLES
}

type BillerInfo {
  type: BillerType!
  name: String!
  displayName: String!
  description: String
  isActive: Boolean!
  features: BillerFeatures!
  validationRules: BillerValidationRules!
  supportedCurrencies: [String!]!
  defaultCurrency: String!
}

type BillerTransaction {
  id: ID!
  ourTransactionId: String!
  billerType: BillerType!
  billerName: String!
  accountNumber: String!
  amount: Float
  currency: String!
  status: BillerTransactionStatus!
  errorMessage: String
  createdAt: String!
}

type AccountLookupResult {
  accountNumber: String!
  customerName: String!
  balance: String
  status: String!
}

type BillerPaymentResult {
  success: Boolean!
  transactionId: String
  externalReference: String
  message: String
  transaction: BillerTransaction!
}
```

### Queries

#### 1. Get Available Billers
```graphql
query GetAvailableBillers {
  availableBillers {
    type
    name
    displayName
    description
    features {
      supportsAccountLookup
      requiresTwoStep
      supportsInvoice
    }
    validationRules {
      minAmount
      maxAmount
      accountNumberFormat
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "availableBillers": [
      {
        "type": "LWB_POSTPAID",
        "name": "Lilongwe Water Board",
        "displayName": "LWB Water Bill",
        "description": "Lilongwe Water Board postpaid water bills",
        "features": {
          "supportsAccountLookup": true,
          "requiresTwoStep": false,
          "supportsInvoice": false
        },
        "validationRules": {
          "minAmount": 100,
          "maxAmount": 1000000,
          "accountNumberFormat": "^[0-9]{6,10}$"
        }
      }
    ]
  }
}
```

#### 2. Lookup Account Before Payment
```graphql
query LookupBillerAccount($input: BillerAccountLookupInput!) {
  billerAccountLookup(input: $input) {
    accountNumber
    customerName
    balance
    status
    billerDetails
  }
}
```

**Variables:**
```json
{
  "input": {
    "billerType": "LWB_POSTPAID",
    "accountNumber": "1234567890"
  }
}
```

**Response:**
```json
{
  "data": {
    "billerAccountLookup": {
      "accountNumber": "1234567890",
      "customerName": "John Doe",
      "balance": "5000.00",
      "status": "active",
      "billerDetails": {
        "accountType": "residential",
        "lastPaymentDate": "2024-12-01"
      }
    }
  }
}
```

#### 3. Get User's Transaction History
```graphql
query MyBillerTransactions(
  $billerType: BillerType
  $status: BillerTransactionStatus
  $limit: Int
  $offset: Int
) {
  myBillerTransactions(
    billerType: $billerType
    status: $status
    limit: $limit
    offset: $offset
  ) {
    transactions {
      id
      ourTransactionId
      billerType
      billerName
      accountNumber
      amount
      currency
      status
      errorMessage
      createdAt
    }
    total
    hasMore
  }
}
```

**Variables:**
```json
{
  "billerType": "LWB_POSTPAID",
  "status": "COMPLETED",
  "limit": 20,
  "offset": 0
}
```

### Mutations

#### 1. Process Bill Payment
```graphql
mutation BillerPayment($input: BillerPaymentInput!) {
  billerPayment(input: $input) {
    success
    transactionId
    externalReference
    message
    transaction {
      id
      ourTransactionId
      status
      amount
      createdAt
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "billerType": "LWB_POSTPAID",
    "accountNumber": "1234567890",
    "amount": 5000,
    "currency": "MWK",
    "debitAccount": "01234567890",
    "debitAccountType": "CASA",
    "customerAccountName": "John Doe"
  }
}
```

**Response:**
```json
{
  "data": {
    "billerPayment": {
      "success": true,
      "transactionId": "BT-ABC123XYZ",
      "externalReference": "EXT-789456",
      "message": "Payment successful",
      "transaction": {
        "id": "clx123abc",
        "ourTransactionId": "BT-ABC123XYZ",
        "status": "COMPLETED",
        "amount": 5000,
        "createdAt": "2024-12-14T15:30:00Z"
      }
    }
  }
}
```

#### 2. Retry Failed Transaction
```graphql
mutation RetryTransaction($transactionId: ID!) {
  billerRetryTransaction(transactionId: $transactionId) {
    success
    message
    transaction {
      id
      status
      errorMessage
    }
  }
}
```

## Mobile App Integration Examples

### React Native Example

```typescript
import { gql, useMutation, useQuery } from '@apollo/client';

// Get available billers
const GET_BILLERS = gql`
  query GetAvailableBillers {
    availableBillers {
      type
      displayName
      description
      features {
        supportsAccountLookup
      }
      validationRules {
        minAmount
        maxAmount
      }
    }
  }
`;

function BillersList() {
  const { data, loading } = useQuery(GET_BILLERS);
  
  if (loading) return <Loading />;
  
  return (
    <FlatList
      data={data.availableBillers}
      renderItem={({ item }) => (
        <BillerCard biller={item} />
      )}
    />
  );
}

// Lookup account
const LOOKUP_ACCOUNT = gql`
  query LookupAccount($input: BillerAccountLookupInput!) {
    billerAccountLookup(input: $input) {
      accountNumber
      customerName
      balance
      status
    }
  }
`;

// Process payment
const PAY_BILL = gql`
  mutation PayBill($input: BillerPaymentInput!) {
    billerPayment(input: $input) {
      success
      transactionId
      message
      transaction {
        id
        status
      }
    }
  }
`;

function PaymentScreen({ biller, accountNumber }) {
  const [payBill, { loading }] = useMutation(PAY_BILL);
  
  const handlePayment = async (amount: number) => {
    try {
      const result = await payBill({
        variables: {
          input: {
            billerType: biller.type,
            accountNumber,
            amount,
            currency: 'MWK',
            debitAccount: userAccount.accountNumber,
            debitAccountType: 'CASA',
          }
        }
      });
      
      if (result.data.billerPayment.success) {
        showSuccess(result.data.billerPayment.message);
      }
    } catch (error) {
      showError(error.message);
    }
  };
  
  return <PaymentForm onSubmit={handlePayment} loading={loading} />;
}
```

### Flutter Example

```dart
import 'package:graphql_flutter/graphql_flutter.dart';

// Query
const GET_BILLERS = gql(r'''
  query GetAvailableBillers {
    availableBillers {
      type
      displayName
      description
      validationRules {
        minAmount
        maxAmount
      }
    }
  }
''');

class BillersScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Query(
      options: QueryOptions(document: GET_BILLERS),
      builder: (QueryResult result, {fetchMore, refetch}) {
        if (result.isLoading) {
          return CircularProgressIndicator();
        }
        
        final billers = result.data['availableBillers'];
        
        return ListView.builder(
          itemCount: billers.length,
          itemBuilder: (context, index) {
            return BillerCard(biller: billers[index]);
          },
        );
      },
    );
  }
}

// Mutation
const PAY_BILL = gql(r'''
  mutation PayBill($input: BillerPaymentInput!) {
    billerPayment(input: $input) {
      success
      transactionId
      message
      transaction {
        id
        status
      }
    }
  }
''');

class PaymentButton extends StatelessWidget {
  final BillerPaymentInput input;
  
  @override
  Widget build(BuildContext context) {
    return Mutation(
      options: MutationOptions(
        document: PAY_BILL,
        onCompleted: (dynamic resultData) {
          if (resultData['billerPayment']['success']) {
            _showSuccess(resultData['billerPayment']['message']);
          }
        },
        onError: (OperationException error) {
          _showError(error.toString());
        },
      ),
      builder: (RunMutation runMutation, QueryResult result) {
        return ElevatedButton(
          onPressed: result.isLoading ? null : () {
            runMutation({'input': input.toJson()});
          },
          child: Text(result.isLoading ? 'Processing...' : 'Pay Bill'),
        );
      },
    );
  }
}
```

## Authentication

All queries and mutations require authentication. Include the auth token in headers:

```typescript
const client = new ApolloClient({
  uri: 'https://your-api.com/api/graphql',
  headers: {
    authorization: `Bearer ${userToken}`,
  },
});
```

## Error Handling

```typescript
try {
  const result = await client.mutate({
    mutation: PAY_BILL,
    variables: { input: paymentData },
  });
  
  if (!result.data.billerPayment.success) {
    // Handle business logic failure
    console.error(result.data.billerPayment.message);
  }
} catch (error) {
  // Handle GraphQL errors
  if (error.graphQLErrors) {
    error.graphQLErrors.forEach(({ message }) => {
      if (message === 'Authentication required') {
        // Redirect to login
      }
    });
  }
  
  if (error.networkError) {
    // Handle network issues
    console.error('Network error:', error.networkError);
  }
}
```

## Testing

### Using GraphQL Playground

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open GraphQL Playground:
   ```
   http://localhost:3000/api/graphql
   ```

3. Set authentication header:
   ```json
   {
     "authorization": "Bearer YOUR_TOKEN"
   }
   ```

4. Run queries:
   ```graphql
   query {
     availableBillers {
       type
       displayName
     }
   }
   ```

### Using cURL

```bash
# Get available billers
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "query { availableBillers { type displayName } }"
  }'

# Process payment
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "mutation PayBill($input: BillerPaymentInput!) { billerPayment(input: $input) { success message } }",
    "variables": {
      "input": {
        "billerType": "LWB_POSTPAID",
        "accountNumber": "1234567890",
        "amount": 5000,
        "currency": "MWK",
        "debitAccount": "01234567890",
        "debitAccountType": "CASA"
      }
    }
  }'
```

## Files Changed

### New Files Created

**GraphQL Schema:**
- `lib/graphql/schema/typeDefs.ts` - Added biller types (180+ lines)

**GraphQL Resolvers:**
- `lib/graphql/schema/resolvers/billers.ts` - Complete resolver implementation

**Modified Files:**
- `lib/graphql/schema/resolvers/index.ts` - Added billers resolvers

## Related Documentation

- [Biller Transaction Processing](./BILLER_TRANSACTION_PROCESSING.md) - Layer 1 (T24 ESB Integration)
- [T24 Integration](../t24/T24_ACCOUNTS_ENDPOINT.md)
- [GraphQL API](../api/GRAPHQL_API.md)
- [Authentication](../features/AUTHENTICATION_SYSTEM.md)

## Notes

### Features

✅ **Authentication** - All operations require user authentication
✅ **User Context** - Transactions automatically linked to user
✅ **Transaction History** - Users can view their own transactions
✅ **Account Lookup** - Verify account before payment
✅ **Retry Failed** - Users can retry their failed transactions
✅ **Multi-Biller Support** - All 8 biller types supported
✅ **Type Safety** - Full TypeScript/GraphQL type safety

### Security

1. **Authentication Required** - All queries/mutations check user authentication
2. **User Isolation** - Users can only see their own transactions
3. **Ownership Verification** - Retry only works for user's transactions
4. **Input Validation** - GraphQL validates all inputs
5. **Rate Limiting** - Consider adding in production

### Next Steps

1. **Add Subscriptions** - Real-time transaction status updates
   ```graphql
   subscription TransactionUpdated($transactionId: ID!) {
     transactionUpdated(transactionId: $transactionId) {
       id
       status
       message
     }
   }
   ```

2. **Add Favorites** - Save frequent biller accounts
3. **Add Scheduled Payments** - Recurring bill payments
4. **Add Payment Reminders** - Due date notifications
5. **Add Transaction Receipts** - Generate PDF receipts

### Performance

- Transaction queries are indexed on `userId` and `createdAt`
- Pagination supported on transaction history
- Consider adding Redis cache for biller configs
- Consider adding rate limiting per user

---

*Last Updated: 2024-12-14*
