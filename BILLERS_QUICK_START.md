# Billers System - Quick Start Guide

Quick reference for working with the billers system.

## 🚀 Quick Commands

### Database Operations
```bash
# Generate Prisma client (after schema changes)
npx prisma generate

# Create migration (when DB is running)
npx prisma migrate dev --name add_billers_system

# Run seed
npx ts-node prisma/seed/billers.ts

# View database in Prisma Studio
npx prisma studio
```

### Development
```bash
# Start dev server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
```

---

## 📊 Using the Service Layer

### Get Biller Configuration
```typescript
import { prisma } from "@/lib/db";
import { BillerType } from "@prisma/client";

// Get specific biller
const lwbConfig = await prisma.billerConfig.findUnique({
  where: { billerType: BillerType.LWB_POSTPAID }
});

// Get all active billers
const activeBillers = await prisma.billerConfig.findMany({
  where: { isActive: true }
});
```

### Create Transaction
```typescript
import { billerTransactionService } from "@/lib/services/billers/transactions";

const transaction = await billerTransactionService.createTransaction({
  billerConfigId: config.id,
  billerType: "LWB_POSTPAID",
  billerName: "Lilongwe Water Board",
  accountNumber: "123456",
  amount: 5000,
  currency: "MWK",
  transactionType: "POST_TRANSACTION",
  initiatedBy: "user-id",
});

console.log("Transaction ID:", transaction.ourTransactionId);
```

### Update Transaction Status
```typescript
// Mark as completed
await billerTransactionService.completeTransaction(
  transaction.id,
  { billerResponse: "success" },
  "BILLER-REF-123"
);

// Mark as failed
await billerTransactionService.failTransaction(
  transaction.id,
  "Payment failed: insufficient balance",
  "ERR_INSUFFICIENT_FUNDS"
);
```

### Get Transaction Statistics
```typescript
const stats = await billerTransactionService.getStats(
  new Date("2025-12-01"),
  new Date("2025-12-31")
);

console.log(`Success Rate: ${stats.successRate}%`);
console.log(`Total Amount: MWK ${stats.totalAmount}`);
```

---

## 🔧 Working with Biller Services

### Create a Service Instance
```typescript
import { BillerServiceFactory } from "@/lib/services/billers/factory";

const config = await prisma.billerConfig.findUnique({
  where: { billerType: BillerType.LWB_POSTPAID }
});

const service = BillerServiceFactory.create(config!);
```

### Lookup Account (when implemented)
```typescript
try {
  const accountDetails = await service.lookupAccount("123456");
  
  console.log("Customer:", accountDetails.customerName);
  console.log("Balance:", accountDetails.balance);
} catch (error) {
  console.error("Lookup failed:", error.message);
}
```

### Process Payment (when implemented)
```typescript
try {
  const result = await service.processPayment({
    accountNumber: "123456",
    amount: 5000,
    currency: "MWK",
  });
  
  if (result.success) {
    console.log("Payment successful:", result.transactionId);
  } else {
    console.error("Payment failed:", result.error);
  }
} catch (error) {
  console.error("Payment error:", error.message);
}
```

---

## 🎨 Component Usage (Phase 2+)

### Biller Selector
```tsx
import { BillerSelector } from "@/components/billers/BillerSelector";

<BillerSelector
  value={selectedBiller}
  onChange={(biller) => setSelectedBiller(biller)}
  filter={{ isActive: true }}
/>
```

### Transaction Status Badge
```tsx
import { TransactionStatusBadge } from "@/components/billers/TransactionStatusBadge";

<TransactionStatusBadge status={transaction.status} />
```

### Transaction Table
```tsx
import { TransactionTable } from "@/components/billers/TransactionTable";

<TransactionTable
  transactions={transactions}
  onRetry={(tx) => handleRetry(tx)}
  onView={(tx) => router.push(`/billers/transactions/${tx.id}`)}
/>
```

---

## 🔐 API Routes (Phase 1+)

### List Configurations
```typescript
// GET /api/billers/configs
const response = await fetch("/api/billers/configs");
const configs = await response.json();
```

### Get Single Configuration
```typescript
// GET /api/billers/configs/[id]
const response = await fetch(`/api/billers/configs/${id}`);
const config = await response.json();
```

### List Transactions
```typescript
// GET /api/billers/transactions?billerType=LWB_POSTPAID&status=COMPLETED
const params = new URLSearchParams({
  billerType: "LWB_POSTPAID",
  status: "COMPLETED",
  page: "1",
  pageSize: "20",
});

const response = await fetch(`/api/billers/transactions?${params}`);
const { transactions, pagination } = await response.json();
```

### Get Transaction Statistics
```typescript
// GET /api/billers/transactions/stats?dateFrom=2025-12-01&dateTo=2025-12-31
const response = await fetch(
  "/api/billers/transactions/stats?dateFrom=2025-12-01&dateTo=2025-12-31"
);
const stats = await response.json();
```

---

## 🧪 Testing Examples

### Test Transaction Creation
```typescript
// __tests__/billers/transactions.test.ts
import { billerTransactionService } from "@/lib/services/billers/transactions";

describe("BillerTransactionService", () => {
  it("should create transaction with unique ID", async () => {
    const tx = await billerTransactionService.createTransaction({
      billerConfigId: "test-config",
      billerType: "LWB_POSTPAID",
      billerName: "Test Biller",
      accountNumber: "123456",
      amount: 5000,
      currency: "MWK",
      transactionType: "POST_TRANSACTION",
    });

    expect(tx.ourTransactionId).toMatch(/^BT-/);
    expect(tx.status).toBe("PENDING");
  });

  it("should calculate statistics correctly", async () => {
    const stats = await billerTransactionService.getStats();
    
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("successRate");
  });
});
```

---

## 🐛 Debugging Tips

### Enable Prisma Query Logging
```typescript
// lib/db.ts
const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});
```

### Check Transaction Status
```typescript
const tx = await prisma.billerTransaction.findUnique({
  where: { id: transactionId },
  include: {
    billerConfig: true,
  },
});

console.log("Status:", tx?.status);
console.log("Error:", tx?.errorMessage);
console.log("Response:", tx?.responsePayload);
```

### Test Service Factory
```typescript
import { BillerServiceFactory } from "@/lib/services/billers/factory";

const config = await prisma.billerConfig.findFirst();
const service = BillerServiceFactory.create(config!);

console.log("Service created:", service.constructor.name);
```

---

## 📝 Common Issues & Solutions

### Issue: Prisma Client out of sync
**Solution:**
```bash
npx prisma generate
```

### Issue: Migration fails
**Solution:** Check DATABASE_URL in .env and ensure DB is running

### Issue: Seed script fails
**Solution:** Ensure migrations are run first
```bash
npx prisma migrate dev
npx ts-node prisma/seed/billers.ts
```

### Issue: TypeScript errors after schema changes
**Solution:** Restart TypeScript server in your IDE

---

## 🔗 Useful Links

- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Billers Implementation Plan](./BILLERS_ADMIN_IMPLEMENTATION_PLAN.md)
- [Phase 1 Summary](./BILLERS_PHASE1_SUMMARY.md)

---

**Last Updated**: 2025-12-13  
**Version**: 1.0
