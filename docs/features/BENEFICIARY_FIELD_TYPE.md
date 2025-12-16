# Beneficiary Field Type

## Overview

The **beneficiary** field type is a special form field that allows users to select from their saved beneficiaries. This field dynamically fetches beneficiaries from the database and presents them as a dropdown/selection list.

## Field Configuration

### Basic Structure

```typescript
{
  id: "field_beneficiary",
  type: "beneficiary",
  label: "Select Beneficiary",
  required: true,
  beneficiaryType: "ALL" | "WALLET" | "BANK_INTERNAL" | "BANK_EXTERNAL"
}
```

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the field |
| `type` | "beneficiary" | Yes | Field type must be "beneficiary" |
| `label` | string | Yes | Label displayed to the user |
| `required` | boolean | Yes | Whether the field is required |
| `beneficiaryType` | string | No | Filter beneficiaries by type (default: "ALL") |

### Beneficiary Type Options

- **ALL**: Show all beneficiary types
- **WALLET**: Show only mobile wallet beneficiaries (phone numbers)
- **BANK_INTERNAL**: Show only internal bank account beneficiaries
- **BANK_EXTERNAL**: Show only external bank account beneficiaries

## Database Schema

### Beneficiary Model

```prisma
model Beneficiary {
  id              Int             @id @default(autoincrement())
  userId          Int             @map("user_id")
  name            String          @db.Text
  beneficiaryType BeneficiaryType @map("beneficiary_type")
  
  // For WALLET
  phoneNumber     String?         @map("phone_number") @db.Text
  
  // For BANK_INTERNAL and BANK_EXTERNAL
  accountNumber   String?         @map("account_number") @db.Text
  
  // For BANK_EXTERNAL only
  bankCode        String?         @map("bank_code") @db.Text
  bankName        String?         @map("bank_name") @db.Text
  branch          String?         @db.Text
  
  description     String?         @db.Text
  isActive        Boolean         @default(true) @map("is_active")
  
  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")
}

enum BeneficiaryType {
  WALLET
  BANK_INTERNAL
  BANK_EXTERNAL
}
```

## GraphQL Query

### Fetch Beneficiaries

```graphql
query GetBeneficiaries($userId: ID!, $type: BeneficiaryType) {
  beneficiaries(userId: $userId, type: $type) {
    id
    name
    beneficiaryType
    phoneNumber
    accountNumber
    bankCode
    bankName
    branch
    description
    isActive
  }
}
```

### Example Response

```json
{
  "data": {
    "beneficiaries": [
      {
        "id": "1",
        "name": "John Doe",
        "beneficiaryType": "WALLET",
        "phoneNumber": "+265 999 123 456",
        "accountNumber": null,
        "bankCode": null,
        "bankName": null,
        "isActive": true
      },
      {
        "id": "2",
        "name": "Jane Smith",
        "beneficiaryType": "BANK_INTERNAL",
        "phoneNumber": null,
        "accountNumber": "1234567890",
        "bankCode": null,
        "bankName": null,
        "isActive": true
      },
      {
        "id": "3",
        "name": "ABC Company",
        "beneficiaryType": "BANK_EXTERNAL",
        "phoneNumber": null,
        "accountNumber": "9876543210",
        "bankCode": "NBM",
        "bankName": "National Bank of Malawi",
        "isActive": true
      }
    ]
  }
}
```

## Mobile Implementation

### 1. Form Rendering

When the mobile app receives a form with a beneficiary field:

```typescript
// Detect beneficiary field
if (field.type === "beneficiary") {
  // Fetch beneficiaries for the current user
  const beneficiaries = await fetchBeneficiaries(
    userId,
    field.beneficiaryType
  );
  
  // Render as dropdown/selection
  renderBeneficiaryDropdown(beneficiaries, field);
}
```

### 2. Fetching Beneficiaries

```typescript
async function fetchBeneficiaries(
  userId: string,
  typeFilter?: string
): Promise<Beneficiary[]> {
  const query = `
    query GetBeneficiaries($userId: ID!, $type: BeneficiaryType) {
      beneficiaries(userId: $userId, type: $type) {
        id
        name
        beneficiaryType
        phoneNumber
        accountNumber
        bankCode
        bankName
        isActive
      }
    }
  `;
  
  const variables = {
    userId,
    type: typeFilter !== "ALL" ? typeFilter : undefined,
  };
  
  const response = await graphqlClient.query(query, variables);
  return response.data.beneficiaries.filter(b => b.isActive);
}
```

### 3. Display Format

Format beneficiary display based on type:

```typescript
function formatBeneficiaryDisplay(beneficiary: Beneficiary): string {
  switch (beneficiary.beneficiaryType) {
    case "WALLET":
      return `${beneficiary.name} - ${beneficiary.phoneNumber}`;
    
    case "BANK_INTERNAL":
      return `${beneficiary.name} - **** ${beneficiary.accountNumber?.slice(-4)}`;
    
    case "BANK_EXTERNAL":
      return `${beneficiary.name} - ${beneficiary.bankName} (**** ${beneficiary.accountNumber?.slice(-4)})`;
    
    default:
      return beneficiary.name;
  }
}
```

### 4. Form Submission

When submitting the form, include the selected beneficiary ID:

```json
{
  "formId": "form_123",
  "data": {
    "field_beneficiary": "2",
    "field_amount": 5000,
    "field_reference": "Monthly payment"
  }
}
```

## Example Use Cases

### 1. Money Transfer Form

```typescript
const transferForm = {
  name: "Money Transfer Form",
  schema: {
    fields: [
      {
        id: "beneficiary",
        type: "beneficiary",
        label: "Send Money To",
        required: true,
        beneficiaryType: "ALL"
      },
      {
        id: "amount",
        type: "number",
        label: "Amount",
        required: true
      }
    ]
  }
};
```

### 2. Mobile Wallet Transfer

```typescript
const walletTransferForm = {
  name: "Wallet Transfer Form",
  schema: {
    fields: [
      {
        id: "beneficiary",
        type: "beneficiary",
        label: "Mobile Number",
        required: true,
        beneficiaryType: "WALLET" // Only show wallet beneficiaries
      },
      {
        id: "amount",
        type: "number",
        label: "Amount",
        required: true
      }
    ]
  }
};
```

### 3. Bank Transfer Form

```typescript
const bankTransferForm = {
  name: "Bank Transfer Form",
  schema: {
    fields: [
      {
        id: "beneficiary",
        type: "beneficiary",
        label: "Account",
        required: true,
        beneficiaryType: "BANK_INTERNAL" // Only show internal bank accounts
      },
      {
        id: "amount",
        type: "number",
        label: "Amount",
        required: true
      }
    ]
  }
};
```

## Backend Processing

When processing a form submission with a beneficiary field:

```typescript
async function processFormSubmission(formData: any, userId: string) {
  const beneficiaryId = formData.field_beneficiary;
  
  // Fetch full beneficiary details
  const beneficiary = await prisma.beneficiary.findUnique({
    where: { 
      id: parseInt(beneficiaryId),
      userId: parseInt(userId) // Ensure user owns this beneficiary
    }
  });
  
  if (!beneficiary) {
    throw new Error("Beneficiary not found or access denied");
  }
  
  // Process transaction based on beneficiary type
  switch (beneficiary.beneficiaryType) {
    case "WALLET":
      return processWalletTransfer(beneficiary, formData);
    
    case "BANK_INTERNAL":
      return processBankTransfer(beneficiary, formData);
    
    case "BANK_EXTERNAL":
      return processExternalBankTransfer(beneficiary, formData);
  }
}
```

## Security Considerations

1. **User Isolation**: Always verify that the beneficiary belongs to the requesting user
2. **Active Status**: Only show active beneficiaries (`isActive: true`)
3. **Validation**: Validate beneficiary ID on form submission
4. **Authorization**: Check user permissions before allowing transactions

## API Endpoints

### REST API (Alternative to GraphQL)

```typescript
// GET /api/beneficiaries?userId={userId}&type={type}
app.get('/api/beneficiaries', async (req, res) => {
  const { userId, type } = req.query;
  
  const where: any = {
    userId: parseInt(userId),
    isActive: true
  };
  
  if (type && type !== 'ALL') {
    where.beneficiaryType = type;
  }
  
  const beneficiaries = await prisma.beneficiary.findMany({
    where,
    orderBy: { name: 'asc' }
  });
  
  res.json(beneficiaries);
});
```

## Testing

### Seed Data for Testing

```typescript
// Create test beneficiaries
await prisma.beneficiary.createMany({
  data: [
    {
      userId: 1,
      name: "John Doe",
      beneficiaryType: "WALLET",
      phoneNumber: "+265 999 123 456",
      isActive: true
    },
    {
      userId: 1,
      name: "Jane Smith",
      beneficiaryType: "BANK_INTERNAL",
      accountNumber: "1234567890",
      isActive: true
    },
    {
      userId: 1,
      name: "ABC Company",
      beneficiaryType: "BANK_EXTERNAL",
      accountNumber: "9876543210",
      bankCode: "NBM",
      bankName: "National Bank of Malawi",
      isActive: true
    }
  ]
});
```

## Troubleshooting

### No Beneficiaries Showing

1. Check if user has any beneficiaries: `SELECT * FROM fdh_beneficiaries WHERE user_id = ?`
2. Verify `isActive = true`
3. Check beneficiaryType filter matches available beneficiaries
4. Ensure GraphQL query is passing correct userId

### Wrong Beneficiaries Showing

1. Verify userId in query matches authenticated user
2. Check beneficiaryType filter is correct
3. Review beneficiary ownership in database

---

**Last Updated**: December 14, 2024
