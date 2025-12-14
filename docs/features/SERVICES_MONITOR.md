# Services Monitor Implementation

## Summary
Comprehensive services monitoring page displaying all NextJS application services in a table format with real-time status updates.

## Problem/Context
The application has multiple background services, T24 integrations, and core services that need centralized monitoring. Previously, only balance sync and account discovery services were visible in status cards.

## Solution
Implemented a comprehensive Services Overview Table that displays all 10 services in the application with their type, description, status, interval, and details. Removed manual testing section to keep the page focused on monitoring.

## Implementation Details

### Services Displayed (10 Total)

#### Background Services (Real-time Status)
1. **Balance Sync Service**
   - Syncs account balances from T24 every 5 minutes
   - Shows: Processing status, priority queue, background queue
   - Interval: Configurable (default 5m)

2. **Account Discovery Service**
   - Discovers new accounts from T24 every 24 hours
   - Shows: Running/discovering status, pagination queue size
   - Interval: Configurable (default 24h)

3. **Account Enrichment Service**
   - Enriches account records with T24 details every 12 hours
   - Shows: Running/enriching status
   - Features: Auto-creates categories, updates profiles
   - Interval: Configurable (default 12h)

#### Integration Services (Static)
4. **T24 Balance API** - Fetches 4 balance types (working, available, cleared, online)
5. **T24 Accounts API** - Retrieves customer account lists with pagination
6. **T24 Account Details API** - Fetches comprehensive account information
7. **T24 Transactions API** - Retrieves transaction history

#### Core Services (Static)
8. **Email Service** - SMTP notifications (OTP, password reset, welcome, transactions)
9. **Backup Service** - PostgreSQL backups with MinIO storage
10. **Migration Scheduler** - Runs database migrations (1m interval check)

### Table Structure
```typescript
interface ServiceRow {
  name: string;           // Service name
  type: string;           // Background/Integration/Core Service
  description: string;    // Brief description
  status: string;         // Current status
  interval: string;       // Run frequency (e.g., "5m", "24h", "On-demand")
  details: string;        // Service-specific details
  variant: BadgeVariant;  // Badge color variant
}
```

### Status Badges
- **default** (blue) - Active/Processing/Discovering
- **secondary** (gray) - Idle/Running
- **destructive** (red) - Stopped
- **outline** (default border) - Available

### Auto-refresh
- Status updates every 5 seconds
- Real-time status for background services
- Static status for integration/core services

## UI Components Used
- `Table` - Main table component from shadcn/ui
- `Badge` - Status indicators with variants
- `Card` - Container components
- `Button` - Refresh button
- Icons: `Activity`, `Clock`, `CheckCircle`, `RefreshCw`

## API Endpoints

### Status Endpoint
```typescript
GET /api/services/status

Response:
{
  success: true,
  services: {
    balanceSync: {
      processing: boolean,
      priority: number,
      background: number,
      interval: number,
      intervalMinutes: number
    },
    accountDiscovery: {
      running: boolean,
      discovering: boolean,
      interval: number,
      intervalHours: number,
      paginationQueueSize: number
    },
    accountEnrichment: {
      running: boolean,
      enriching: boolean,
      interval: number,
      intervalHours: number
    }
  }
}
```

## Files Changed

### Modified
- `app/(authenticated)/services/page.tsx` - Added services table, removed manual testing
- `app/api/services/status/route.ts` - Added account enrichment status
- `lib/services/background/balance-sync.ts` - Added interval to getStatus()

### UI Structure
```
Services Monitor Page
├── Header (Title + Refresh Button)
├── Services Overview Table (10 services)
│   ├── Service Name
│   ├── Type Badge
│   ├── Description
│   ├── Status Badge
│   ├── Interval (with Clock icon)
│   └── Details
└── Service Status Cards (3 detailed cards)
    ├── Balance Sync Card
    ├── Account Discovery Card
    └── Account Enrichment Card
```

## Environment Variables
Services respect configuration from environment:
- `BALANCE_SYNC_INTERVAL` - Balance sync interval (default: 300000ms / 5min)
- `ACCOUNT_DISCOVERY_INTERVAL` - Discovery interval (default: 86400000ms / 24h)
- `ACCOUNT_ENRICHMENT_INTERVAL` - Enrichment interval (default: 43200000ms / 12h)

## Accessing the Monitor
Navigate to: `/services` (authenticated route)

## Benefits
1. **Single View** - All services visible at a glance
2. **Type Categorization** - Easy to identify service types
3. **Real-time Updates** - Background services show live status
4. **Detailed Information** - Each service shows relevant details
5. **Clean UI** - No manual testing clutter, focused on monitoring

## Related Documentation
- [T24 Balance Integration](../t24/T24_BALANCE_INTEGRATION.md)
- [Account Balance Sync](../t24/ACCOUNT_BALANCE_SYNC.md)
- [T24 Accounts Pagination](../t24/T24_ACCOUNTS_PAGINATION.md)
- [MinIO Storage](../infrastructure/MINIO_STORAGE_IMPLEMENTATION.md)
- [Backup Storage](../infrastructure/BACKUP_STORAGE_IMPLEMENTATION.md)

## Future Enhancements
- Add service health checks
- Add performance metrics (response times, success rates)
- Add service restart controls for background services
- Add notification system for service failures
- Add service logs viewer

---

**Date**: 2025-12-13  
**Author**: System Implementation
