# T24 Accounts Pagination Implementation

## Summary
Implemented proper pagination handling for T24 customer accounts API to support customers with 100+ accounts without blocking the main discovery process.

## Problem
The original implementation only fetched the first page of accounts (up to 99 accounts per page). Customers with more than 99 accounts would have their additional accounts missed.

## Solution
### 1. Enhanced T24 Accounts Service (`lib/services/t24/accounts.ts`)

**New Features:**
- `getCustomerAccounts(customerId, pageToken?)` - Fetches accounts with pagination support
- `getCustomerAccountIds(customerId)` - Returns first page with metadata:
  ```typescript
  {
    accountIds: string[];
    hasMore: boolean;
    nextPageToken?: string;
    totalSize: number;
  }
  ```
- `getAllCustomerAccountIds(customerId)` - Fetches all pages synchronously (use with caution)
- `getCustomerAccountsLegacy(customerId)` - Backward compatible single-page method

**API Request Format:**
```
GET {baseUrl}/esb/customer/accounts/v1/api/{customerId}?page_token={token}
```

**Response Headers Used:**
- `header.total_size` - Total accounts across all pages
- `header.page_start` - Current page start position
- `header.page_size` - Accounts per page (99)
- `header.page_token` - Token for next page
- `header.status` - API response status

### 2. Background Pagination Queue (`lib/services/background/account-discovery.ts`)

**Architecture:**
```
Main Discovery Loop (24h interval)
    ↓
Fetch First Page (immediate)
    ↓
If hasMore → Queue Additional Pages
    ↓
Background Queue Processor (5s interval)
    ↓
Process Next Page → Queue Next Page (if needed)
```

**Components Added:**
- `PaginationQueue` - In-memory FIFO queue for pagination jobs
- `PaginationJob` interface:
  ```typescript
  {
    userId: number;
    customerNumber: string;
    pageToken: string;
    existingAccountNumbers: string[];
    timestamp: number;
  }
  ```

**Key Methods:**
- `processPaginationQueue()` - Runs every 5 seconds to process queued pages
- `processAccountPage()` - Adds new accounts from each page (avoids duplicates)
- `getStatus()` - Now includes `paginationQueueSize` for monitoring

**Benefits:**
1. ✅ **Non-blocking** - Main discovery continues while pagination runs in background
2. ✅ **Memory efficient** - Processes one page at a time
3. ✅ **Race condition safe** - Checks for existing accounts before creating
4. ✅ **Observable** - Queue size visible in service status
5. ✅ **Automatic** - No manual intervention needed

## Configuration
```env
# Account Discovery
ACCOUNT_DISCOVERY_INTERVAL=86400000  # 24 hours
ACCOUNT_DISCOVERY_BATCH_SIZE=50      # Users per batch

# Internal (not configurable)
PAGINATION_QUEUE_INTERVAL=5000       # 5 seconds between page fetches
```

## Example Flow

**Customer with 250 accounts:**
```
1. Main discovery starts
2. Fetch page 1 (accounts 1-99)   → Process immediately
3. Queue page 2 (accounts 100-198) → Background
4. Continue to next user (non-blocking)
5. Background processor:
   - Fetch page 2 → Process
   - Queue page 3 (accounts 199-250)
   - Fetch page 3 → Process
   - Done
```

## Monitoring
```typescript
const status = accountDiscoveryService.getStatus();
// {
//   running: true,
//   discovering: false,
//   interval: 86400000,
//   paginationQueueSize: 3  // 3 pages queued
// }
```

## Testing Recommendations
1. **Mock T24 Response** - Test with paginated responses
2. **Queue Monitoring** - Verify queue drains properly
3. **Duplicate Prevention** - Ensure no duplicate accounts created
4. **Large Customer** - Test with 500+ accounts
5. **Service Restart** - Verify queue persists through restarts (if needed)

## Future Enhancements
1. **Redis Queue** - Replace in-memory queue for production scaling
2. **Retry Logic** - Handle failed page fetches
3. **Progress Tracking** - Store pagination state in database
4. **Rate Limiting** - Throttle T24 API requests
5. **Deactivation Logic** - Compare full account list after all pages complete

## Files Changed
- `lib/services/t24/accounts.ts` - Added pagination support
- `lib/services/background/account-discovery.ts` - Added background queue

## Date
2025-12-13
