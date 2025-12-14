# Redis PubSub for Real-time Service Monitoring

## Problem/Context
Background services (Balance Sync, Account Discovery, Account Enrichment) run independently in the NextJS application. The UI currently polls every 5 seconds for status updates, which is inefficient and has delayed updates.

**Current Issues:**
- Polling creates unnecessary API calls (every 5s per client)
- Status updates have 0-5 second delay
- No way to know about service events immediately
- Increased server load with multiple clients

## Solution: Redis PubSub + Server-Sent Events (SSE)

Use Redis as a message broker between background services and the UI:
1. **Background services** publish status updates to Redis channels
2. **API route** subscribes to Redis and streams updates via SSE
3. **Frontend** receives real-time updates via EventSource

### Architecture

```
┌─────────────────────┐
│  Background Service │
│  (Balance Sync)     │
└──────────┬──────────┘
           │ publish
           ▼
     ┌──────────┐
     │  Redis   │
     │  PubSub  │
     └────┬─────┘
          │ subscribe
          ▼
┌─────────────────────┐
│  API Route (SSE)    │
│  /api/services/     │
│  status/stream      │
└──────────┬──────────┘
           │ SSE stream
           ▼
┌─────────────────────┐
│  Frontend           │
│  EventSource        │
│  (Services Monitor) │
└─────────────────────┘
```

## Implementation Plan

### 1. Add Redis to Docker Compose

**File**: `../docker-compose.yml`

```yaml
  # Redis for PubSub
  redis:
    image: redis:7-alpine
    container_name: service_manager_redis
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - ./redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - service_manager_network
```

### 2. Install Redis Client

```bash
npm install ioredis
npm install --save-dev @types/ioredis
```

### 3. Create Redis Client Singleton

**File**: `lib/redis/client.ts`

```typescript
import Redis from "ioredis";

class RedisClient {
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;

  getPublisher(): Redis {
    if (!this.publisher) {
      this.publisher = new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.publisher.on("error", (err) => {
        console.error("Redis Publisher Error:", err);
      });

      this.publisher.on("connect", () => {
        console.log("✅ Redis Publisher connected");
      });
    }
    return this.publisher;
  }

  getSubscriber(): Redis {
    if (!this.subscriber) {
      this.subscriber = new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.subscriber.on("error", (err) => {
        console.error("Redis Subscriber Error:", err);
      });

      this.subscriber.on("connect", () => {
        console.log("✅ Redis Subscriber connected");
      });
    }
    return this.subscriber;
  }

  async close() {
    if (this.publisher) await this.publisher.quit();
    if (this.subscriber) await this.subscriber.quit();
  }
}

export const redisClient = new RedisClient();
```

### 4. Create PubSub Service

**File**: `lib/redis/pubsub.ts`

```typescript
import { redisClient } from "./client";

export enum ServiceChannel {
  BALANCE_SYNC = "service:balance-sync",
  ACCOUNT_DISCOVERY = "service:account-discovery",
  ACCOUNT_ENRICHMENT = "service:account-enrichment",
  ALL_SERVICES = "service:*",
}

export interface ServiceStatusUpdate {
  service: string;
  timestamp: number;
  status: {
    [key: string]: any;
  };
}

export class ServicePubSub {
  /**
   * Publish service status update
   */
  async publishStatus(
    channel: ServiceChannel,
    status: ServiceStatusUpdate
  ): Promise<void> {
    try {
      const publisher = redisClient.getPublisher();
      await publisher.publish(channel, JSON.stringify(status));
      console.log(`📢 Published to ${channel}:`, status.service);
    } catch (error) {
      console.error("Failed to publish status:", error);
    }
  }

  /**
   * Subscribe to service status updates
   */
  async subscribe(
    channels: ServiceChannel[],
    callback: (channel: string, message: ServiceStatusUpdate) => void
  ): Promise<void> {
    const subscriber = redisClient.getSubscriber();

    subscriber.on("message", (channel, message) => {
      try {
        const data = JSON.parse(message);
        callback(channel, data);
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    });

    // Use psubscribe for pattern matching if ALL_SERVICES
    if (channels.includes(ServiceChannel.ALL_SERVICES)) {
      await subscriber.psubscribe("service:*");
    } else {
      await subscriber.subscribe(...channels);
    }

    console.log("✅ Subscribed to channels:", channels);
  }
}

export const servicePubSub = new ServicePubSub();
```

### 5. Update Background Services to Publish Status

**File**: `lib/services/background/balance-sync.ts`

```typescript
import { servicePubSub, ServiceChannel } from "@/lib/redis/pubsub";

// In the syncUserBalance method, after successful sync:
async syncUserBalance(userId: number): Promise<string | null> {
  try {
    // ... existing sync logic ...

    // Publish status update
    await servicePubSub.publishStatus(ServiceChannel.BALANCE_SYNC, {
      service: "balance-sync",
      timestamp: Date.now(),
      status: this.getStatus(),
    });

    return balance;
  } catch (error) {
    // ... error handling ...
  }
}

// Also publish in processQueues after processing
private async processQueues(): Promise<void> {
  // ... existing queue processing ...
  
  // Publish updated status
  await servicePubSub.publishStatus(ServiceChannel.BALANCE_SYNC, {
    service: "balance-sync",
    timestamp: Date.now(),
    status: this.getStatus(),
  });
}
```

**File**: `lib/services/background/account-discovery.ts`

```typescript
import { servicePubSub, ServiceChannel } from "@/lib/redis/pubsub";

// In discoverNewAccounts method:
private async discoverNewAccounts(): Promise<void> {
  this.isRunning = true;
  
  // Publish "discovering" status
  await servicePubSub.publishStatus(ServiceChannel.ACCOUNT_DISCOVERY, {
    service: "account-discovery",
    timestamp: Date.now(),
    status: this.getStatus(),
  });

  try {
    // ... discovery logic ...
  } finally {
    this.isRunning = false;
    
    // Publish "idle" status
    await servicePubSub.publishStatus(ServiceChannel.ACCOUNT_DISCOVERY, {
      service: "account-discovery",
      timestamp: Date.now(),
      status: this.getStatus(),
    });
  }
}
```

**File**: `lib/services/background/account-enrichment.ts`

```typescript
import { servicePubSub, ServiceChannel } from "@/lib/redis/pubsub";

// Similar pattern - publish at start and end of enrichment
```

### 6. Create SSE API Route

**File**: `app/api/services/status/stream/route.ts`

```typescript
import { servicePubSub, ServiceChannel } from "@/lib/redis/pubsub";
import { balanceSyncService } from "@/lib/services/background/balance-sync";
import { accountDiscoveryService } from "@/lib/services/background/account-discovery";
import { accountEnrichmentService } from "@/lib/services/background/account-enrichment";

export const runtime = "nodejs"; // Required for SSE
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial status immediately
      const initialStatus = {
        balanceSync: balanceSyncService.getStatus(),
        accountDiscovery: accountDiscoveryService.getStatus(),
        accountEnrichment: accountEnrichmentService.getStatus(),
      };
      
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initialStatus)}\n\n`)
      );

      // Subscribe to all service channels
      await servicePubSub.subscribe(
        [ServiceChannel.ALL_SERVICES],
        (channel, message) => {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
            );
          } catch (error) {
            console.error("Failed to send SSE:", error);
          }
        }
      );

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch (error) {
          clearInterval(heartbeat);
        }
      }, 30000); // Every 30 seconds

      // Cleanup on connection close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
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

### 7. Update Frontend to Use SSE

**File**: `app/(authenticated)/services/page.tsx`

```typescript
"use client";

import { useState, useEffect, useRef } from "react";
// ... other imports ...

export default function ServicesMonitorPage() {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Create SSE connection
    const eventSource = new EventSource("/api/services/status/stream");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("✅ SSE Connected");
      setConnected(true);
      setLoading(false);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle initial full status
        if (data.balanceSync && data.accountDiscovery && data.accountEnrichment) {
          setStatus({
            balanceSync: data.balanceSync,
            accountDiscovery: data.accountDiscovery,
            accountEnrichment: data.accountEnrichment,
          });
        } 
        // Handle individual service updates
        else if (data.service) {
          setStatus((prev) => {
            if (!prev) return prev;
            
            const serviceKey = data.service === "balance-sync" 
              ? "balanceSync"
              : data.service === "account-discovery"
              ? "accountDiscovery"
              : "accountEnrichment";
            
            return {
              ...prev,
              [serviceKey]: data.status,
            };
          });
        }
      } catch (error) {
        console.error("Failed to parse SSE data:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE Error:", error);
      setConnected(false);
      eventSource.close();
      
      // Reconnect after 5 seconds
      setTimeout(() => {
        window.location.reload();
      }, 5000);
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, []);

  // Remove manual refresh - no longer needed
  // const fetchStatus = async () => { ... }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Background Services Monitor</h1>
          <p className="text-muted-foreground">
            Real-time service status updates
            {connected && (
              <span className="ml-2 text-green-600">● Connected</span>
            )}
            {!connected && (
              <span className="ml-2 text-red-600">● Disconnected</span>
            )}
          </p>
        </div>
      </div>

      {/* Rest of UI stays the same */}
    </div>
  );
}
```

## Environment Variables

Add to `.env`:

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Benefits

### 1. Real-time Updates
- **Instant** status changes (no polling delay)
- Event-driven architecture
- Live connection indicator

### 2. Performance
- Reduced API calls (no polling)
- Lower server load
- Efficient bandwidth usage
- Single Redis connection per service

### 3. Scalability
- Multiple clients without increased load
- Redis handles message distribution
- Can scale to multiple admin instances
- Service status persists in Redis

### 4. Developer Experience
- Clear separation of concerns
- Easy to add new service channels
- Standard SSE API (browser native)
- Automatic reconnection

## Testing

### 1. Start Redis
```bash
docker compose up -d redis
```

### 2. Test Redis Connection
```bash
redis-cli ping
# Should return: PONG
```

### 3. Monitor Redis Messages
```bash
redis-cli PSUBSCRIBE "service:*"
```

### 4. Test Services
Trigger a balance sync and watch Redis messages appear in real-time.

## Migration Strategy

### Phase 1: Add Redis (Non-breaking)
1. Add Redis to docker-compose
2. Install ioredis package
3. Create Redis client & pubsub service
4. Keep existing polling API active

### Phase 2: Update Services
1. Add publish calls to background services
2. Test that messages are being published
3. No UI changes yet

### Phase 3: Add SSE Endpoint
1. Create SSE API route
2. Test with curl or browser
3. Keep existing polling for now

### Phase 4: Update Frontend
1. Replace polling with SSE
2. Add connection status indicator
3. Test reconnection logic
4. Remove old polling code

### Phase 5: Cleanup
1. Remove old `/api/services/status` GET endpoint (or keep for fallback)
2. Update documentation
3. Monitor production

## Future Enhancements

1. **Service Logs Streaming**
   ```typescript
   ServiceChannel.LOGS = "service:logs"
   ```

2. **Service Control**
   ```typescript
   ServiceChannel.COMMANDS = "service:commands"
   // Publish: { command: "restart", service: "balance-sync" }
   ```

3. **Metrics & Analytics**
   ```typescript
   ServiceChannel.METRICS = "service:metrics"
   // Publish: { service: "balance-sync", metrics: { duration: 123 } }
   ```

4. **Multiple Admin Instances**
   - Each admin subscribes to same channels
   - All receive real-time updates
   - Redis handles distribution

5. **Historical Status**
   - Store status in Redis with TTL
   - API can retrieve recent history
   - Useful for debugging

## Security Considerations

1. **Authentication**
   - SSE endpoint should require authentication
   - Use session/JWT validation

2. **Rate Limiting**
   - Limit SSE connections per user
   - Prevent abuse

3. **Redis Security**
   - Use Redis password in production
   - Network isolation
   - TLS if exposed

## Files to Create/Modify

### Create
- `lib/redis/client.ts`
- `lib/redis/pubsub.ts`
- `app/api/services/status/stream/route.ts`

### Modify
- `../docker-compose.yml` - Add Redis service
- `lib/services/background/balance-sync.ts` - Add publish calls
- `lib/services/background/account-discovery.ts` - Add publish calls
- `lib/services/background/account-enrichment.ts` - Add publish calls
- `app/(authenticated)/services/page.tsx` - Replace polling with SSE
- `.env.example` - Add Redis config
- `package.json` - Add ioredis dependency

## Related Documentation
- [Services Monitor](../features/SERVICES_MONITOR.md)
- [Balance Sync Service](../t24/ACCOUNT_BALANCE_SYNC.md)
- [Account Discovery](../t24/T24_ACCOUNTS_PAGINATION.md)

---

**Date**: 2025-12-13  
**Status**: Design Phase - Ready for Implementation
