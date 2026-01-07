# Quick Reference: Table Header Standards

## ✅ Always Use COMMON_TABLE_HEADERS

```typescript
import { COMMON_TABLE_HEADERS, DataTable, type DataTableColumn } from "@/components/data-table";

const columns: DataTableColumn<MyType>[] = [
  {
    id: "name",
    header: COMMON_TABLE_HEADERS.name, // ✅ DO THIS
    accessor: ...
  },
  {
    id: "email",
    header: translate("common.table.columns.email"), // ❌ DON'T DO THIS
    accessor: ...
  }
];
```

## Available Headers (62 total)

### Common
- `index` - "#"
- `name` - "Name"
- `description` - "Description"
- `status` - "Status"
- `actions` - "Actions"
- `type` - "Type"
- `category` - "Category"

### User & Identity
- `user` - "User"
- `email` - "Email"
- `username` - "Username"
- `phone` - "Phone"
- `phoneNumber` - "Phone number"
- `customerNumber` - "Customer number"

### Accounts
- `account` - "Account"
- `accountNumber` - "Account Number"
- `holderName` - "Holder Name"
- `fromAccount` - "From Account"
- `toAccount` - "To Account"

### Financial
- `amount` - "Amount"
- `balance` - "Balance"
- `reference` - "Reference"
- `transactionType` - "Transaction Type"
- `biller` - "Biller"
- `externalRef` - "External Ref"

### Dates
- `date` - "Date"
- `dateTime` - "Date & Time"
- `created` - "Created"
- `createdAt` - "Created At"
- `requested` - "Requested"
- `lastUsed` - "Last Used"
- `lastRun` - "Last Run"
- `nextRun` - "Next Run"
- `expires` - "Expires"

### Technical
- `device` - "Device"
- `deviceName` - "Device Name"
- `ipAddress` - "IP Address"
- `location` - "Location"
- `source` - "Source"
- `sourceIp` - "Source IP"
- `context` - "Context"
- `failureReason` - "Failure Reason"

### System
- `filename` - "Filename"
- `size` - "Size"
- `tokens` - "Tokens"
- `apiCalls` - "API Calls"
- `usage` - "Usage"
- `attachedTo` - "Attached To"
- `version` - "Version"
- `interval` - "Interval"
- `retries` - "Retries"

### Database
- `schema` - "Schema"
- `tableName` - "Table name"
- `targetTable` - "Target Table"

### Other
- `order` - "Order"
- `icon` - "Icon"
- `active` - "Active"
- `testing` - "Testing"
- `label` - "Label"
- `workflow` - "Workflow"
- `serviceName` - "Service Name"
- `bank` - "Bank"
- `details` - "Details"
- `quantity` - "Quantity"
- `collectionPoint` - "Collection Point"
- `contactEmail` - "Contact Email"

## How It Works

```typescript
// 1. You use COMMON_TABLE_HEADERS
header: COMMON_TABLE_HEADERS.name

// 2. Returns English string
// → "Name"

// 3. DataTable's renderHeader() receives it
// → normalizeHeader("Name") → "name"

// 4. Looks up in commonHeaderMap
// → commonHeaderMap["name"] → "common.table.columns.name"

// 5. Translates it
// → translate("common.table.columns.name")

// 6. Returns translated text
// → "Name" (EN) or "Nome" (PT)
```

## Adding New Headers

**1. Add to COMMON_TABLE_HEADERS:**
```typescript
// components/data-table.tsx
export const COMMON_TABLE_HEADERS = {
  // ...
  myNewHeader: "My New Header",
} as const;
```

**2. Add to commonHeaderMap:**
```typescript
const commonHeaderMap: Record<string, string> = {
  // ...
  "my new header": "common.table.columns.myNewHeader",
};
```

**3. Add translations:**
```typescript
// lib/i18n/dictionaries/en.ts
common.table.columns: {
  myNewHeader: "My New Header",
}

// lib/i18n/dictionaries/pt.ts
common.table.columns: {
  myNewHeader: "Meu Novo Cabeçalho",
}
```

**4. Use it:**
```typescript
header: COMMON_TABLE_HEADERS.myNewHeader
```

## Special Cases

### Domain-Specific Headers
For page-specific columns:
```typescript
// ✅ OK - Use domain-specific translations
header: translate("adminUsers.columns.specialField")
```

### Row Number Header
```typescript
<DataTable
  showRowNumbers
  rowNumberHeader={COMMON_TABLE_HEADERS.index} // ✅ Use this
  // OR
  rowNumberHeader="#" // ✅ Also OK (auto-translates)
/>
```

---

**Remember**: ONE place to change headers = `components/data-table.tsx`
