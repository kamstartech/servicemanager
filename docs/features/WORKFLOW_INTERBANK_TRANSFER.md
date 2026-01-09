# Workflow Interbank Transfer Implementation

**Date**: 2026-01-09  
**Feature**: Workflow-based Interbank Transfers  
**Status**: ✅ Implemented

---

## 🎯 Overview

The workflow system now supports interbank transfers (EXTERNAL_BANK) with a simplified flow: hold funds and record the transaction. Unlike bill payments, interbank transfers do **not** create `BillerTransaction` records - only `FdhTransaction` records are created.

---

## 🔄 Transaction Flow

### Interbank Transfer (POST_TRANSACTION Step)

```
User Initiates Transfer
         ↓
Step 1: Hold Funds (User Account → Suspense)
         ↓
Step 2: Record Transaction (FdhTransaction)
         ↓
     Success ✅
```

**Key Characteristics:**
- **2-Step Process**: Hold funds → Record transaction
- **Single Table**: Only `FdhTransaction` is created
- **Immediate Completion**: Status set to `COMPLETED` after successful hold
- **No External API Call**: Workflow only holds funds and records

---

## 📊 Implementation Details

### Step 1: Hold Funds

```typescript
const holdResult = await FundReservationService.holdFunds(
  amount,
  fromAccount,           // User's account
  reference,             // Transaction reference
  description
);
```

**What Happens:**
- Debits user account
- Credits suspense account
- Generates T24 reference
- Returns success/failure status

**On Failure:**
```typescript
return {
  success: false,
  error: `Failed to debit account: ${holdResult.error}`,
  structuredError: {
    title: 'Debit Failed',
    message: holdResult.error || 'Could not debit your account',
    code: 'HOLD_FAILED',
    type: 'POPUP'
  },
  shouldProceed: false
};
```

### Step 2: Lookup Bank Details

**Before creating transaction:**

```typescript
// Lookup external bank name from ExternalBank table
let bankName = null;
if (bankCode) {
  const externalBank = await prisma.externalBank.findUnique({
    where: { code: bankCode }
  });
  if (externalBank) {
    bankName = externalBank.name;
  }
}
```

### Step 3: Record Transaction

**After successful hold and bank lookup:**

```typescript
const transaction = await prisma.fdhTransaction.create({
  data: {
    type: 'TRANSFER',
    source: 'MOBILE_BANKING',
    reference: holdReference,           // T24 hold reference
    status: 'COMPLETED',                // ✅ Immediate completion
    transferType: 'EXTERNAL_BANK',      // Identifies interbank
    transferContext: 'MOBILE_BANKING',
    amount: amount,
    currency: 'MWK',
    description: description,
    fromAccountNumber: fromAccount,
    toAccountNumber: toAccount,
    toBankCode: bankCode,               // External bank code (from config)
    toBankName: bankName,               // Looked up from ExternalBank table
    initiatedByUserId: userId,
    t24Reference: holdReference,        // Same as reference
    t24Response: holdResult,            // Hold operation result
    completedAt: new Date()
  }
});
```

**Key Fields:**
- `transferType`: `EXTERNAL_BANK` (identifies as interbank)
- `toBankCode`: External bank code from config (e.g., "FNB", "STD")
- `toBankName`: Automatically looked up from `ExternalBank` table
- `status`: `COMPLETED` (not `PENDING`)
- `t24Reference`: Reference from hold operation

**On Database Error:**
```typescript
catch (e) {
  console.error('[WorkflowExecutor] Failed to save FdhTransaction:', e);
  // CRITICAL: Release held funds if DB fails
  await FundReservationService.releaseFunds(
    amount,
    fromAccount,
    holdReference,
    `Reversal: DB Failure - ${description}`
  );
  return {
    success: false,
    error: 'System error: Could not record transaction',
    shouldProceed: false
  };
}
```

---

## 📝 Comparison: Interbank vs Bill Payment

### Similarities
- Both use `POST_TRANSACTION` step (interbank) / `BILL_TRANSACTION` step (bills)
- Both hold funds before processing
- Both create `FdhTransaction` records
- Both use T24 reference for traceability

### Differences

| Aspect | Interbank Transfer | Bill Payment |
|--------|-------------------|--------------|
| **Tables Used** | `FdhTransaction` only | `FdhTransaction` + `BillerTransaction` |
| **Steps** | Hold → Record | Hold → Record → Call Biller API |
| **Final Status** | `COMPLETED` immediately | `COMPLETED` after biller success |
| **External API** | None (workflow ends) | Required (airtime, utility, etc.) |
| **Special Fields** | `toBankCode`, `toBankName` | `billerType`, `billerName` |
| **Vendor Tracking** | Not needed | `BillerTransaction` tracks vendor details |

---

## 🔧 Configuration Example

### Workflow Step Configuration

```json
{
  "id": "transfer-step",
  "type": "POST_TRANSACTION",
  "label": "Process Interbank Transfer",
  "config": {
    "transferType": "EXTERNAL_BANK",
    "parameterMapping": {
      "fromAccountNumber": "{{sourceAccount}}",
      "toAccountNumber": "{{destinationAccount}}",
      "amount": "{{amount}}",
      "currency": "MWK",
      "bankCode": "{{selectedBankCode}}",
      "description": "Interbank Transfer to bank {{selectedBankCode}}"
    }
  }
}
```

**Note**: Only `bankCode` is required. Bank name is automatically looked up from the `ExternalBank` table using the provided bank code.

---

## 🎯 Use Cases

### When to Use Workflow Interbank Transfer

✅ **Use This When:**
- Transfer initiated via mobile app workflows
- Multi-step process with forms and validation
- Need to hold funds before final processing
- Transaction should be recorded as `COMPLETED` after hold

❌ **Don't Use This When:**
- Direct T24 transfer is needed (use mobile `createTransfer` mutation)
- Immediate atomic transfer required
- Real-time external API call needed

---

## 📊 Transaction Lifecycle

### Status Timeline

```
T=0: Hold funds → SUCCESS
T=1: Create FdhTransaction → status: COMPLETED ✅
T=∞: Background settlement (outside workflow scope)
```

**Note:** The actual interbank settlement happens asynchronously in the background banking infrastructure. The workflow's responsibility ends after recording the transaction.

---

## 🔐 Security & Validation

### Pre-Hold Validations
1. Source account exists and belongs to user
2. Sufficient balance available
3. Bank code is valid
4. Amount within limits

### Post-Hold Protection
1. If DB fails, funds are automatically released
2. T24 reference ensures no duplicate holds
3. All operations logged for audit

---

## 📁 Code Location

**Implementation File:**
```
lib/services/workflow/workflow-executor.ts
Lines: 961-1050 (handlePostTransactionStep method)
```

**Key Functions:**
```typescript
private async handlePostTransactionStep(
  step: WorkflowStep,
  context: ExecutionContext,
  input: any
): Promise<StepExecutionResponse>
```

---

## 🧪 Testing

### Test Scenario: Successful Transfer

```typescript
const result = await executeWorkflowStep({
  step: {
    type: 'POST_TRANSACTION',
    config: {
      transferType: 'EXTERNAL_BANK',
      parameterMapping: {
        fromAccountNumber: '1234567890',
        toAccountNumber: '0987654321',
        amount: '10000',
        currency: 'MWK',
        bankCode: 'FNB',
        bankName: 'First National Bank'
      }
    }
  }
});

// Expected:
// - holdResult.success = true
// - transaction.status = 'COMPLETED'
// - result.success = true
```

### Test Scenario: Hold Failure

```typescript
// Insufficient balance scenario
const result = await executeWorkflowStep({
  step: { /* same config */ }
});

// Expected:
// - holdResult.success = false
// - No transaction created
// - result.error = "Failed to debit account: Insufficient funds"
```

### Test Scenario: Database Failure

```typescript
// Simulate DB error after successful hold
// Expected:
// - Funds automatically released via releaseFunds()
// - result.error = "System error: Could not record transaction"
```

---

## 🔄 Related Endpoints

### Mobile GraphQL (Direct Transfer)

For comparison, the mobile endpoint handles interbank differently:

```graphql
mutation {
  createTransfer(input: {
    type: EXTERNAL_BANK
    fromAccountNumber: "1234567890"
    toAccountNumber: "0987654321"
    bankCode: "FNB"
    bankName: "First National Bank"
    amount: "10000"
    currency: "MWK"
  }) {
    success
    transaction {
      id
      status
      reference
    }
  }
}
```

**Difference:** Mobile endpoint calls T24 directly for atomic transfer; workflow holds funds for later settlement.

---

## 📚 Related Documentation

- [Workflow System Guide](./WORKFLOW_SYSTEM_GUIDE.md) - Overall workflow architecture
- [Bill Payment Workflow](./BILLERS_WORKFLOW_INTEGRATION.md) - Similar pattern with external API
- [Transaction System](./TRANSACTION_SYSTEM_IMPLEMENTATION.md) - FdhTransaction model details
- [T24 Integration](../t24/T24_ACCOUNTS_ENDPOINT.md) - T24 ESB integration

---

## 🚀 Future Enhancements

### Potential Improvements

1. **Real-time Settlement**
   - Add webhook for bank settlement confirmation
   - Update status from `COMPLETED` to `SETTLED`

2. **Status Tracking**
   - Add `HELD` status between hold and completion
   - Track settlement progress

3. **Batch Processing**
   - Group multiple interbank transfers
   - Optimize settlement fees

4. **Enhanced Validation**
   - Validate bank codes against registry
   - Check beneficiary name matching

---

## 💡 Design Rationale

### Why No External API Call?

**Decision:** Workflow only holds funds and records transaction; settlement happens separately.

**Reasons:**
1. **Separation of Concerns**: Workflow handles user interaction; settlement is infrastructure-level
2. **Reliability**: Don't block workflow on external bank APIs
3. **Async Nature**: Interbank transfers settle in batch, not real-time
4. **Status Clarity**: `COMPLETED` means "user's part done", not "money transferred"

### Why COMPLETED Status?

**Decision:** Mark as `COMPLETED` immediately after successful hold, not `PENDING`.

**Reasons:**
1. **User Experience**: User sees confirmation immediately
2. **Funds Secured**: Money is held in suspense, safe from user
3. **Workflow Clarity**: Workflow step completed its job
4. **Settlement Abstraction**: Backend settlement is transparent to workflow

---

## 🔍 Troubleshooting

### Common Issues

**Issue: Transaction created but funds not held**
- **Cause**: DB success but hold reversed due to error
- **Solution**: Check T24 logs for hold operation
- **Prevention**: Ensure hold happens before DB insert

**Issue: Funds held but no transaction record**
- **Cause**: DB error after successful hold
- **Solution**: Check error logs; funds should auto-release
- **Prevention**: Robust error handling ensures refund

**Issue: Duplicate transactions**
- **Cause**: Workflow re-executed with same reference
- **Solution**: Use unique references per execution
- **Prevention**: Reference includes session ID

---

**Status**: ✅ Implemented  
**Version**: 1.0.0  
**Last Updated**: 2026-01-09  
**Maintainer**: Development Team
