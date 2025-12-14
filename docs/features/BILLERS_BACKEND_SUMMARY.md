# Billers Implementation - Elixir Backend Summary

**Date**: 2025-12-13  
**Source**: `/home/jimmykamanga/Documents/Play/service_manager`

---

## Overview

The Elixir backend has a comprehensive billers system for integrating with multiple utility payment providers (electricity, water, mobile bundles, etc.).

---

## Architecture

### Core Components

1. **BillerConfig** - Configuration for each biller (endpoints, auth, features)
2. **BillerTransaction** - Transaction records for all biller operations
3. **BillersService** - Business logic for processing biller transactions
4. **API Controllers** - HTTP endpoints for biller operations
5. **Biller-Specific Services** - Individual services for each biller provider

---

## Database Schema

### `biller_configs` Table

```elixir
# Location: lib/service_manager/billers/biller_config.ex

schema "biller_configs" do
  # Identity
  field :biller_type, :string           # "lwb_postpaid", "srwb_postpaid", etc.
  field :biller_name, :string           # "Lilongwe Water Board"
  field :display_name, :string          # User-facing name
  field :description, :string
  field :is_active, :boolean

  # API Configuration
  field :base_url, :string
  field :endpoints, :map                # %{account_details: "/api/...", payment: "/api/..."}
  field :authentication, :map           # Credentials, tokens, etc.

  # Transaction Settings
  field :default_currency, :string      # "MWK"
  field :supported_currencies, {:array, :string}
  field :timeout_ms, :integer           # 30000
  field :retry_attempts, :integer       # 3

  # Features
  field :features, :map                 # Supported operations
  field :validation_rules, :map         # Account number format, etc.

  timestamps()
end
```

**Supported Biller Types:**
- `register_general` - Register General (taxes, licenses)
- `bwb_postpaid` - Blantyre Water Board
- `lwb_postpaid` - Lilongwe Water Board
- `srwb_postpaid` - Southern Region Water Board (postpaid)
- `srwb_prepaid` - Southern Region Water Board (prepaid)
- `masm` - MASM (electricity)
- `airtel_validation` - Airtel mobile validation
- `tnm_bundles` - TNM mobile bundles

### `biller_transactions` Table

```elixir
# Location: lib/service_manager/schemas/billers/biller_transaction.ex

schema "biller_transactions" do
  # Biller Information
  field :biller_type, :string
  field :biller_name, :string

  # Account Information
  field :account_number, :string
  field :account_type, :string

  # Transaction Details
  field :our_transaction_id, :string    # Unique reference
  field :amount, :decimal
  field :currency, :string

  # Account References (for T24 integration)
  field :credit_account, :string        # Biller's account
  field :credit_account_type, :string
  field :debit_account, :string         # Customer's account
  field :debit_account_type, :string

  # Customer Information
  field :customer_account_number, :string
  field :customer_account_name, :string

  # Transaction Type
  field :transaction_type, :string
  # Types: "account_details", "post_transaction", "get_invoice", 
  #        "confirm_invoice", "bundle_details", "confirm_bundle"

  # Special Fields
  field :bundle_id, :string             # For TNM bundles

  # Status and Processing
  field :status, :string                # "pending", "completed", "failed"

  # API Information
  field :api_endpoint, :string
  field :request_payload, :map
  field :response_payload, :map
  field :error_message, :string

  # Timestamps
  field :processed_at, :utc_datetime
  timestamps()
end
```

---

## API Endpoints

### Location: `lib/service_manager_web/controllers/api/billers_controller.ex`

#### 1. Get Account Details
```http
GET /api/billers/account-details
```
**Parameters:**
- `biller_type` - Type of biller (required)
- `account_number` - Customer's account number (required)
- `account_type` - Optional, for MASM ("M" for meter)

**Response:**
```json
{
  "status": 0,
  "data": {
    "transaction_id": "...",
    "account_number": "...",
    "customer_name": "...",
    "balance": "...",
    "biller_details": { ... }
  }
}
```

#### 2. Process Payment
```http
POST /api/billers/payment
```
**Parameters:**
- `biller_type` - Type of biller (required)
- `account_number` - Biller account number (required)
- `amount` - Payment amount (required)
- `currency` - Currency code (default: "MWK")
- `credit_account` - Biller's account in T24
- `credit_account_type` - Account type
- `debit_account` - Customer's account in T24
- `debit_account_type` - Account type
- `customer_account_number` - Customer reference
- `customer_account_name` - Customer name

#### 3. Get Invoice (Register General, SRWB Prepaid)
```http
GET /api/billers/invoice
```
**Parameters:**
- `biller_type` - "register_general" or "srwb_prepaid"
- `account_number` - Account number

#### 4. Confirm Invoice
```http
POST /api/billers/invoice/confirm
```
**Parameters:**
- `biller_type` - Type of biller
- `account_number` - Account number
- `amount` - Amount to pay
- `invoice_number` - Invoice reference
- `credit_account` - Biller's T24 account
- `debit_account` - Customer's T24 account

#### 5. Get Biller Types
```http
GET /api/billers/types
```
Returns list of all configured billers.

---

## Biller Services

### Location: `lib/service_manager/services/billers_apis/`

Each biller has dedicated services:

#### Lilongwe Water Board (LWB)
- `lwb/bills_service.ex` - Account details and payments
- `lwb/builder.ex` - XML request builder
- `lwb/response_parser.ex` - XML response parser

#### Southern Region Water Board (SRWB)
- `srwb/bills_service.ex` - Account details and payments
- `srwb/builder.ex` - XML request builder
- `srwb/response_parser.ex` - XML response parser

#### MASM (Electricity)
- `masm/bills_service.ex` - Account details and payments
- `masm/response_parser.ex` - XML response parser

#### Blantyre Water Board (BWB)
- `bwb/bwb_bills_service.ex` - Account details and payments

#### Common Utilities
- `xml_sanitizer.ex` - XML sanitization
- `http_handler.ex` - HTTP client with retry logic

---

## Business Logic Flow

### Example: Account Details Request

```elixir
# 1. Controller receives request
BillersController.account_details(conn, %{
  "biller_type" => "lwb_postpaid",
  "account_number" => "12345"
})

# 2. Service creates transaction record
BillersService.process_account_details("lwb_postpaid", "12345")

# 3. Transaction is created with status "pending"
transaction = %BillerTransaction{
  biller_type: "lwb_postpaid",
  account_number: "12345",
  transaction_type: "account_details",
  status: "pending"
}

# 4. Service calls biller-specific API
LWB.BillsService.get_account_details(transaction)

# 5. XML request is built
builder.build_account_details_request("12345")

# 6. HTTP request is sent
HttpHandler.post(url, xml_body)

# 7. Response is parsed
ResponseParser.parse_account_details(xml_response)

# 8. Transaction is updated
BillersService.complete_transaction(transaction, response_payload)

# 9. Response is returned to client
```

---

## Transaction Types

1. **account_details**
   - Get customer account information
   - Check balance, name, status
   
2. **post_transaction**
   - Submit payment to biller
   - Direct payment without invoice

3. **get_invoice**
   - Request invoice details
   - Used by Register General, SRWB Prepaid

4. **confirm_invoice**
   - Confirm and pay invoice
   - Two-step payment process

5. **bundle_details**
   - Get mobile bundle information
   - TNM bundles

6. **confirm_bundle**
   - Purchase mobile bundle
   - TNM bundles

---

## Integration with T24

Biller payments integrate with T24 core banking:

```elixir
payment_attrs = %{
  credit_account: "A123456",        # Biller's account in T24
  credit_account_type: "SAVINGS",
  debit_account: "A789012",         # Customer's account in T24
  debit_account_type: "CURRENT",
  amount: "5000.00",
  currency: "MWK"
}
```

The service:
1. Creates biller transaction record
2. Calls biller API to verify/post
3. If successful, initiates T24 transfer
4. Updates transaction status

---

## Error Handling

```elixir
# Transaction states
"pending"   - Transaction created, awaiting processing
"completed" - Successfully processed
"failed"    - Failed with error message

# Errors are stored in transaction
transaction.error_message
transaction.response_payload
```

---

## Configuration Example

```elixir
%BillerConfig{
  biller_type: "lwb_postpaid",
  biller_name: "Lilongwe Water Board",
  display_name: "LWB Water Bill",
  is_active: true,
  base_url: "https://lwb.api.example.com",
  endpoints: %{
    account_details: "/soap/GetAccountDetails",
    payment: "/soap/PostPayment"
  },
  authentication: %{
    username: "api_user",
    password: "encrypted_password",
    api_key: "key_123"
  },
  default_currency: "MWK",
  supported_currencies: ["MWK"],
  timeout_ms: 30000,
  retry_attempts: 3,
  features: %{
    supports_invoice: false,
    supports_balance_check: true,
    requires_two_step: false
  },
  validation_rules: %{
    account_number_format: "^[0-9]{6,10}$",
    min_amount: 100,
    max_amount: 1000000
  }
}
```

---

## Key Features

✅ **Multi-Biller Support** - Unified interface for multiple providers  
✅ **Transaction Tracking** - Complete audit trail  
✅ **T24 Integration** - Direct account transfers  
✅ **Error Handling** - Comprehensive error tracking  
✅ **Retry Logic** - Configurable retry attempts  
✅ **Flexible Configuration** - Per-biller settings  
✅ **XML/SOAP Support** - Handles legacy APIs  
✅ **Status Management** - Transaction lifecycle tracking  

---

## Files Reference

### Schemas
- `lib/service_manager/billers/biller_config.ex`
- `lib/service_manager/schemas/billers/biller_transaction.ex`

### Services
- `lib/service_manager/billers/billers_service.ex`
- `lib/service_manager/services/billers_apis/lwb/`
- `lib/service_manager/services/billers_apis/srwb/`
- `lib/service_manager/services/billers_apis/masm/`
- `lib/service_manager/services/billers_apis/bwb/`

### Controllers
- `lib/service_manager_web/controllers/api/billers_controller.ex`
- `lib/service_manager_web/controllers/api/bills_controller.ex`

### Routes
- `lib/service_manager_web/routes/billers.ex`

---

## Next Steps for Admin Panel

To integrate billers into the Next.js admin panel:

1. **Create Prisma Schema** for billers (mirror Elixir schemas)
2. **GraphQL Types** for biller configs and transactions
3. **UI Pages**:
   - Biller configuration management
   - Transaction history viewer
   - Account lookup tool
   - Payment processing interface
4. **Real-time Updates** for transaction status
5. **Reporting** for biller transaction analytics

