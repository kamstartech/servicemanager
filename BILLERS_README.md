# 💳 Billers System

Standalone billers payment system for the Next.js admin panel. Supports 8 different billers for water, electricity, government services, and mobile payments.

## 📋 Overview

- **Status**: Phase 1 Complete ✅
- **Version**: 1.0.0
- **Dependencies**: Independent (no Elixir backend dependency)
- **Database**: Own PostgreSQL tables and migrations

## 🎯 Supported Billers

| Biller | Type | Status | Features |
|--------|------|--------|----------|
| Lilongwe Water Board (LWB) | Water | 🟡 Schema Ready | Account lookup, payments |
| Blantyre Water Board (BWB) | Water | 🟡 Schema Ready | Account lookup, payments |
| SRWB Postpaid | Water | 🟡 Schema Ready | Account lookup, payments |
| SRWB Prepaid | Water | 🟡 Schema Ready | Invoice-based payments |
| MASM | Electricity | 🟡 Schema Ready | Meter payments, tokens |
| Register General | Government | 🟡 Schema Ready | Invoice-based, taxes |
| TNM | Mobile | 🟡 Schema Ready | Bundle purchases |
| Airtel | Mobile | 🟡 Schema Ready | Number validation |

**Legend:**
- ✅ Fully Implemented
- 🟡 Schema Ready (Phase 1)
- 🔴 Not Started

## 📚 Documentation

- **[Implementation Plan](./BILLERS_ADMIN_IMPLEMENTATION_PLAN.md)** - Complete 7-phase roadmap
- **[Phase 1 Summary](./BILLERS_PHASE1_SUMMARY.md)** - What's been completed
- **[Quick Start Guide](./BILLERS_QUICK_START.md)** - Code examples and commands

## 🚀 Quick Start

### 1. Generate Prisma Client
```bash
npx prisma generate
```

### 2. Run Migration (when DB is available)
```bash
npx prisma migrate dev --name add_billers_system
```

### 3. Seed Billers
```bash
npx ts-node prisma/seed/billers.ts
```

### 4. Test Service Layer
```typescript
import { billerTransactionService } from "@/lib/services/billers/transactions";

const tx = await billerTransactionService.createTransaction({
  billerConfigId: "config-id",
  billerType: "LWB_POSTPAID",
  billerName: "Lilongwe Water Board",
  accountNumber: "123456",
  amount: 5000,
  currency: "MWK",
  transactionType: "POST_TRANSACTION",
});
```

## 📁 Project Structure

```
admin/
├── prisma/
│   ├── schema.prisma                    # Database schema with billers
│   └── seed/
│       └── billers.ts                   # Seed data for 8 billers
├── lib/
│   └── services/
│       └── billers/
│           ├── base.ts                  # Base service class
│           ├── factory.ts               # Service factory
│           └── transactions.ts          # Transaction management
├── app/
│   ├── api/
│   │   └── billers/                     # API routes (Phase 2+)
│   └── mobile-banking/
│       └── billers/                     # UI pages (Phase 2+)
└── components/
    └── billers/                         # React components (Phase 2+)
```

## 🔄 Implementation Phases

| Phase | Description | Status | ETA |
|-------|-------------|--------|-----|
| **Phase 1** | Database Schema & Core Infrastructure | ✅ Complete | Week 1 |
| **Phase 2** | Configuration Management UI | 📋 Next | Week 2 |
| **Phase 3** | Account Lookup & Verification | 📋 Planned | Week 3 |
| **Phase 4** | Payment Processing | 📋 Planned | Week 4-5 |
| **Phase 5** | Transaction Management | 📋 Planned | Week 6 |
| **Phase 6** | Analytics & Dashboard | 📋 Planned | Week 7 |
| **Phase 7** | Background Jobs & Polish | 📋 Planned | Week 8 |

## 🛠️ Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Language**: TypeScript
- **UI**: React + Tailwind CSS
- **API**: Next.js API Routes
- **State**: React Hooks + Server Components
- **Real-time**: Server-Sent Events (SSE)

## 🔐 Security Features

- ✅ Encrypted biller credentials
- ✅ API authentication & authorization
- ✅ Input validation
- ✅ Audit logging
- ✅ Rate limiting (planned)
- ✅ Transaction tracking

## 📊 Key Features

### Configuration Management
- ✅ CRUD operations for biller configs
- ✅ Enable/disable billers
- ✅ Test connectivity
- ✅ Flexible JSON configuration

### Transaction Processing
- ✅ Unique transaction IDs
- ✅ Status tracking (pending, completed, failed)
- ✅ Request/response logging
- ✅ Error handling & retry logic
- ✅ T24 integration (optional)

### Analytics
- ✅ Transaction volume tracking
- ✅ Success rate calculation
- ✅ Revenue reporting
- ✅ Biller comparison

## 🔌 API Endpoints (Phase 2+)

### Configuration
- `GET /api/billers/configs` - List all configs
- `POST /api/billers/configs` - Create config
- `GET /api/billers/configs/[id]` - Get config
- `PATCH /api/billers/configs/[id]` - Update config
- `POST /api/billers/configs/[id]/test` - Test connection

### Transactions
- `GET /api/billers/transactions` - List transactions
- `GET /api/billers/transactions/[id]` - Get transaction
- `POST /api/billers/transactions/[id]/retry` - Retry failed
- `GET /api/billers/transactions/stats` - Get statistics
- `GET /api/billers/transactions/export` - Export CSV

### Payment Processing
- `POST /api/billers/account-lookup` - Lookup account
- `POST /api/billers/payment` - Process payment
- `GET /api/billers/invoice` - Get invoice
- `POST /api/billers/invoice/confirm` - Confirm invoice

## 🎨 UI Pages (Phase 2+)

- `/mobile-banking/billers` - Dashboard
- `/mobile-banking/billers/configurations` - Config management
- `/mobile-banking/billers/transactions` - Transaction history
- `/mobile-banking/billers/payment` - Payment form
- `/mobile-banking/billers/lookup` - Account lookup
- `/mobile-banking/billers/analytics` - Reports & charts

## 📝 Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/admin_panel_db

# Optional: T24 Integration
T24_API_URL=https://t24.bank.com/api
T24_API_KEY=your_t24_api_key

# Optional: Background Jobs
ENABLE_BACKGROUND_JOBS=false
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run specific test
npm test -- billers

# Coverage
npm run test:coverage
```

## 🤝 Contributing

When implementing new biller services:

1. Extend `BaseBillerService` class
2. Implement `lookupAccount()` and `processPayment()`
3. Add to `BillerServiceFactory`
4. Update seed data if needed
5. Add tests
6. Update documentation

## 📞 Support

- **Issues**: GitHub Issues
- **Documentation**: See `/docs` folder
- **Questions**: Contact dev team

## 🗺️ Roadmap

### Short Term (Weeks 1-4)
- ✅ Phase 1: Database & service layer
- 📋 Phase 2: Configuration UI
- 📋 Phase 3: Account lookup
- 📋 Phase 4: Payment processing

### Medium Term (Weeks 5-8)
- 📋 Phase 5: Transaction management
- 📋 Phase 6: Analytics dashboard
- 📋 Phase 7: Background jobs

### Long Term
- 📋 Additional billers (ESCOM, NOCMA, etc.)
- 📋 Webhook notifications
- 📋 Scheduled payments
- 📋 Bulk payment processing
- 📋 Mobile app integration

## 📄 License

Internal project - All rights reserved

---

**Last Updated**: 2025-12-13  
**Version**: 1.0.0  
**Maintainer**: Development Team
