# Beneficiaries Feature Documentation

## Overview

The beneficiaries feature allows users to save frequently used payment destinations (beneficiaries) for quick and easy transactions. Beneficiaries can be either wallet users or bank accounts (internal FDH or external banks).

## Implementation Status

✅ **COMPLETED** - Full beneficiaries management system implemented!

### What Was Implemented

1. ✅ Prisma schema with Beneficiary model
2. ✅ Database migration (fdh_beneficiaries table)
3. ✅ GraphQL API (queries, mutations, type definitions)
4. ✅ Type-specific validation (WALLET, BANK_INTERNAL, BANK_EXTERNAL)
5. ✅ UI pages (list, create, edit)
6. ✅ Dynamic forms based on beneficiary type
7. ✅ CRUD operations with proper error handling

## Beneficiary Types

### 1. WALLET
- **Purpose**: Wallet-to-wallet transfers
- **Required Fields**: 
  - name
  - phoneNumber
- **Identifier**: Phone number (e.g., +265991234567)

### 2. BANK_INTERNAL
- **Purpose**: Transfers to FDH bank accounts
- **Required Fields**:
  - name
  - accountNumber
- **Identifier**: FDH account number
- **Bank**: Always "FDH Bank"

### 3. BANK_EXTERNAL
- **Purpose**: Transfers to other banks
- **Required Fields**:
  - name
  - accountNumber
  - bankCode
- **Optional Fields**:
  - bankName
  - branch
- **Identifier**: Account number + Bank code

## Database Schema

```prisma
enum BeneficiaryType {
  WALLET
  BANK_INTERNAL
  BANK_EXTERNAL
}

model Beneficiary {
  id              Int             @id @default(autoincrement())
  userId          Int             @map("user_id")
  user            MobileUser      @relation(...)
  name            String          @db.Text
  beneficiaryType BeneficiaryType @map("beneficiary_type")
  phoneNumber     String?         @map("phone_number")
  accountNumber   String?         @map("account_number")
  bankCode        String?         @map("bank_code")
  bankName        String?         @map("bank_name")
  branch          String?
  description     String?
  isActive        Boolean         @default(true)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  @@unique([userId, phoneNumber, beneficiaryType])
  @@unique([userId, accountNumber, beneficiaryType])
  @@unique([userId, accountNumber, bankCode, beneficiaryType])
  @@map("fdh_beneficiaries")
}
```

## GraphQL API

### Queries

```graphql
# Get all beneficiaries for a user
query {
  beneficiaries(userId: "123") {
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

# Get beneficiaries filtered by type
query {
  beneficiaries(userId: "123", type: WALLET) {
    id
    name
    phoneNumber
  }
}

# Get single beneficiary
query {
  beneficiary(id: "456") {
    id
    name
    beneficiaryType
    # ... all fields
  }
}
```

### Mutations

```graphql
# Create WALLET beneficiary
mutation {
  createBeneficiary(input: {
    userId: 123
    name: "John Doe"
    beneficiaryType: WALLET
    phoneNumber: "+265991234567"
    description: "Brother's wallet"
    isActive: true
  }) {
    id
    name
  }
}

# Create BANK_INTERNAL beneficiary
mutation {
  createBeneficiary(input: {
    userId: 123
    name: "Jane Smith"
    beneficiaryType: BANK_INTERNAL
    accountNumber: "1234567890"
    description: "Savings account"
  }) {
    id
    name
  }
}

# Create BANK_EXTERNAL beneficiary
mutation {
  createBeneficiary(input: {
    userId: 123
    name: "Bob Johnson"
    beneficiaryType: BANK_EXTERNAL
    accountNumber: "9876543210"
    bankCode: "SBICMWMW"
    bankName: "Standard Bank"
    branch: "Main Branch"
  }) {
    id
    name
  }
}

# Update beneficiary
mutation {
  updateBeneficiary(
    id: "456"
    input: {
      userId: 123
      name: "John Doe (Updated)"
      beneficiaryType: WALLET
      phoneNumber: "+265999999999"
      isActive: true
    }
  ) {
    id
    name
  }
}

# Delete beneficiary
mutation {
  deleteBeneficiary(id: "456")
}

# Toggle beneficiary active status
mutation {
  toggleBeneficiaryStatus(id: "456") {
    id
    isActive
  }
}
```

## UI Pages

### Access URLs

- **List**: `http://localhost:4000/adminpanel/mobile-banking/users/[userId]/beneficiaries`
- **Create**: `http://localhost:4000/adminpanel/mobile-banking/users/[userId]/beneficiaries/new`
- **Edit**: `http://localhost:4000/adminpanel/mobile-banking/users/[userId]/beneficiaries/[beneficiaryId]/edit`

### Features

**List Page**:
- View all beneficiaries for a user
- Filter by type (visual badges)
- See beneficiary details (name, type, identifier, bank)
- Status badges (Active/Inactive)
- Quick actions: Edit, Toggle Status, Delete
- Confirmation dialog before deletion

**Create Page**:
- Radio button type selector
- Dynamic form fields based on selected type
- Real-time validation
- Description field for notes
- Active/Inactive toggle

**Edit Page**:
- Pre-populated form with existing data
- Same dynamic form behavior as create
- Type can be changed (form updates accordingly)

## Validation Rules

### Type-Specific Validation

```typescript
WALLET:
  ✓ name (required)
  ✓ phoneNumber (required)
  ✗ accountNumber, bankCode (forbidden)

BANK_INTERNAL:
  ✓ name (required)
  ✓ accountNumber (required)
  ✗ phoneNumber, bankCode (forbidden)

BANK_EXTERNAL:
  ✓ name (required)
  ✓ accountNumber (required)
  ✓ bankCode (required)
  ~ bankName, branch (optional)
  ✗ phoneNumber (forbidden)
```

### Uniqueness Constraints

- **WALLET**: User cannot add duplicate phone number
- **BANK_INTERNAL**: User cannot add duplicate account number
- **BANK_EXTERNAL**: User cannot add duplicate account number + bank code combination

## Usage Examples

### For Mobile Banking Users

```bash
# 1. Navigate to user's beneficiaries
http://localhost:4000/adminpanel/mobile-banking/users/123/beneficiaries

# 2. Click "Add Beneficiary"

# 3. Select type and fill form:
#    - WALLET: Name + Phone
#    - BANK_INTERNAL: Name + Account Number
#    - BANK_EXTERNAL: Name + Account + Bank Code + Bank Name

# 4. Click "Create Beneficiary"
```

### For Wallet Users

Same structure, but accessed via:
```
http://localhost:4000/adminpanel/wallet/users/[userId]/beneficiaries
```

## Error Handling

### Common Errors

1. **Missing required fields**:
   - "Phone number is required for WALLET beneficiaries"
   - "Account number is required for BANK_INTERNAL beneficiaries"
   - "Bank code is required for BANK_EXTERNAL beneficiaries"

2. **Duplicate beneficiary**:
   - Unique constraint violation
   - Database will reject duplicate combinations

3. **Invalid user ID**:
   - User not found error

### Client-Side Validation

- Required fields marked with asterisk (*)
- HTML5 validation (required attribute)
- Toast notifications for success/error

### Server-Side Validation

- Type-specific field validation
- Unique constraint checks
- String trimming
- NULL handling

## Future Enhancements

### Phase 2 (Optional)
- [ ] Bank code dropdown (predefined list of banks)
- [ ] Phone number formatting/validation
- [ ] Account number format validation
- [ ] Beneficiary verification (check if account exists)

### Phase 3 (Advanced)
- [ ] Import beneficiaries from CSV/Excel
- [ ] Export beneficiaries
- [ ] Bulk operations (delete, activate, deactivate)
- [ ] Transaction history per beneficiary
- [ ] Favorite/starred beneficiaries
- [ ] Beneficiary groups/categories

## Testing

### Manual Testing

```bash
# 1. Start the admin panel
cd admin
npm run dev

# 2. Navigate to beneficiaries page
http://localhost:4000/adminpanel/mobile-banking/users/1/beneficiaries

# 3. Test CRUD operations:
#    - Create each type (WALLET, BANK_INTERNAL, BANK_EXTERNAL)
#    - Edit beneficiary
#    - Toggle status
#    - Delete beneficiary

# 4. Test validation:
#    - Try creating WALLET without phone number
#    - Try creating BANK_EXTERNAL without bank code
#    - Try creating duplicate beneficiary
```

### GraphQL Testing

```bash
# Test via GraphQL API
http://localhost:4000/adminpanel/api/graphql

# Run queries and mutations from examples above
```

## Security Considerations

1. **User-scoped data**: Beneficiaries are always scoped to a specific user
2. **Cascade delete**: Deleting a user deletes their beneficiaries
3. **Soft delete option**: Use `isActive` flag for soft deletes
4. **Validation**: Server-side validation prevents invalid data
5. **Unique constraints**: Prevent duplicate beneficiaries

## Migration Notes

If migrating from Phoenix beneficiaries:
1. Table name: `fdh_beneficiaries` (follows admin convention)
2. Different structure: Three types instead of two
3. Migration script may be needed for data conversion
4. Consider keeping both tables during transition

---

**Status**: ✅ Feature Complete and Production Ready
**Version**: 1.0.0
**Date**: 2024-12-10
