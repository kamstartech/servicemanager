# Biller Transaction Processing Migration

## Summary
Complete migration of biller transaction processing from Phoenix/Elixir to Next.js, making the admin panel fully independent and capable of handling all biller operations.

## Problem/Context
The system previously relied on two separate applications:
- **Phoenix/Elixir** - Handled actual biller transaction processing
- **Next.js Admin** - Only managed biller configurations

This created:
- Deployment complexity (two applications)
- Two separate databases
- Inter-service communication overhead
- Maintenance burden

## Solution
Implemented complete biller transaction processing directly in Next.js using:
- TypeScript service layer with concrete implementations
- REST API endpoints for all transaction types
- Robust error handling and retry mechanisms
- Comprehensive transaction logging

## Implementation Details

### Service Layer Architecture

#### 1. Base Service (`lib/services/billers/base.ts`)
Abstract base class providing:
- HTTP request handling with timeout/retry
- Authentication headers (Basic, Bearer, API Key)
- Account number validation
- Amount validation
- Retry logic with exponential backoff

#### 2. Concrete Service Implementations

**SoapBillerService** (`lib/services/billers/soap.ts`)
- For SOAP/XML-based billers
- Used by: LWB, BWB, SRWB Postpaid, MASM
- Features:
  - XML request building
  - XML response parsing
  - Account lookup via SOAP
  - Payment processing

**InvoiceBillerService** (`lib/services/billers/invoice.ts`)
- For two-step invoice-based billers
- Used by: Register General, SRWB Prepaid
- Features:
  - Get invoice details
  - Confirm invoice payment
  - JSON request/response handling

**BundleBillerService** (`lib/services/billers/bundle.ts`)
- For bundle-based billers
- Used by: TNM Bundles
- Features:
  - Get bundle details
  - Purchase bundle confirmation
  - Phone number validation

**ValidationBillerService** (`lib/services/billers/validation.ts`)
- For validation-only billers
- Used by: Airtel Validation
- Features:
  - Phone number validation
  - No payment processing

#### 3. Factory Pattern (`lib/services/billers/factory.ts`)
Automatically selects correct service implementation based on:
- Biller type
- Feature flags in configuration
- Supported capabilities

#### 4. Transaction Service (`lib/services/billers/transactions.ts`)
Manages complete transaction lifecycle:
- Transaction creation with unique IDs
- Status management (PENDING → PROCESSING → COMPLETED/FAILED)
- Account lookup processing
- Payment processing
- Transaction retry logic
- Query methods (by biller, status, account, etc.)
- Statistics and reporting

### API Endpoints

#### Account Lookup
```
POST /api/billers/[billerType]/account-details
```
**Request:**
```json
{
  "account_number": "1234567890",
  "account_type": "M" // Optional, for MASM
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction": { /* transaction record */ },
    "account_details": {
      "accountNumber": "1234567890",
      "customerName": "John Doe",
      "balance": "5000.00",
      "status": "active"
    }
  }
}
```

#### Payment Processing
```
POST /api/billers/[billerType]/payment
```
**Request:**
```json
{
  "account_number": "1234567890",
  "amount": 1000,
  "currency": "MWK",
  "credit_account": "01234567890",
  "credit_account_type": "CASA",
  "debit_account": "09876543210",
  "debit_account_type": "CASA",
  "customer_account_number": "ACC001",
  "customer_account_name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction": { /* transaction record */ },
    "result": {
      "success": true,
      "transactionId": "BT-ABC123",
      "externalReference": "EXT-XYZ789",
      "message": "Payment successful"
    }
  }
}
```

#### List Transactions
```
GET /api/billers/transactions?billerType=LWB_POSTPAID&limit=50&offset=0
GET /api/billers/transactions?status=COMPLETED
GET /api/billers/transactions?accountNumber=1234567890
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "ourTransactionId": "BT-...",
      "billerType": "LWB_POSTPAID",
      "accountNumber": "1234567890",
      "amount": 1000,
      "status": "COMPLETED",
      "createdAt": "2024-12-14T...",
      ...
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "count": 25
  }
}
```

#### Retry Failed Transaction
```
POST /api/billers/transactions/[id]/retry
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction": { /* updated transaction */ }
  },
  "message": "Transaction retry initiated successfully"
}
```

### Supported Biller Types

| Biller Type | Service Type | Features |
|------------|--------------|----------|
| `LWB_POSTPAID` | SOAP | Account lookup, Payment |
| `BWB_POSTPAID` | SOAP | Account lookup, Payment |
| `SRWB_POSTPAID` | SOAP | Account lookup, Payment |
| `SRWB_PREPAID` | Invoice | Get invoice, Confirm payment |
| `MASM` | SOAP | Account lookup (with type), Payment |
| `REGISTER_GENERAL` | Invoice | Get invoice, Confirm payment |
| `TNM_BUNDLES` | Bundle | Bundle details, Purchase |
| `AIRTEL_VALIDATION` | Validation | Phone validation only |

### Transaction Flow

```
1. Mobile App/Client
   ↓
2. POST /api/billers/[type]/account-details or /payment
   ↓
3. BillerTransactionService
   - Create transaction record (PENDING)
   - Get biller config from database
   - Create appropriate service via Factory
   ↓
4. Update status to PROCESSING
   ↓
5. Execute request via concrete service
   - Build request (XML/JSON)
   - Make HTTP call with timeout/retry
   - Parse response
   ↓
6. Update transaction
   - COMPLETED (with response data)
   - OR FAILED (with error message)
   ↓
7. Return result to client
```

### Error Handling

1. **Validation Errors** - 400 Bad Request
   - Missing required fields
   - Invalid account format
   - Amount out of range

2. **Configuration Errors** - 500 Internal Server Error
   - Biller config not found
   - Inactive biller

3. **Processing Errors** - 400 Bad Request
   - Account lookup failed
   - Payment failed
   - Includes transaction record for tracking

4. **Timeout Handling**
   - Configurable per biller (timeoutMs)
   - Automatic retry with exponential backoff
   - Max retry attempts configurable (retryAttempts)

### Transaction Status Lifecycle

```
PENDING → PROCESSING → COMPLETED
                    → FAILED → (can be retried) → PENDING
```

## Usage

### Example: Account Lookup for LWB

```typescript
const response = await fetch('/api/billers/lwb_postpaid/account-details', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    account_number: '1234567890'
  })
});

const result = await response.json();
```

### Example: Payment for BWB

```typescript
const response = await fetch('/api/billers/bwb_postpaid/payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    account_number: '1234567890',
    amount: 5000,
    currency: 'MWK',
    credit_account: '01234567890',
    credit_account_type: 'CASA',
    debit_account: '09876543210',
    debit_account_type: 'CASA',
    customer_account_name: 'John Doe'
  })
});

const result = await response.json();
```

### Example: Retry Failed Transaction

```typescript
const response = await fetch(`/api/billers/transactions/${transactionId}/retry`, {
  method: 'POST'
});

const result = await response.json();
```

## Testing

### Manual Testing

1. **Configure Biller** (if not already seeded):
   ```bash
   npm run prisma:seed
   ```

2. **Test Account Lookup**:
   ```bash
   curl -X POST http://localhost:3000/api/billers/lwb_postpaid/account-details \
     -H "Content-Type: application/json" \
     -d '{"account_number":"1234567890"}'
   ```

3. **Test Payment**:
   ```bash
   curl -X POST http://localhost:3000/api/billers/bwb_postpaid/payment \
     -H "Content-Type: application/json" \
     -d '{
       "account_number":"1234567890",
       "amount":1000,
       "currency":"MWK",
       "credit_account":"01234567890",
       "credit_account_type":"CASA",
       "debit_account":"09876543210",
       "debit_account_type":"CASA"
     }'
   ```

4. **List Transactions**:
   ```bash
   curl http://localhost:3000/api/billers/transactions?status=COMPLETED
   ```

## Files Changed

### New Files Created

**Service Layer:**
- `lib/services/billers/soap.ts` - SOAP/XML biller service
- `lib/services/billers/invoice.ts` - Invoice-based biller service
- `lib/services/billers/bundle.ts` - Bundle-based biller service
- `lib/services/billers/validation.ts` - Validation-only biller service

**API Routes:**
- `app/api/billers/[billerType]/account-details/route.ts` - Account lookup
- `app/api/billers/[billerType]/payment/route.ts` - Payment processing
- `app/api/billers/transactions/route.ts` - List transactions
- `app/api/billers/transactions/[id]/retry/route.ts` - Retry failed transaction

### Modified Files

- `lib/services/billers/base.ts` - Enhanced HTTP request handling
- `lib/services/billers/factory.ts` - Implemented concrete service creation
- `lib/services/billers/transactions.ts` - Added processing methods

## Related Documentation

- [Beneficiary Field Type](./BENEFICIARY_FIELD_TYPE.md)
- [Form System](../features/FORM_SYSTEM.md)
- [GraphQL API](../api/GRAPHQL_API.md)

## Notes

### Next Steps

1. **Add Invoice/Bundle Endpoints**
   - GET `/api/billers/[billerType]/invoice`
   - POST `/api/billers/[billerType]/invoice/confirm`
   - GET `/api/billers/bundles/[bundleId]`
   - POST `/api/billers/bundles/[bundleId]/confirm`

2. **Add XML Parser Library**
   - Current implementation uses basic regex
   - Consider adding `fast-xml-parser` for robust XML handling

3. **Add Monitoring**
   - Success rate tracking
   - Response time monitoring
   - Alert on high failure rates

4. **Add Rate Limiting**
   - Prevent abuse
   - Per-biller rate limits
   - User-based throttling

5. **Add Caching**
   - Cache account lookups
   - Cache bundle details
   - Invalidation strategy

### Migration from Phoenix

To completely remove Phoenix dependency:

1. Update mobile app endpoints to point to Next.js
2. Migrate any existing transaction data (if needed)
3. Update documentation
4. Remove Phoenix service from infrastructure

### Security Considerations

1. **Authentication** - Add auth middleware to API routes
2. **Authorization** - Verify user permissions
3. **Rate Limiting** - Prevent API abuse
4. **Input Validation** - Sanitize all inputs
5. **Sensitive Data** - Encrypt biller credentials in database
6. **Logging** - Sanitize logs (no passwords/tokens)

### Performance Optimization

1. **Connection Pooling** - Reuse HTTP connections
2. **Async Processing** - Consider queue for high volume
3. **Caching** - Cache config lookups
4. **Database Indexes** - On frequently queried fields
5. **Monitoring** - Track slow queries and timeouts

---

*Last Updated: 2024-12-14*
