# Registration Real-Time Updates with Redis

## Overview
Implemented real-time updates for registration validation using Redis Pub/Sub and Server-Sent Events (SSE). The frontend receives live updates as the backend processes registration requests.

## Architecture

```
Backend (API Route)                 Redis Pub/Sub                 Frontend (React)
      ↓                                  ↓                              ↓
Process Registration          Publish Updates              Subscribe via SSE
      ↓                                  ↓                              ↓
Stage: duplicate_check  →  Redis Channel  →  EventSource Connection
Stage: update_user_info →  "service:      →  React Hook
Stage: t24_lookup      →   registration-  →  State Updates
Stage: status_update   →   updates"       →  UI Refresh
      ↓                                  ↓                              ↓
Final Status Update          Broadcast              Update Display
```

## Components

### 1. Redis Pub/Sub Infrastructure

#### Redis Client (`lib/redis/client.ts`)
- Singleton Redis client with separate publisher/subscriber connections
- Auto-reconnect with exponential backoff
- Error handling and logging

#### Service Pub/Sub (`lib/redis/pubsub.ts`)
```typescript
export enum ServiceChannel {
  REGISTRATION_UPDATES = "service:registration-updates",
  // ... other channels
}
```

#### Registration Pub/Sub (`lib/redis/registration-pubsub.ts`)
Specialized pub/sub service for registration updates:

```typescript
export class RegistrationPubSub {
  // Publish any update
  async publishUpdate(update: RegistrationUpdate): Promise<void>
  
  // Publish stage progress
  async publishStageUpdate(
    registrationId: number,
    stage: string,
    status: "started" | "completed" | "failed",
    details?: string
  ): Promise<void>
  
  // Publish final status
  async publishFinalStatus(
    registrationId: number,
    status: RegistrationStatus,
    message: string,
    details?: object,
    processLog?: ProcessStage[]
  ): Promise<void>
  
  // Subscribe to updates
  async subscribe(
    callback: (update: RegistrationUpdate) => void
  ): Promise<void>
}
```

### 2. Backend Integration

#### Process Route Updates (`app/api/registrations/[id]/process/route.ts`)

**Stage Updates:**
Every stage automatically publishes to Redis:
```typescript
function logStage(stage: string, status: 'started' | 'completed' | 'failed', details?: string, error?: string) {
  // ... existing logging
  
  // Publish stage update to Redis
  registrationPubSub.publishStageUpdate(
    registrationId,
    stage,
    status,
    details || error
  ).catch(err => console.error('Failed to publish stage update:', err));
}
```

**Final Status Updates:**
Published for all completion paths:
```typescript
// On duplicate with updates
await registrationPubSub.publishFinalStatus(
  registrationId,
  RegistrationStatus.COMPLETED,
  'User already exists - information updated',
  { updatedFields, existingUserId },
  processLog
);

// On duplicate without changes
await registrationPubSub.publishFinalStatus(
  registrationId,
  RegistrationStatus.DUPLICATE,
  'User already exists with identical information',
  { existingUserId },
  processLog
);

// On validation success
await registrationPubSub.publishFinalStatus(
  registrationId,
  RegistrationStatus.APPROVED,
  `Customer validated successfully. Found ${accountsFound} accounts.`,
  { accountsFound },
  processLog
);

// On failure
await registrationPubSub.publishFinalStatus(
  registrationId,
  RegistrationStatus.FAILED,
  errorMessage,
  { error },
  processLog
);
```

### 3. SSE Endpoint

#### Stream Route (`app/api/registrations/updates/stream/route.ts`)

Server-Sent Events endpoint for real-time updates:

**Features:**
- Filter by registrationId (optional)
- Keep-alive pings every 30 seconds
- Auto-cleanup on disconnect
- Proper SSE headers

**Usage:**
```bash
# Subscribe to all registration updates
GET /api/registrations/updates/stream

# Subscribe to specific registration
GET /api/registrations/updates/stream?registrationId=42
```

**Response Format:**
```
data: {"type":"connected","timestamp":1702493000000}

data: {"type":"update","data":{"registrationId":42,"status":"PENDING","stage":"duplicate_check","message":"Checking for duplicates"}}

data: {"type":"update","data":{"registrationId":42,"status":"APPROVED","message":"Validation complete","details":{"accountsFound":5}}}

data: {"type":"ping","timestamp":1702493030000}
```

### 4. Frontend Hook

#### React Hook (`lib/hooks/useRegistrationUpdates.ts`)

**Features:**
- Auto-connect/reconnect
- Filter by registration ID
- Event callbacks
- State management

**Usage Example:**
```typescript
const { isConnected, latestUpdate } = useRegistrationUpdates({
  registrationId: 42,
  onUpdate: (update) => {
    console.log('Update received:', update);
    // Update UI
  },
  onConnected: () => {
    console.log('Connected to updates');
  },
  onError: (error) => {
    console.error('Connection error:', error);
  },
  autoConnect: true,
});
```

### 5. UI Integration

#### Detail Page Updates (`app/mobile-banking/registration-requests/[id]/page.tsx`)

**Real-time Features:**
- Live connection indicator badge
- Stage progress messages
- Auto-refresh on completion
- Visual feedback during processing

**UI Components:**
```tsx
{/* Connection Status */}
{isConnected && (
  <Badge variant="outline" className="gap-1 text-xs">
    <Radio className="h-3 w-3 animate-pulse text-green-500" />
    Live
  </Badge>
)}

{/* Real-time Progress */}
{realtimeUpdate && (
  <div className="flex items-center gap-2 text-sm text-blue-600">
    <Clock className="h-3 w-3 animate-spin" />
    {realtimeUpdate}
  </div>
)}
```

## Data Flow Example

### Scenario: User clicks "Validate Customer"

**1. Frontend initiates validation:**
```typescript
POST /api/registrations/42/process
```

**2. Backend starts processing and publishes updates:**

```
Stage: duplicate_check (started)
  → Redis: {"registrationId":42, "stage":"duplicate_check", "status":"PENDING", "message":"started: duplicate_check"}
  → Frontend: Shows "duplicate_check: started"

Stage: duplicate_check (completed)
  → Redis: {"registrationId":42, "stage":"duplicate_check", "status":"PENDING", "message":"No duplicate found"}
  → Frontend: Shows "duplicate_check: No duplicate found"

Stage: t24_lookup (started)
  → Redis: {"registrationId":42, "stage":"t24_lookup", "status":"PENDING", "message":"started: t24_lookup"}
  → Frontend: Shows "t24_lookup: started"

Stage: t24_lookup (completed)
  → Redis: {"registrationId":42, "stage":"t24_lookup", "status":"PENDING", "message":"Found 5 accounts"}
  → Frontend: Shows "t24_lookup: Found 5 accounts"

Final Status: APPROVED
  → Redis: {"registrationId":42, "status":"APPROVED", "message":"Customer validated successfully", "details":{"accountsFound":5}}
  → Frontend: Auto-refreshes and shows final status
```

**3. Frontend updates:**
- Each stage update shows real-time progress
- Final status triggers page refresh
- User sees validation complete with results

## Message Types

### Stage Update
```typescript
{
  registrationId: number;
  status: RegistrationStatus;  // Current status (PENDING during processing)
  timestamp: number;
  stage: string;               // e.g., "duplicate_check"
  message: string;             // Stage details
}
```

### Final Status Update
```typescript
{
  registrationId: number;
  status: RegistrationStatus;  // Final status (COMPLETED, FAILED, etc.)
  timestamp: number;
  message: string;             // Summary message
  details?: {
    updatedFields?: string[];
    accountsFound?: number;
    existingUserId?: number;
    error?: string;
  };
  processLog?: ProcessStage[];
}
```

## Configuration

### Environment Variables

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password_here
```

### Redis Channels

```typescript
ServiceChannel.REGISTRATION_UPDATES = "service:registration-updates"
```

## Benefits

1. **Real-time Feedback** - Users see progress as it happens
2. **Better UX** - No need to poll or manually refresh
3. **Scalable** - Redis handles pub/sub efficiently
4. **Decoupled** - Backend and frontend loosely coupled via Redis
5. **Reliable** - Auto-reconnect on connection loss
6. **Debuggable** - All updates logged in console

## Performance Considerations

### Redis Memory
- Updates are ephemeral (not stored)
- Only active subscribers receive messages
- Minimal memory footprint

### Network Traffic
- SSE keeps single HTTP connection open
- Keep-alive pings every 30 seconds
- Efficient binary protocol with Redis

### Scalability
- Multiple frontend clients can subscribe
- Redis handles thousands of pub/sub connections
- Horizontal scaling: use Redis Cluster

## Testing

### Manual Testing

**1. Test Real-time Updates:**
```bash
# Terminal 1: Start frontend
npm run dev

# Terminal 2: Watch Redis
redis-cli SUBSCRIBE service:registration-updates

# Terminal 3: Trigger validation via UI
# Click "Validate Customer" on registration detail page
```

**2. Verify SSE Connection:**
```bash
# Browser DevTools → Network tab
# Look for EventSource connection to:
/api/registrations/updates/stream?registrationId=42

# Should see:
# - Connection established (101 Switching Protocols)
# - Messages streaming in
# - Keep-alive pings
```

**3. Test Reconnection:**
```bash
# Restart Redis
docker restart redis

# Frontend should auto-reconnect after 5 seconds
# Check console for reconnection messages
```

### Integration Testing

```typescript
// Test SSE endpoint
const response = await fetch('/api/registrations/updates/stream');
expect(response.headers.get('Content-Type')).toBe('text/event-stream');

// Test Redis publish
await registrationPubSub.publishStageUpdate(42, 'test_stage', 'started');
// Verify received on subscribed client

// Test filtering
const eventSource = new EventSource('/api/registrations/updates/stream?registrationId=42');
// Verify only receives updates for registration #42
```

## Troubleshooting

### Issue: No updates received

**Check:**
1. Redis is running: `docker ps | grep redis`
2. SSE connection open: Browser DevTools → Network
3. Backend publishing: Check server logs for "📢 Published"
4. Frontend subscribed: Check console for "✅ SSE connected"

### Issue: Updates for wrong registration

**Check:**
1. registrationId parameter in SSE URL
2. Filter logic in stream endpoint
3. Redis channel subscription

### Issue: Connection drops

**Check:**
1. Redis connection stability
2. Network timeout settings
3. Nginx/proxy buffering (X-Accel-Buffering: no)
4. Auto-reconnect working (5-second delay)

## Future Enhancements

1. **Progress Bars**
   - Visual progress indicator
   - Percentage complete calculation

2. **Notifications**
   - Browser notifications on completion
   - Sound alerts for important updates

3. **History Tracking**
   - Store recent updates in Redis
   - Replay missed updates on reconnect

4. **Multi-tab Support**
   - Sync updates across browser tabs
   - Use BroadcastChannel API

5. **Admin Dashboard**
   - Real-time monitoring of all registrations
   - Activity feed with filtering

6. **Performance Metrics**
   - Track update delivery latency
   - Monitor Redis pub/sub performance
   - Alert on connection issues

## Documentation References

- **Redis Client**: `lib/redis/client.ts`
- **Pub/Sub Service**: `lib/redis/pubsub.ts`
- **Registration Pub/Sub**: `lib/redis/registration-pubsub.ts`
- **SSE Endpoint**: `app/api/registrations/updates/stream/route.ts`
- **React Hook**: `lib/hooks/useRegistrationUpdates.ts`
- **Process Route**: `app/api/registrations/[id]/process/route.ts`

## Implementation Date
December 13, 2024

## Status
✅ Implemented and Documented
