# POST_TRANSACTION Workflow Configuration Guide

**Date**: 2026-01-09  
**Step Type**: `POST_TRANSACTION`  
**Use Case**: External bank transfers, internal transfers, wallet transfers

---

## 📋 Configuration Structure

### Basic POST_TRANSACTION Step

```json
{
  "id": "transfer-step",
  "type": "POST_TRANSACTION",
  "order": 3,
  "label": "Process Transfer",
  "config": {
    "transferType": "EXTERNAL_BANK",
    "parameterMapping": {
      "fromAccountNumber": "{{sourceAccount}}",
      "toAccountNumber": "{{destinationAccount}}",
      "amount": "{{amount}}",
      "currency": "MWK",
      "bankCode": "{{selectedBankCode}}",
      "description": "Transfer to {{recipientName}} - {{purpose}}"
    }
  }
}
```

**Important**: The `description` field is **mappable** and highly recommended. The description is stored exactly as provided (no prefix added).

---

## 🔧 Configuration Fields

### config.transferType

**Required**: Yes  
**Type**: `string`  
**Options**: `EXTERNAL_BANK`, `FDH_BANK`, `FDH_WALLET`, `EXTERNAL_WALLET`, `SELF`

Determines the type of transfer and which processing flow to use.

### config.parameterMapping

**Required**: Yes  
**Type**: `object`  

Maps workflow variables to transaction parameters.

---

## 📝 Parameter Mapping Fields

### Required Parameters

| Parameter | Type | Description | Example Value | Template Example |
|-----------|------|-------------|---------------|------------------|
| `fromAccountNumber` | string | Source account number | `"1234567890"` | `"{{sourceAccount}}"` |
| `toAccountNumber` | string | Destination account number | `"0987654321"` | `"{{destinationAccount}}"` |
| `amount` | string/number | Transfer amount | `"50000"` | `"{{amount}}"` |
| `description` | string | Transaction description | `"Payment to vendor"` | `"{{form.purpose}}"` |

### EXTERNAL_BANK Specific Parameters

| Parameter | Type | Description | Example Value | Template Example |
|-----------|------|-------------|---------------|------------------|
| `bankCode` | string | External bank code (looked up in ExternalBank table) | `"FNB"` | `"{{selectedBankCode}}"` |

**Note**: `bankName` is automatically looked up from the `ExternalBank` table using `bankCode`. You only need to provide `bankCode` in the configuration.

### Optional Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `currency` | string | Currency code | `"MWK"` |
| `reference` | string | Custom transaction reference | Auto-generated (`WF-{sessionId}`) |
| `debitAccountType` | string | Account type | `"CASA"` |

**Note on Description**: While `description` is listed as required, it will fallback to `step.label` or `"Workflow Transaction"` if not provided. However, **it's strongly recommended** to provide a meaningful description for better transaction tracking.

---

## 🎯 Complete Examples

### 1. External Bank Transfer

```json
{
  "name": "Interbank Transfer",
  "description": "Transfer to other banks",
  "isActive": true,
  "config": {
    "steps": [
      {
        "id": "step-1",
        "type": "FORM",
        "order": 0,
        "label": "Enter Transfer Details",
        "config": {
          "formId": "interbank-form"
        }
      },
      {
        "id": "step-2",
        "type": "POST_TRANSACTION",
        "order": 1,
        "label": "Process Transfer",
        "config": {
          "transferType": "EXTERNAL_BANK",
          "parameterMapping": {
            "fromAccountNumber": "{{form.sourceAccount}}",
            "toAccountNumber": "{{form.destinationAccount}}",
            "amount": "{{form.amount}}",
            "currency": "MWK",
            "bankCode": "{{form.selectedBank.code}}",
            "description": "{{form.purpose}} - Ref: {{form.referenceNumber}}"
          }
        }
      },
      {
        "id": "step-3",
        "type": "DISPLAY",
        "order": 2,
        "label": "Success",
        "config": {
          "template": "transfer-receipt"
        }
      }
    ]
  }
}
```

**Note**: 
- Bank name is automatically looked up from `ExternalBank` table using `bankCode`
- `description` field is fully mappable with template variables
- Description is stored exactly as provided in the configuration

**Form Fields Required:**
```json
{
  "sourceAccount": "1234567890",
  "destinationAccount": "0987654321",
  "amount": "50000",
  "selectedBank": { "code": "FNB" },
  "purpose": "Invoice payment",
  "referenceNumber": "INV-2026-001"
}
```

**Result in Database:**
```
description: "Invoice payment - Ref: INV-2026-001"
```

### 2. Internal FDH Bank Transfer

```json
{
  "id": "internal-transfer-step",
  "type": "POST_TRANSACTION",
  "order": 2,
  "label": "Transfer Funds",
  "config": {
    "transferType": "FDH_BANK",
    "parameterMapping": {
      "fromAccountNumber": "{{form.sourceAccount}}",
      "toAccountNumber": "{{form.destinationAccount}}",
      "amount": "{{form.amount}}",
      "currency": "MWK",
      "description": "{{form.purpose}} - Between my accounts"
    }
  }
}
```

### 3. FDH Wallet Transfer

```json
{
  "id": "wallet-transfer-step",
  "type": "POST_TRANSACTION",
  "order": 2,
  "label": "Transfer to Wallet",
  "config": {
    "transferType": "FDH_WALLET",
    "parameterMapping": {
      "fromAccountNumber": "{{form.sourceAccount}}",
      "toAccountNumber": "{{form.walletNumber}}",
      "amount": "{{form.amount}}",
      "currency": "MWK",
      "description": "Bank to wallet transfer"
    }
  }
}
```

---

## 🔄 Variable Resolution

### Template Syntax

Use double curly braces for variables: `{{variableName}}`

### Available Variable Sources

#### 1. Form Data (from previous FORM step)
```json
"amount": "{{form.amount}}"
"sourceAccount": "{{form.sourceAccount}}"
"destinationAccount": "{{form.destinationAccount}}"
"bankCode": "{{form.selectedBank.code}}"
"description": "{{form.purpose}}"                    // ← Description field
"description": "{{form.transferReason}} - {{form.invoiceNumber}}"  // ← Combined
```

**Note**: Bank name is automatically looked up - no need to map it from form.

#### 2. Context Variables
```json
"userId": "{{context.userId}}"
"sessionId": "{{context.sessionId}}"
"source": "{{context.source}}"
```

#### 3. Nested Objects
```json
"bankCode": "{{form.selectedBank.code}}"
"accountName": "{{form.beneficiary.accountName}}"
"description": "Payment to {{form.beneficiary.name}}"  // ← Using nested field
```

**Note**: Bank name (`toBankName`) is automatically populated by looking up `bankCode` in the `ExternalBank` table.

#### 4. Previous Step Output
```json
"validatedAmount": "{{step-1.output.amount}}"
"approvedAccount": "{{step-2.output.accountNumber}}"
```

### Description Field Mapping Examples

The `description` field is **fully mappable** and supports template variables:

**Simple Static:**
```json
"description": "Interbank transfer"
```

**Single Variable:**
```json
"description": "{{form.purpose}}"
```

**Multiple Variables:**
```json
"description": "{{form.purpose}} - Invoice {{form.invoiceNumber}}"
```

**With Nested Objects:**
```json
"description": "Payment to {{form.beneficiary.name}} for {{form.purpose}}"
```

**Date/Time Context:**
```json
"description": "Salary transfer - {{context.month}}"
```

**Final Result in Database:**
For all transfer types, the description is stored exactly as provided:
```
description: "{your mapped description}"
```

**Examples:**
- Input: `"Invoice payment - INV-001"` → Stored: `"Invoice payment - INV-001"`
- Input: `"Salary to John Doe"` → Stored: `"Salary to John Doe"`
- Input: `"{{form.purpose}} - {{form.ref}}"` → Stored: `"Supplier payment - PO-123"`

---

## 📤 Step Execution Flow

### For EXTERNAL_BANK Transfer Type

```
1. Resolve all {{variables}} in parameterMapping
         ↓
2. Validate required fields (fromAccount, toAccount, amount, bankCode)
         ↓
3. Hold Funds (User Account → Suspense Account)
         ↓
4. Lookup Bank Name from ExternalBank table using bankCode
         ↓
5. Create FdhTransaction (status: COMPLETED, with toBankCode & toBankName)
         ↓
6. Return Success Response
```

### For FDH_BANK Transfer Type

```
1. Resolve all {{variables}} in parameterMapping
         ↓
2. Validate required fields present
         ↓
3. Call T24 Direct Transfer API
         ↓
4. Create FdhTransaction (status: COMPLETED/FAILED)
         ↓
5. Return Response
```

---

## ✅ Success Response

When POST_TRANSACTION step succeeds:

```json
{
  "success": true,
  "output": {
    "t24Reference": "T24-20260109-123456",
    "transactionId": "tx-abc123def456",
    "status": "COMPLETED",
    "message": "Transfer completed successfully"
  },
  "shouldProceed": true
}
```

### Accessing Response in Next Steps

```json
{
  "type": "DISPLAY",
  "config": {
    "data": {
      "reference": "{{step-3.output.t24Reference}}",
      "transactionId": "{{step-3.output.transactionId}}"
    }
  }
}
```

---

## ❌ Error Response

When POST_TRANSACTION step fails:

```json
{
  "success": false,
  "error": "Failed to debit account: Insufficient funds",
  "structuredError": {
    "title": "Debit Failed",
    "message": "Could not debit your account",
    "code": "HOLD_FAILED",
    "type": "POPUP"
  },
  "shouldProceed": false
}
```

**Note**: Workflow execution stops when `shouldProceed: false`

---

## 🗄️ Database Records Created

### For EXTERNAL_BANK Transfer

**Table**: `FdhTransaction`

```typescript
{
  id: "generated-id",
  type: "TRANSFER",
  reference: "T24-20260109-123456",
  status: "COMPLETED",
  transferType: "EXTERNAL_BANK",
  transferContext: "MOBILE_BANKING",
  amount: 50000,
  currency: "MWK",
  description: "Transfer to FNB - 0987654321",
  fromAccountNumber: "1234567890",
  toAccountNumber: "0987654321",
  toBankCode: "FNB",                    // ← EXTERNAL_BANK specific
  toBankName: "First National Bank",    // ← EXTERNAL_BANK specific
  t24Reference: "T24-20260109-123456",
  t24Response: { /* hold result */ },
  initiatedByUserId: 123,
  completedAt: "2026-01-09T13:00:00.000Z",
  createdAt: "2026-01-09T13:00:00.000Z"
}
```

**Note**: Only `FdhTransaction` is created. No `BillerTransaction` for interbank transfers.

---

## 🔍 Validation Rules

### Automatic Validations

The workflow executor automatically validates:

1. ✅ `fromAccount` is present
2. ✅ `toAccount` is present
3. ✅ `amount` is present and greater than 0
4. ✅ For EXTERNAL_BANK: `bankCode` is present
5. ✅ For EXTERNAL_BANK: `bankName` is present

### Validation Errors

```json
{
  "success": false,
  "error": "Missing required transaction data: Source Account, Amount",
  "shouldProceed": false
}
```

---

## 🎨 Admin UI Configuration

### Creating POST_TRANSACTION Step

1. Navigate to **Workflows** → Select Workflow → **Edit**
2. Click **Add Step** → Select **Post Transaction**
3. Configure:
   - **Label**: "Process Transfer"
   - **Transfer Type**: Select from dropdown (EXTERNAL_BANK, FDH_BANK, etc.)
   - **Parameter Mapping**: Add field mappings

### Example UI Fields

```
Label: Process Interbank Transfer
Transfer Type: [EXTERNAL_BANK ▼]

Parameter Mapping:
┌─────────────────────────────────────────────┐
│ From Account:     {{form.sourceAccount}}    │
│ To Account:       {{form.destinationAccount}}│
│ Amount:           {{form.amount}}           │
│ Currency:         MWK                       │
│ Bank Code:        {{form.selectedBank.code}}│
│ Bank Name:        {{form.selectedBank.name}}│
│ Description:      Transfer to external bank │
└─────────────────────────────────────────────┘
```

---

## 🚨 Common Issues

### Issue: Variables not resolving

**Problem**: `{{form.amount}}` shows up as literal string

**Solutions**:
1. Ensure previous FORM step has completed
2. Check form field names match exactly
3. Verify form data is in context

### Issue: bankCode/bankName required but not set

**Problem**: "Missing required field: Bank Code"

**Solutions**:
1. Set `transferType` to `"EXTERNAL_BANK"`
2. Add `bankCode` to parameterMapping
3. Ensure form provides bank code value
4. Bank name will be automatically looked up - don't provide it manually

### Issue: Funds held but transaction not created

**Problem**: Database error after hold

**Solutions**:
1. Funds automatically released
2. Check database connectivity
3. Review error logs for details

---

## 📊 Transfer Type Comparison

| Transfer Type | Use Case | Required Fields | Tables Used |
|--------------|----------|-----------------|-------------|
| `EXTERNAL_BANK` | To other banks | bankCode, bankName | FdhTransaction |
| `FDH_BANK` | Between FDH accounts | - | FdhTransaction |
| `FDH_WALLET` | Bank to FDH wallet | - | FdhTransaction |
| `EXTERNAL_WALLET` | To external wallet | - | FdhTransaction |
| `SELF` | Between own accounts | - | FdhTransaction |

---

## 📚 Related Documentation

- **[Workflow System Guide](../features/WORKFLOW_SYSTEM_GUIDE.md)** - Overall workflow architecture
- **[Interbank Transfer Implementation](../features/WORKFLOW_INTERBANK_TRANSFER.md)** - Detailed interbank flow
- **[Bill Payment Workflow](../features/BILLERS_WORKFLOW_INTEGRATION.md)** - BILL_TRANSACTION step
- **[Transaction System](../features/TRANSACTION_SYSTEM_IMPLEMENTATION.md)** - FdhTransaction details

---

**Last Updated**: 2026-01-09  
**Status**: ✅ Production Ready  
**Maintainer**: Development Team
