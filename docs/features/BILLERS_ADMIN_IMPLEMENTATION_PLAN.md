# Billers Implementation Plan - Next.js Admin Panel (Standalone)

**Date**: 2025-12-13  
**Inspired by**: Elixir Backend Billers System  
**Scope**: **Completely Independent Implementation**

---

## 📋 Executive Summary

Implement a **fully independent** billers management system in the Next.js admin panel with its own database tables, business logic, and API integrations. This is a complete, self-contained system that does NOT depend on or interact with the Elixir backend's biller implementation.

### Key Features to Implement
- 🔧 **Configuration Management** - CRUD for biller configurations
- 💳 **Payment Processing** - Direct integration with biller APIs
- 📊 **Transaction Management** - Complete transaction lifecycle
- 🔍 **Account Lookup** - Verify customer accounts with billers
- 📈 **Analytics & Reporting** - Success rates, volumes, trends
- ⚡ **Real-time Status Updates** - SSE for transaction monitoring
- 🔄 **T24 Integration** - Optional core banking integration

**Note:** This is a **standalone system** with its own tables, migrations, and API integrations. No dependency on Elixir backend.

---

## 🏗️ Architecture Overview

### System Architecture
```
┌─────────────────────────────────────────────────────────┐
│              Next.js Admin Panel (Standalone)           │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Admin UI   │  │ API Routes   │  │  Background  │  │
│  │  (React)    │→ │  (Next.js)   │→ │   Workers    │  │
│  └─────────────┘  └──────────────┘  └──────────────┘  │
│         │                 │                  │         │
│         └─────────────────┼──────────────────┘         │
│                           ▼                            │
│                  ┌─────────────────┐                   │
│                  │ PostgreSQL DB   │                   │
│                  │ (Admin Tables)  │                   │
│                  └─────────────────┘                   │
│                           │                            │
└───────────────────────────┼────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌──────────────────┐                  ┌──────────────────┐
│  Biller APIs     │                  │   T24 Banking    │
│  - LWB, BWB      │                  │   (Optional)     │
│  - SRWB, MASM    │                  │                  │
│  - TNM, Airtel   │                  │                  │
│  - Reg General   │                  │                  │
└──────────────────┘                  └──────────────────┘
```

### Data Flow
1. **Admin Panel** has its own PostgreSQL tables for billers
2. **Direct API Integration** - Admin calls biller APIs directly (LWB, MASM, etc.)
3. **No Elixir Dependency** - Completely self-contained
4. **Own Migrations** - Independent database schema evolution
5. **Background Jobs** - Optional Oban-like job processing for async operations

---

## 📊 Database Schema (Prisma)

### 1. BillerConfig Model

```prisma
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

model BillerConfig {
  id                    String       @id @default(cuid())
  
  // Identity
  billerType            BillerType   @unique
  billerName            String
  displayName           String
  description           String?
  isActive              Boolean      @default(true)
  
  // API Configuration
  baseUrl               String
  endpoints             Json         // { accountDetails, payment, invoice, etc. }
  authentication        Json?        // Encrypted credentials
  
  // Transaction Settings
  defaultCurrency       String       @default("MWK")
  supportedCurrencies   String[]     @default(["MWK"])
  timeoutMs             Int          @default(30000)
  retryAttempts         Int          @default(3)
  
  // Features & Validation
  features              Json         // { supportsInvoice, supportsBalanceCheck, etc. }
  validationRules       Json         // { accountNumberFormat, minAmount, maxAmount }
  
  // Relationships
  transactions          BillerTransaction[]
  
  // Audit
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt
  createdBy             String?
  updatedBy             String?
  
  @@index([billerType])
  @@index([isActive])
}

model BillerTransaction {
  id                    String       @id @default(cuid())
  
  // Biller Reference
  billerConfigId        String?
  billerConfig          BillerConfig? @relation(fields: [billerConfigId], references: [id])
  billerType            BillerType
  billerName            String
  
  // Transaction Identity
  ourTransactionId      String       @unique
  externalTransactionId String?      // Biller's reference
  
  // Transaction Type
  transactionType       BillerTransactionType
  
  // Account Information
  accountNumber         String
  accountType           String?
  customerAccountName   String?
  
  // T24 Integration
  creditAccount         String?      // Biller's T24 account
  creditAccountType     String?
  debitAccount          String?      // Customer's T24 account
  debitAccountType      String?
  
  // Amount
  amount                Decimal      @db.Decimal(18, 2)
  currency              String       @default("MWK")
  
  // Status & Processing
  status                BillerTransactionStatus
  
  // API Details
  apiEndpoint           String?
  requestPayload        Json?
  responsePayload       Json?
  errorMessage          String?
  errorCode             String?
  
  // Special Fields
  bundleId              String?      // TNM bundles
  invoiceNumber         String?      // Invoice-based payments
  meterNumber           String?      // MASM
  
  // Metadata
  metadata              Json?        // Additional context
  
  // Timestamps
  processedAt           DateTime?
  completedAt           DateTime?
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt
  
  // Audit
  initiatedBy           String?      // User/system
  
  @@index([billerType])
  @@index([status])
  @@index([ourTransactionId])
  @@index([accountNumber])
  @@index([createdAt])
  @@index([billerConfigId])
}

enum BillerTransactionType {
  ACCOUNT_DETAILS
  POST_TRANSACTION
  GET_INVOICE
  CONFIRM_INVOICE
  BUNDLE_DETAILS
  CONFIRM_BUNDLE
}

enum BillerTransactionStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
  REVERSED
}
```

---

## 🎨 UI Structure

### Page Routes (Full CRUD)

```
/mobile-banking/billers/
├── /                           # Dashboard (overview, quick stats, recent transactions)
├── /configurations/            # Biller configuration management
│   ├── /                       # List all configs (DataTable)
│   ├── /new                    # Create new biller config
│   └── /[id]/edit              # Edit existing config
├── /transactions/              # Transaction management
│   ├── /                       # List all transactions with filters
│   ├── /[id]                   # View transaction details
│   └── /retry/[id]             # Retry failed transaction
├── /payment/                   # Payment processing
│   ├── /                       # Multi-step payment form
│   └── /invoice                # Invoice-based payment flow
├── /lookup/                    # Account lookup & verification
│   └── /                       # Lookup tool for all billers
└── /analytics/                 # Reports & analytics
    └── /                       # Analytics dashboard with charts
```

### Component Structure

```typescript
/components/billers/
├── BillerDashboard.tsx             // Overview cards with stats
├── BillerConfigForm.tsx            // Create/edit config form
├── BillerConfigCard.tsx            // Config display card
├── BillerConfigList.tsx            // List of all configs
├── TransactionTable.tsx            // Transaction list with filters
├── TransactionDetails.tsx          // Single transaction view
├── TransactionFilters.tsx          // Date range, status, biller filters
├── TransactionStatusBadge.tsx      // Status indicator with colors
├── PaymentForm.tsx                 // Multi-step payment form
├── PaymentConfirmation.tsx         // Payment review & confirm
├── AccountLookup.tsx               // Account verification UI
├── AccountDetailsCard.tsx          // Display account info
├── InvoicePaymentFlow.tsx          // Invoice-based payment (Reg General, SRWB)
├── BundleSelector.tsx              // TNM bundle selection
├── BillerSelector.tsx              // Dropdown for biller selection
├── BillerAnalytics.tsx             // Charts & stats (Recharts)
├── BillerStatsCard.tsx             // Individual stat card
├── ExportButton.tsx                // CSV export functionality
└── RetryTransactionDialog.tsx      // Retry failed transaction modal
```

---

## 🔌 API Routes (Next.js) - Full CRUD

### Configuration Management

```typescript
// /app/api/billers/configs/route.ts
GET    /api/billers/configs                 // List all configs
POST   /api/billers/configs                 // Create new config

// /app/api/billers/configs/[id]/route.ts
GET    /api/billers/configs/[id]            // Get single config
PATCH  /api/billers/configs/[id]            // Update config
DELETE /api/billers/configs/[id]            // Deactivate config

// /app/api/billers/configs/[id]/test/route.ts
POST   /api/billers/configs/[id]/test       // Test biller connection
```

### Transaction Operations

```typescript
// /app/api/billers/transactions/route.ts
GET    /api/billers/transactions             // List transactions with filters
POST   /api/billers/transactions             // Create new transaction

// /app/api/billers/transactions/[id]/route.ts
GET    /api/billers/transactions/[id]        // Get transaction details

// /app/api/billers/transactions/[id]/retry/route.ts
POST   /api/billers/transactions/[id]/retry  // Retry failed transaction

// /app/api/billers/transactions/stats/route.ts
GET    /api/billers/transactions/stats       // Analytics data

// /app/api/billers/transactions/export/route.ts
GET    /api/billers/transactions/export      // Export to CSV
```

### Payment Processing (Direct Integration)

```typescript
// /app/api/billers/account-lookup/route.ts
POST   /api/billers/account-lookup           // Lookup account with biller
// Calls LWB/MASM/etc APIs directly

// /app/api/billers/payment/route.ts
POST   /api/billers/payment                  // Process payment
// Calls biller API, creates transaction record

// /app/api/billers/invoice/route.ts
GET    /api/billers/invoice                  // Get invoice (Reg General, SRWB)
POST   /api/billers/invoice/confirm          // Confirm & pay invoice

// /app/api/billers/bundles/route.ts
GET    /api/billers/bundles                  // Get TNM bundle list
POST   /api/billers/bundles/purchase         // Purchase bundle
```

### Real-time Updates

```typescript
// /app/api/billers/stream/route.ts
GET    /api/billers/stream                   // SSE for real-time transaction updates
```

### T24 Integration (Optional)

```typescript
// /app/api/billers/t24/balance/route.ts
GET    /api/billers/t24/balance              // Get account balance from T24

// /app/api/billers/t24/transfer/route.ts
POST   /api/billers/t24/transfer             // Initiate T24 transfer
```

---

## 🚀 Implementation Phases

### Phase 1: Database Schema & Core Infrastructure (Week 1)

**Tasks:**
1. ✅ Add Prisma schema for billers (standalone tables)
2. ✅ Create and run migrations
3. ✅ Seed initial biller configurations (8 billers)
4. ✅ Setup base API routes structure
5. ✅ Create service layer for biller integrations

**Files:**
```
prisma/schema.prisma              # Add biller tables
prisma/migrations/                # New migrations
prisma/seed/billers.ts            # Seed data for 8 billers
lib/services/billers/             # Service layer
├── client.ts                     # HTTP client for biller APIs
├── lwb.ts                        # LWB integration
├── masm.ts                       # MASM integration
├── srwb.ts                       # SRWB integration
├── tnm.ts                        # TNM integration
└── register-general.ts           # Register General integration
app/api/billers/                  # API routes
```

**Deliverable:** Database ready, service layer foundation

---

### Phase 2: Configuration Management UI (Week 2)

**Tasks:**
1. ✅ Build BillerConfig CRUD operations
2. ✅ Create configuration list page
3. ✅ Create configuration form (create/edit)
4. ✅ Implement validation & error handling
5. ✅ Add connection testing
6. ✅ Build activation/deactivation toggle

**Components:**
```typescript
// /app/mobile-banking/billers/configurations/page.tsx
export default function BillerConfigurationsPage() {
  // DataTable showing all biller configs
  // Columns: Name, Type, Status, Base URL, Actions
  // Actions: View, Edit, Test Connection, Activate/Deactivate
  // Add New button
}

// /app/mobile-banking/billers/configurations/new/page.tsx
export default function NewBillerConfigPage() {
  // BillerConfigForm component
  // Fields: name, type, base URL, endpoints, auth, timeouts, etc.
  // JSON editors for complex fields
  // Save & Test buttons
}

// /app/mobile-banking/billers/configurations/[id]/edit/page.tsx
export default function EditBillerConfigPage({ params }) {
  // Same as new, but pre-populated with existing data
  // Update & Test buttons
}

// /components/billers/BillerConfigForm.tsx
export function BillerConfigForm({ config, onSave }) {
  // Form with all config fields
  // JSON editors for endpoints, features, validation
  // Real-time validation
  // Test connection button
}
```

**Deliverable:** Full config management UI

---

### Phase 3: Account Lookup & Verification (Week 3)

**Tasks:**
1. ✅ Implement biller API client services
2. ✅ Build account lookup endpoint
3. ✅ Create lookup UI
4. ✅ Add result display with account details
5. ✅ Handle errors gracefully
6. ✅ Log all lookup attempts

**Components:**
```typescript
// /app/mobile-banking/billers/lookup/page.tsx
export default function AccountLookupPage() {
  // Biller selector dropdown
  // Account number input
  // Account type input (for MASM)
  // Lookup button
  // Results display card
  // Error handling
}

// /components/billers/AccountLookup.tsx
export function AccountLookup() {
  // Form component
  // Calls API on submit
  // Shows loading state
  // Displays results
}

// /components/billers/AccountDetailsCard.tsx
export function AccountDetailsCard({ details }) {
  // Display account information
  // Customer name, balance, status
  // Formatted nicely
}
```

**Service Implementation:**
```typescript
// lib/services/billers/lwb.ts
export class LWBService {
  async lookupAccount(accountNumber: string) {
    // Build XML SOAP request
    // Call LWB API
    // Parse XML response
    // Return formatted data
  }
}
```

**Deliverable:** Account lookup functionality

---

### Phase 4: Payment Processing (Week 4-5)

**Tasks:**
1. ✅ Build payment processing API routes
2. ✅ Create multi-step payment form
3. ✅ Implement biller-specific payment logic
4. ✅ Add payment confirmation step
5. ✅ Handle invoice-based payments (Reg General, SRWB)
6. ✅ Implement TNM bundle purchase
7. ✅ Transaction status tracking
8. ✅ Optional: T24 integration for transfers

**Components:**
```typescript
// /app/mobile-banking/billers/payment/page.tsx
export default function PaymentPage() {
  // Multi-step form
  // Step 1: Select biller & lookup account
  // Step 2: Enter amount (or select bundle)
  // Step 3: T24 account details (optional)
  // Step 4: Review & confirm
  // Step 5: Processing & result
}

// /components/billers/PaymentForm.tsx
export function PaymentForm({ onComplete }) {
  // Step-by-step form wizard
  // Form validation
  // API calls on submit
  // Loading states
}

// /components/billers/PaymentConfirmation.tsx
export function PaymentConfirmation({ paymentData, onConfirm }) {
  // Review payment details
  // Show all info before processing
  // Confirm button
}

// /components/billers/InvoicePaymentFlow.tsx
export function InvoicePaymentFlow() {
  // Special flow for Register General & SRWB Prepaid
  // Step 1: Get invoice
  // Step 2: Review invoice details
  // Step 3: Confirm & pay
}

// /components/billers/BundleSelector.tsx
export function BundleSelector({ onSelect }) {
  // Grid of TNM bundles
  // Show bundle details (data amount, validity, price)
  // Selection UI
}
```

**Service Implementation:**
```typescript
// lib/services/billers/client.ts
export class BillersService {
  async processPayment(params: PaymentParams) {
    // 1. Validate input
    // 2. Create transaction record (status: PENDING)
    // 3. Call biller API
    // 4. Update transaction (status: COMPLETED or FAILED)
    // 5. Optional: Initiate T24 transfer
    // 6. Return result
  }

  async getInvoice(billerType: string, accountNumber: string) {
    // For Register General & SRWB Prepaid
    // Get invoice details from biller
  }

  async confirmInvoice(params: InvoiceConfirmParams) {
    // Confirm and pay invoice
  }
}
```

**Deliverable:** Complete payment processing system

---

### Phase 5: Transaction Management (Week 6)

**Tasks:**
1. ✅ Build transaction list page with filters
2. ✅ Create transaction details view
3. ✅ Implement retry functionality for failed transactions
4. ✅ Add transaction status updates
5. ✅ Create export to CSV
6. ✅ Implement real-time updates (SSE)

**Components:**
```typescript
// /app/mobile-banking/billers/transactions/page.tsx
export default function BillerTransactionsPage() {
  // DataTable with pagination
  // Filters: biller type, status, date range
  // Search: account number, transaction ID
  // Export button
  // Real-time updates via SSE
  // Columns: ID, Biller, Account, Amount, Status, Date, Actions
}

// /app/mobile-banking/billers/transactions/[id]/page.tsx
export default function TransactionDetailsPage({ params }) {
  // Full transaction details
  // Timeline view of status changes
  // Request payload (formatted JSON)
  // Response payload (formatted JSON)
  // Error messages if failed
  // Retry button for failed transactions
}

// /app/mobile-banking/billers/transactions/retry/[id]/page.tsx
export default function RetryTransactionPage({ params }) {
  // Retry failed transaction
  // Shows original transaction details
  // Confirm retry button
}

// /components/billers/RetryTransactionDialog.tsx
export function RetryTransactionDialog({ transaction, onRetry }) {
  // Modal for retrying failed transaction
  // Show transaction details
  // Confirm button
}
```

**Deliverable:** Transaction management system

---

### Phase 6: Analytics & Dashboard (Week 7)

**Tasks:**
1. ✅ Build overview dashboard
2. ✅ Create analytics page with charts
3. ✅ Implement success rate calculations
4. ✅ Add volume and revenue trends
5. ✅ Build biller comparison views
6. ✅ Create daily/weekly/monthly reports
7. ✅ Performance metrics

**Components:**
```typescript
// /app/mobile-banking/billers/page.tsx
export default function BillersDashboardPage() {
  // Overview cards:
  //   - Total transactions (today/week/month)
  //   - Success rate %
  //   - Total revenue (MWK)
  //   - Active billers count
  // Recent transactions table (last 10)
  // Quick stats by biller (grid)
  // Quick action buttons (New Payment, Lookup)
}

// /app/mobile-banking/billers/analytics/page.tsx
export default function BillersAnalyticsPage() {
  // Transaction volume chart (line chart)
  // Success rate by biller (pie chart)
  // Revenue trends over time (bar chart)
  // Performance metrics table
  // Date range selector (7d, 30d, 90d, custom)
  // Export reports button
}

// /components/billers/BillerAnalytics.tsx
export function BillerAnalytics() {
  // Recharts integration
  // Data aggregation from transactions
  // Visual comparisons
  // Interactive charts
}

// /components/billers/BillerStatsCard.tsx
export function BillerStatsCard({ title, value, change, icon }) {
  // Stat card component
  // Shows metric with change indicator
  // Icon and color coding
}
```

**Deliverable:** Analytics & reporting dashboard

---

### Phase 7: Background Jobs & Polish (Week 8)

**Tasks:**
1. ✅ Implement background job processing (optional)
2. ✅ Add transaction status polling
3. ✅ Create notification system
4. ✅ Add loading states and skeletons
5. ✅ Improve error handling & user feedback
6. ✅ Add tooltips and help text
7. ✅ Performance optimization
8. ✅ Testing & bug fixes

**Enhancements:**
```typescript
// Optional: Background job processing
// lib/jobs/billers/transaction-processor.ts
export class TransactionProcessor {
  // Process pending transactions
  // Poll biller APIs for status updates
  // Update transaction records
  // Send notifications on completion
}

// Optional: Notifications
// lib/notifications/biller-notifications.ts
export async function notifyTransactionComplete(transaction: BillerTransaction) {
  // Send email/SMS notification
  // Log notification attempt
}
```

**Deliverable:** Polished, production-ready system

---

## 🔒 Security Considerations

### Authentication & Authorization
```typescript
// Protect all biller routes
import { requireAuth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await requireAuth(request);
  
  // Check permissions
  if (!session.user.permissions.includes("billers:read")) {
    return new Response("Forbidden", { status: 403 });
  }
  
  // ... rest of handler
}
```

### Sensitive Data Handling
```typescript
// Encrypt biller credentials
import { encrypt, decrypt } from "@/lib/encryption";

// When saving config
const encryptedAuth = encrypt(JSON.stringify(authData));

// When retrieving
const authData = JSON.parse(decrypt(config.authentication));
```

### Audit Logging
```typescript
// Log all config changes and transactions
import { auditLog } from "@/lib/audit";

await auditLog({
  action: "BILLER_CONFIG_UPDATE",
  resource: "BillerConfig",
  resourceId: config.id,
  userId: session.user.id,
  changes: diff(oldConfig, newConfig),
});
```

---

## 🔄 Service Layer Architecture

### Biller Integration Services

Each biller has its own service class that handles API communication:

```typescript
// lib/services/billers/base.ts
export abstract class BaseBillerService {
  protected config: BillerConfig;
  
  constructor(config: BillerConfig) {
    this.config = config;
  }
  
  abstract lookupAccount(accountNumber: string, accountType?: string): Promise<AccountDetails>;
  abstract processPayment(params: PaymentParams): Promise<PaymentResult>;
  
  protected async makeRequest(endpoint: string, body: any) {
    // Common HTTP request logic
    // Timeout handling
    // Retry logic
    // Error handling
  }
}

// lib/services/billers/lwb.ts
export class LWBService extends BaseBillerService {
  async lookupAccount(accountNumber: string) {
    // Build XML SOAP request
    const xmlRequest = this.buildAccountDetailsXML(accountNumber);
    
    // Call LWB API
    const response = await this.makeRequest(
      this.config.endpoints.accountDetails,
      xmlRequest
    );
    
    // Parse XML response
    return this.parseAccountDetailsResponse(response);
  }
  
  async processPayment(params: PaymentParams) {
    // Build XML payment request
    const xmlRequest = this.buildPaymentXML(params);
    
    // Call LWB API
    const response = await this.makeRequest(
      this.config.endpoints.payment,
      xmlRequest
    );
    
    // Parse response
    return this.parsePaymentResponse(response);
  }
  
  private buildAccountDetailsXML(accountNumber: string): string {
    // XML SOAP envelope builder
    return `<?xml version="1.0"?>
      <soap:Envelope>
        <soap:Body>
          <GetAccountDetails>
            <AccountNumber>${accountNumber}</AccountNumber>
          </GetAccountDetails>
        </soap:Body>
      </soap:Envelope>`;
  }
  
  private parseAccountDetailsResponse(xml: string): AccountDetails {
    // XML parser
    // Extract account details
    return {
      accountNumber,
      customerName,
      balance,
      status,
    };
  }
}

// lib/services/billers/masm.ts
export class MASMService extends BaseBillerService {
  async lookupAccount(accountNumber: string, accountType: string = "M") {
    // MASM-specific implementation
    // Uses meter number (M prefix)
  }
  
  async processPayment(params: PaymentParams) {
    // MASM payment processing
  }
}

// lib/services/billers/tnm.ts
export class TNMService extends BaseBillerService {
  async getBundles(): Promise<Bundle[]> {
    // Get available TNM bundles
  }
  
  async purchaseBundle(params: BundlePurchaseParams): Promise<PurchaseResult> {
    // Purchase specific bundle
  }
}

// lib/services/billers/register-general.ts
export class RegisterGeneralService extends BaseBillerService {
  async getInvoice(accountNumber: string): Promise<Invoice> {
    // Get invoice details
  }
  
  async confirmInvoice(params: InvoiceConfirmParams): Promise<PaymentResult> {
    // Confirm and pay invoice
  }
}

// lib/services/billers/factory.ts
export class BillerServiceFactory {
  static create(config: BillerConfig): BaseBillerService {
    switch (config.billerType) {
      case "LWB_POSTPAID":
        return new LWBService(config);
      case "BWB_POSTPAID":
        return new BWBService(config);
      case "SRWB_POSTPAID":
      case "SRWB_PREPAID":
        return new SRWBService(config);
      case "MASM":
        return new MASMService(config);
      case "TNM_BUNDLES":
        return new TNMService(config);
      case "REGISTER_GENERAL":
        return new RegisterGeneralService(config);
      case "AIRTEL_VALIDATION":
        return new AirtelService(config);
      default:
        throw new Error(`Unknown biller type: ${config.billerType}`);
    }
  }
}
```

### Transaction Management Service

```typescript
// lib/services/billers/transactions.ts
export class BillerTransactionService {
  async createTransaction(data: CreateTransactionData): Promise<BillerTransaction> {
    // Create transaction record with status PENDING
    return await prisma.billerTransaction.create({
      data: {
        ...data,
        status: "PENDING",
        ourTransactionId: generateTransactionId(),
      },
    });
  }
  
  async updateTransaction(
    id: string,
    updates: Partial<BillerTransaction>
  ): Promise<BillerTransaction> {
    // Update transaction status and details
    return await prisma.billerTransaction.update({
      where: { id },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });
  }
  
  async completeTransaction(
    id: string,
    response: any
  ): Promise<BillerTransaction> {
    // Mark transaction as completed
    return await this.updateTransaction(id, {
      status: "COMPLETED",
      completedAt: new Date(),
      responsePayload: response,
    });
  }
  
  async failTransaction(
    id: string,
    error: Error
  ): Promise<BillerTransaction> {
    // Mark transaction as failed
    return await this.updateTransaction(id, {
      status: "FAILED",
      errorMessage: error.message,
      errorCode: error.code,
    });
  }
  
  async retryTransaction(id: string): Promise<BillerTransaction> {
    // Retry failed transaction
    const transaction = await prisma.billerTransaction.findUnique({
      where: { id },
      include: { billerConfig: true },
    });
    
    if (!transaction || transaction.status !== "FAILED") {
      throw new Error("Cannot retry transaction");
    }
    
    // Create biller service
    const service = BillerServiceFactory.create(transaction.billerConfig);
    
    // Retry based on transaction type
    if (transaction.transactionType === "POST_TRANSACTION") {
      const result = await service.processPayment({
        accountNumber: transaction.accountNumber,
        amount: transaction.amount,
        // ... other params
      });
      
      if (result.success) {
        return await this.completeTransaction(id, result);
      } else {
        return await this.failTransaction(id, new Error(result.error));
      }
    }
    
    throw new Error("Unsupported transaction type for retry");
  }
}

export const billerTransactionService = new BillerTransactionService();
```

### API Route Example

```typescript
// app/api/billers/payment/route.ts
import { billerTransactionService } from "@/lib/services/billers/transactions";
import { BillerServiceFactory } from "@/lib/services/billers/factory";
import { requireAuth } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await requireAuth(request);
  
  const body = await request.json();
  const validated = paymentSchema.parse(body);
  
  // Get biller config
  const config = await prisma.billerConfig.findUnique({
    where: { billerType: validated.billerType },
  });
  
  if (!config || !config.isActive) {
    return Response.json(
      { error: "Biller not found or inactive" },
      { status: 404 }
    );
  }
  
  // Create transaction record (PENDING)
  const transaction = await billerTransactionService.createTransaction({
    billerConfigId: config.id,
    billerType: config.billerType,
    billerName: config.billerName,
    accountNumber: validated.accountNumber,
    amount: validated.amount,
    currency: validated.currency || config.defaultCurrency,
    transactionType: "POST_TRANSACTION",
    initiatedBy: session.user.id,
  });
  
  try {
    // Create biller service
    const service = BillerServiceFactory.create(config);
    
    // Process payment
    const result = await service.processPayment({
      accountNumber: validated.accountNumber,
      amount: validated.amount,
      currency: validated.currency,
    });
    
    if (result.success) {
      // Update transaction as COMPLETED
      const completed = await billerTransactionService.completeTransaction(
        transaction.id,
        result
      );
      
      // Optional: Initiate T24 transfer
      if (validated.creditAccount && validated.debitAccount) {
        await initiateT24Transfer({
          from: validated.debitAccount,
          to: validated.creditAccount,
          amount: validated.amount,
          reference: transaction.ourTransactionId,
        });
      }
      
      return Response.json({
        success: true,
        transaction: completed,
        result,
      });
    } else {
      // Update transaction as FAILED
      const failed = await billerTransactionService.failTransaction(
        transaction.id,
        new Error(result.error)
      );
      
      return Response.json({
        success: false,
        transaction: failed,
        error: result.error,
      }, { status: 400 });
    }
  } catch (error) {
    // Update transaction as FAILED
    await billerTransactionService.failTransaction(transaction.id, error);
    
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
```

---

## 📊 Real-time Updates Implementation

### Server-Sent Events Pattern
```typescript
// app/api/billers/stream/route.ts
export async function GET(request: Request) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Subscribe to Elixir backend SSE or poll Redis
      const interval = setInterval(async () => {
        const updates = await getRecentTransactionUpdates();
        
        updates.forEach(update => {
          const data = `data: ${JSON.stringify(update)}\n\n`;
          controller.enqueue(encoder.encode(data));
        });
      }, 2000); // Poll every 2 seconds
      
      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });
  
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

### Client-side Hook
```typescript
// hooks/use-biller-updates.ts
export function useBillerUpdates() {
  const [transactions, setTransactions] = useState([]);
  
  useEffect(() => {
    const eventSource = new EventSource("/api/billers/stream");
    
    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data);
      
      setTransactions(prev => {
        const existing = prev.find(t => t.id === update.id);
        if (existing) {
          return prev.map(t => t.id === update.id ? update : t);
        }
        return [update, ...prev];
      });
    };
    
    return () => eventSource.close();
  }, []);
  
  return transactions;
}
```

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
// __tests__/billers/client.test.ts
describe("BillersServiceClient", () => {
  it("should lookup account successfully", async () => {
    const result = await billersClient.lookupAccount({
      billerType: "lwb_postpaid",
      accountNumber: "123456",
    });
    
    expect(result.status).toBe(0);
    expect(result.data).toHaveProperty("customer_name");
  });
});
```

### Integration Tests
```typescript
// __tests__/api/billers/payment.test.ts
describe("POST /api/billers/payment", () => {
  it("should process payment successfully", async () => {
    const response = await fetch("/api/billers/payment", {
      method: "POST",
      body: JSON.stringify({
        billerType: "lwb_postpaid",
        accountNumber: "123456",
        amount: "5000",
        creditAccount: "A123456",
        debitAccount: "A789012",
      }),
    });
    
    expect(response.status).toBe(200);
  });
});
```

---

## 📈 Success Metrics

### Key Performance Indicators
- ✅ Transaction success rate > 95%
- ✅ Average response time < 3s
- ✅ Configuration change success rate 100%
- ✅ Zero data loss on failed transactions
- ✅ Real-time update latency < 5s

### Monitoring
```typescript
// Track metrics
import { metrics } from "@/lib/monitoring";

metrics.increment("billers.transaction.attempted", {
  biller: billerType,
});

metrics.timing("billers.transaction.duration", duration, {
  biller: billerType,
  status: status,
});
```

---

## 🎯 Quick Start Commands

```bash
# 1. Add Prisma schema
# Copy schema above to prisma/schema.prisma

# 2. Create migration
npx prisma migrate dev --name add_billers

# 3. Generate Prisma client
npx prisma generate

# 4. Seed biller configs
npx prisma db seed

# 5. Start dev server
npm run dev

# 6. Navigate to
# http://localhost:3000/mobile-banking/billers
```

---

## 📚 Reference Architecture Patterns

### Similar Existing Patterns in Admin

1. **Registration Requests** (`/mobile-banking/registration-requests`)
   - Status tracking
   - DataTable with filters
   - Real-time updates
   - Detailed view

2. **Checkbook Requests** (`/mobile-banking/checkbook-requests`)
   - Request processing
   - Status management
   - Approval workflow

3. **Services Monitor** (`/(authenticated)/services`)
   - Real-time SSE updates
   - Service status cards
   - Performance metrics

4. **Transaction View** (`/mobile-banking/accounts/[accountNumber]/transactions`)
   - Transaction listing
   - Filtering & search
   - Export functionality

**Use these as templates for billers implementation!**

---

## 🔧 Environment Variables

```env
# Add to .env.local

# Database (Admin's own database)
DATABASE_URL=postgresql://user:password@localhost:5432/admin_panel_db

# Optional: T24 Integration
T24_API_URL=https://t24.bank.com/api
T24_API_KEY=your_t24_api_key

# Biller API Credentials (can be stored in database too)
# Or use database BillerConfig.authentication field (encrypted)

# Optional: Background Jobs
ENABLE_BACKGROUND_JOBS=true
```

**Important:** This is a **standalone system** with its own database. No shared database with Elixir.

---

## 🚦 Next Steps

### Immediate Actions
1. ✅ Review and approve this plan
2. ✅ Add Prisma schema (standalone tables)
3. ✅ Create and run migrations
4. ✅ Seed biller configurations
5. ✅ Create base folder structure
6. ✅ Begin Phase 1 implementation

### Questions to Resolve
- ❓ Should we integrate with T24 for account transfers?
- ❓ Do we need background job processing or real-time only?
- ❓ What authentication is required for biller APIs?
- ❓ Should API credentials be stored in database or env vars?
- ❓ Do we need audit logging for all operations?
- ❓ Should we support transaction cancellation/reversal?
- ❓ What notification channels (email, SMS, push)?

---

## 📝 Notes & Considerations

### Special Biller Requirements

**Register General & SRWB Prepaid:**
- Two-step flow: Get invoice → Confirm invoice
- UI must support invoice review step

**TNM Bundles:**
- Bundle selection interface required
- Display bundle details (data, validity, price)

**MASM:**
- Account type field required (typically "M" for meter)
- Meter number tracking

**Airtel Validation:**
- Simple validation only (no payments)
- Used for account verification

### Performance Optimization
- Cache biller configs (rarely change)
- Paginate transaction lists
- Lazy load transaction details
- Use React Query for data fetching
- Implement optimistic updates

### Error Handling
- Network failures: Retry with exponential backoff
- Validation errors: Show clear user feedback
- Timeout errors: Show retry option
- T24 errors: Log and display user-friendly message

---

**Status**: 📋 Planning Complete - Ready for Implementation  
**Est. Total Time**: 7-8 weeks  
**Priority**: High  
**Dependencies**: 
- ✅ Next.js admin panel setup (existing)
- ✅ Prisma ORM (existing)
- ⚠️ Biller API documentation (LWB, MASM, SRWB, TNM, etc.)
- ⚠️ Biller API credentials/access
- ❓ T24 API access (optional)

**Scope**: **FULL STANDALONE SYSTEM** - Own database, own migrations, own API integrations, no Elixir dependency
