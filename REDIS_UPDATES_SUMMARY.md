# Registration Workflow - Redis Real-Time Updates Summary

## What Was Added

### Real-time updates for registration validation using Redis Pub/Sub + Server-Sent Events (SSE)

---

## Quick Overview

**Before:**
- Frontend polls or manually refreshes to see updates
- No visibility into validation progress
- User waits without feedback

**After:**
- ✅ Real-time stage updates as validation progresses
- ✅ Live connection indicator in UI
- ✅ Automatic page refresh on completion
- ✅ No polling needed - efficient SSE connection

---

## Architecture

```
┌─────────────┐         ┌───────────┐         ┌──────────────┐
│   Backend   │  ────>  │   Redis   │  ────>  │   Frontend   │
│ Process API │         │  Pub/Sub  │         │  SSE Stream  │
└─────────────┘         └───────────┘         └──────────────┘
      │                       │                       │
      │  Publish Updates      │   Subscribe           │
      │  - Stage Progress     │   - EventSource       │
      │  - Final Status       │   - React Hook        │
      └───────────────────────┴───────────────────────┘
```

---

## Files Created

### 1. Redis Integration
- **`lib/redis/registration-pubsub.ts`** - Registration-specific pub/sub service
- **`lib/redis/pubsub.ts`** - Added `REGISTRATION_UPDATES` channel

### 2. Backend API
- **`app/api/registrations/updates/stream/route.ts`** - SSE endpoint for real-time updates

### 3. Frontend Hook
- **`lib/hooks/useRegistrationUpdates.ts`** - React hook for subscribing to updates

### 4. Documentation
- **`REGISTRATION_REALTIME_UPDATES.md`** - Complete implementation guide

---

## Files Modified

### Backend: Process Route
**File:** `app/api/registrations/[id]/process/route.ts`

**Changes:**
1. Import registration pub/sub service
2. Publish stage updates in `logStage()` function
3. Publish final status for all completion paths:
   - COMPLETED (duplicate with updates)
   - DUPLICATE (no changes)
   - APPROVED (validation success)
   - FAILED (no accounts or errors)

### Frontend: Detail Page
**File:** `app/mobile-banking/registration-requests/[id]/page.tsx`

**Changes:**
1. Import and use `useRegistrationUpdates` hook
2. Add connection status indicator (Live badge)
3. Show real-time progress messages
4. Auto-refresh on completion

---

## Usage

### Backend - Publishing Updates

```typescript
import { registrationPubSub } from '@/lib/redis/registration-pubsub';

// Stage update (automatic in logStage function)
await registrationPubSub.publishStageUpdate(
  registrationId,
  'duplicate_check',
  'completed',
  'No duplicate found'
);

// Final status update
await registrationPubSub.publishFinalStatus(
  registrationId,
  RegistrationStatus.APPROVED,
  'Customer validated successfully',
  { accountsFound: 5 },
  processLog
);
```

### Frontend - Subscribing to Updates

```typescript
import { useRegistrationUpdates } from '@/lib/hooks/useRegistrationUpdates';

const { isConnected, latestUpdate } = useRegistrationUpdates({
  registrationId: 42,
  onUpdate: (update) => {
    // Handle real-time update
    console.log('📢 Update:', update);
  },
  autoConnect: true,
});
```

---

## Real-Time Updates Flow

### Example: Validating a Registration

**1. User clicks "Validate Customer"**

**2. Backend publishes updates:**
```
➡️ duplicate_check: started
➡️ duplicate_check: completed (No duplicate found)
➡️ t24_lookup: started
➡️ t24_lookup: completed (Found 5 accounts)
➡️ account_validation: started
➡️ account_validation: completed
➡️ status_update: started
➡️ status_update: completed (APPROVED)
✅ Final: Customer validated successfully. Found 5 accounts.
```

**3. Frontend shows:**
- Live badge indicator
- Each stage progress message
- Auto-refresh when complete
- Final status displayed

---

## API Endpoints

### SSE Stream Endpoint
```bash
GET /api/registrations/updates/stream
GET /api/registrations/updates/stream?registrationId=42
```

**Response (Server-Sent Events):**
```
data: {"type":"connected","timestamp":1702493000000}

data: {"type":"update","data":{"registrationId":42,"stage":"duplicate_check","status":"PENDING","message":"started"}}

data: {"type":"update","data":{"registrationId":42,"status":"APPROVED","message":"Validation complete"}}

data: {"type":"ping","timestamp":1702493030000}
```

---

## Message Types

### Stage Update
```typescript
{
  registrationId: 42,
  status: "PENDING",
  stage: "duplicate_check",
  message: "Checking for duplicates",
  timestamp: 1702493000000
}
```

### Final Status Update
```typescript
{
  registrationId: 42,
  status: "APPROVED",
  message: "Customer validated successfully",
  details: {
    accountsFound: 5
  },
  processLog: [...],
  timestamp: 1702493005000
}
```

---

## Benefits

✅ **Real-time Feedback** - Users see progress as it happens  
✅ **Better UX** - No need to poll or manually refresh  
✅ **Efficient** - Single SSE connection vs. repeated HTTP requests  
✅ **Scalable** - Redis handles pub/sub efficiently  
✅ **Reliable** - Auto-reconnect on connection loss  
✅ **Decoupled** - Backend and frontend communicate via Redis  

---

## Configuration

### Environment Variables
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
```

### Redis Channel
```
service:registration-updates
```

---

## Testing

### 1. Manual Test
1. Open registration detail page
2. Click "Validate Customer"
3. Watch for:
   - "Live" badge appears
   - Stage progress messages appear
   - Page auto-refreshes on completion

### 2. Monitor Redis
```bash
redis-cli SUBSCRIBE service:registration-updates
```

### 3. Check SSE Connection
- Browser DevTools → Network tab
- Look for `/api/registrations/updates/stream`
- Should see streaming connection (pending)

---

## Troubleshooting

### No updates received
✓ Check Redis is running: `docker ps | grep redis`  
✓ Check SSE connection in Network tab  
✓ Check console for "📢 Published" (backend)  
✓ Check console for "✅ SSE connected" (frontend)  

### Connection drops
✓ Check Redis connection stability  
✓ Check auto-reconnect after 5 seconds  
✓ Check proxy/nginx buffering settings  

---

## What's Next

The cron job that creates users from APPROVED registrations will also publish updates:

```typescript
// In cron job (future)
await registrationPubSub.publishFinalStatus(
  registrationId,
  RegistrationStatus.COMPLETED,
  'User created successfully',
  { mobileUserId: 789, elixirUserId: 456 },
  processLog
);
```

---

## Documentation

- **Complete Guide**: `REGISTRATION_REALTIME_UPDATES.md`
- **Workflow Summary**: `REGISTRATION_WORKFLOW_SUMMARY.md`
- **Duplicate Handling**: `REGISTRATION_DUPLICATE_HANDLING.md`
- **Quick Reference**: `REGISTRATION_QUICK_REFERENCE.md`

---

## Summary

Added Redis-powered real-time updates to registration validation workflow:
- ✅ Backend publishes updates via Redis Pub/Sub
- ✅ Frontend subscribes via Server-Sent Events
- ✅ Live progress indicators in UI
- ✅ Auto-refresh on completion
- ✅ Efficient and scalable architecture

**Implementation Date:** December 13, 2024  
**Status:** ✅ Complete and Documented
