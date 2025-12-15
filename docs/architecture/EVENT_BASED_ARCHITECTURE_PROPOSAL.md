# Event-Based Architecture Proposal

## Date: 2025-12-15

## Current State Analysis

### What We Have:
✅ Redis PubSub infrastructure (`lib/redis/pubsub.ts`)
✅ Service channels already defined
✅ Background services using Redis for status updates
✅ Push notifications (Firebase)
✅ Email notifications (SMTP)
✅ SMS notifications (ESB)
✅ Account alerts system

### What's Missing:
❌ Unified event bus
❌ Notification monitoring/tracking
❌ Event-driven triggers
❌ Notification history/audit
❌ Retry mechanisms for failed notifications
❌ Notification delivery status

---

## Proposed Event-Based Architecture

### 1. Event Bus Design

```typescript
// Central event types
enum EventType {
  // Transaction Events
  TRANSACTION_CREATED = 'transaction.created',
  TRANSACTION_COMPLETED = 'transaction.completed',
  TRANSACTION_FAILED = 'transaction.failed',
  
  // Account Events
  ACCOUNT_CREATED = 'account.created',
  ACCOUNT_FROZEN = 'account.frozen',
  ACCOUNT_UNFROZEN = 'account.unfrozen',
  ACCOUNT_BALANCE_LOW = 'account.balance.low',
  
  // Checkbook Events
  CHECKBOOK_REQUESTED = 'checkbook.requested',
  CHECKBOOK_APPROVED = 'checkbook.approved',
  CHECKBOOK_READY = 'checkbook.ready',
  CHECKBOOK_COLLECTED = 'checkbook.collected',
  CHECKBOOK_REJECTED = 'checkbook.rejected',
  
  // User Events
  USER_REGISTERED = 'user.registered',
  USER_LOGIN = 'user.login',
  USER_LOGIN_FAILED = 'user.login.failed',
  
  // Alert Events
  ALERT_TRIGGERED = 'alert.triggered',
  
  // Service Events
  BALANCE_SYNC_STARTED = 'service.balance.sync.started',
  BALANCE_SYNC_COMPLETED = 'service.balance.sync.completed',
  ACCOUNT_DISCOVERY_STARTED = 'service.account.discovery.started',
  ACCOUNT_DISCOVERY_COMPLETED = 'service.account.discovery.completed',
}

// Event structure
interface DomainEvent {
  id: string;                    // Unique event ID
  type: EventType;               // Event type
  timestamp: Date;               // When it happened
  aggregateId: string;           // Entity ID (userId, accountId, etc)
  aggregateType: string;         // Entity type (user, account, transaction)
  payload: any;                  // Event-specific data
  metadata: {
    userId?: number;             // Who triggered it
    correlationId?: string;      // For tracing
    causationId?: string;        // Parent event ID
    source: string;              // Which service
  };
}
```

### 2. Event Bus Implementation

```typescript
// lib/events/event-bus.ts
class EventBus {
  private redisPublisher: Redis;
  private redisSubscriber: Redis;
  
  async publish(event: DomainEvent): Promise<void> {
    // 1. Save to database (event store)
    await prisma.domainEvent.create({
      data: {
        id: event.id,
        type: event.type,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        payload: event.payload,
        metadata: event.metadata,
        timestamp: event.timestamp,
      }
    });
    
    // 2. Publish to Redis for real-time handlers
    await this.redisPublisher.publish(
      `events:${event.aggregateType}`,
      JSON.stringify(event)
    );
  }
  
  async subscribe(
    eventTypes: EventType[],
    handler: (event: DomainEvent) => Promise<void>
  ): Promise<void> {
    // Subscribe to multiple event patterns
    eventTypes.forEach(type => {
      this.redisSubscriber.psubscribe(`events:*`);
    });
    
    this.redisSubscriber.on('pmessage', async (pattern, channel, message) => {
      const event = JSON.parse(message) as DomainEvent;
      
      if (eventTypes.includes(event.type)) {
        await handler(event);
      }
    });
  }
}
```

### 3. Notification Event Handlers

```typescript
// lib/events/handlers/notification-handler.ts
class NotificationEventHandler {
  async handle(event: DomainEvent): Promise<void> {
    const notificationId = crypto.randomUUID();
    
    try {
      // 1. Create notification record
      const notification = await prisma.notification.create({
        data: {
          id: notificationId,
          eventId: event.id,
          eventType: event.type,
          userId: event.metadata.userId,
          status: 'PENDING',
          channels: this.getChannelsForEvent(event.type),
          payload: this.buildNotificationPayload(event),
        }
      });
      
      // 2. Send via each channel
      const results = await Promise.allSettled([
        this.sendPush(notification),
        this.sendEmail(notification),
        this.sendSMS(notification),
      ]);
      
      // 3. Update notification status
      await this.updateNotificationStatus(notificationId, results);
      
      // 4. Publish notification event
      await eventBus.publish({
        id: crypto.randomUUID(),
        type: 'notification.sent',
        timestamp: new Date(),
        aggregateId: notificationId,
        aggregateType: 'notification',
        payload: { success: results.filter(r => r.status === 'fulfilled').length },
        metadata: { ...event.metadata }
      });
      
    } catch (error) {
      console.error('Notification handler error:', error);
      
      // Schedule retry
      await this.scheduleRetry(notificationId, event);
    }
  }
}
```

### 4. Database Schema Extensions

```sql
-- Event Store
CREATE TABLE domain_events (
  id VARCHAR(50) PRIMARY KEY,
  type VARCHAR(100) NOT NULL,
  aggregate_id VARCHAR(100) NOT NULL,
  aggregate_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMP NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_aggregate (aggregate_type, aggregate_id),
  INDEX idx_type (type),
  INDEX idx_timestamp (timestamp)
);

-- Notifications Table
CREATE TABLE notifications (
  id VARCHAR(50) PRIMARY KEY,
  event_id VARCHAR(50) REFERENCES domain_events(id),
  user_id INTEGER REFERENCES fdh_mobile_users(id),
  event_type VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL, -- PENDING, SENT, FAILED, RETRY
  channels TEXT[], -- [PUSH, EMAIL, SMS]
  payload JSONB NOT NULL,
  
  -- Delivery tracking
  push_sent_at TIMESTAMP,
  push_status VARCHAR(20),
  push_error TEXT,
  
  email_sent_at TIMESTAMP,
  email_status VARCHAR(20),
  email_error TEXT,
  
  sms_sent_at TIMESTAMP,
  sms_status VARCHAR(20),
  sms_error TEXT,
  
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_event_type (event_type),
  INDEX idx_retry (status, next_retry_at)
);

-- Notification History (for analytics)
CREATE TABLE notification_history (
  id SERIAL PRIMARY KEY,
  notification_id VARCHAR(50) REFERENCES notifications(id),
  channel VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  error TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## Benefits of Event-Based Approach

### 1. **Decoupling**
- Services don't call each other directly
- Add/remove listeners without changing publishers
- Easy to add new notification channels

### 2. **Audit Trail**
- Every event stored in database
- Full history of what happened
- Debugging & compliance

### 3. **Reliability**
- Retry failed notifications automatically
- No lost notifications (persisted in DB)
- Can replay events if needed

### 4. **Monitoring**
- Track notification delivery rates
- See which events trigger notifications
- Monitor failures by channel

### 5. **Scalability**
- Multiple workers can process events
- Easy horizontal scaling
- Load distribution

### 6. **Flexibility**
- A/B test notification strategies
- User preferences (opt-out channels)
- Time-based rules (quiet hours)

---

## Implementation Strategy

### Phase 1: Foundation (Week 1)
1. ✅ Create `domain_events` table
2. ✅ Create `notifications` table
3. ✅ Implement EventBus class
4. ✅ Add event publishing to one service (e.g., transactions)

### Phase 2: Notification Handlers (Week 2)
1. ✅ Create NotificationEventHandler
2. ✅ Migrate push notifications to event-driven
3. ✅ Add retry logic
4. ✅ Add delivery tracking

### Phase 3: Monitoring (Week 3)
1. ✅ Create notification dashboard
2. ✅ Add metrics (sent, failed, retry)
3. ✅ Add filtering (by user, type, channel)
4. ✅ Add realtime notification stream

### Phase 4: Migration (Week 4)
1. ✅ Migrate all notification triggers to events
2. ✅ Remove direct notification calls
3. ✅ Add user notification preferences
4. ✅ Testing & validation

---

## Notification Monitoring Dashboard

### Proposed Features:

```typescript
// /notifications page
interface NotificationMonitor {
  // Metrics
  totalSent: number;
  totalFailed: number;
  successRate: number;
  
  // By Channel
  pushStats: ChannelStats;
  emailStats: ChannelStats;
  smsStats: ChannelStats;
  
  // Recent notifications
  recentNotifications: Notification[];
  
  // Failed notifications requiring attention
  failedNotifications: Notification[];
  
  // Charts
  notificationsByType: Chart;
  notificationsByHour: Chart;
  deliveryRateChart: Chart;
}

interface ChannelStats {
  sent: number;
  failed: number;
  pending: number;
  successRate: number;
}
```

### UI Mockup:
```
╔════════════════════════════════════════════════╗
║  📬 Notification Monitor                       ║
╠════════════════════════════════════════════════╣
║                                                ║
║  📊 Overview (Last 24h)                        ║
║  ┌──────────┬──────────┬──────────┬─────────┐ ║
║  │ Total    │ Success  │ Failed   │ Rate    │ ║
║  │ 1,234    │ 1,200    │ 34       │ 97.2%   │ ║
║  └──────────┴──────────┴──────────┴─────────┘ ║
║                                                ║
║  📱 By Channel                                 ║
║  ┌─────────────────────────────────────────┐  ║
║  │ Push:  1000 sent (980 ✓ / 20 ✗)       │  ║
║  │ Email:  800 sent (790 ✓ / 10 ✗)       │  ║
║  │ SMS:    434 sent (430 ✓ /  4 ✗)       │  ║
║  └─────────────────────────────────────────┘  ║
║                                                ║
║  🔴 Failed Notifications (Needs Attention)     ║
║  ┌─────────────────────────────────────────┐  ║
║  │ • User 123 - Push failed (Invalid FCM) │  ║
║  │ • User 456 - SMS failed (Invalid num)  │  ║
║  │ [View All →]                            │  ║
║  └─────────────────────────────────────────┘  ║
║                                                ║
║  📈 Realtime Feed                              ║
║  ┌─────────────────────────────────────────┐  ║
║  │ 12:05 - Transaction alert sent (User 1)│  ║
║  │ 12:04 - Login alert sent (User 2)      │  ║
║  │ 12:03 - Balance alert sent (User 3)    │  ║
║  └─────────────────────────────────────────┘  ║
╚════════════════════════════════════════════════╝
```

---

## Event-Driven Services

### Balance Sync Service (Event-Driven)
```typescript
// Before: Polling-based
setInterval(() => {
  syncBalances();
}, 5 * 60 * 1000);

// After: Event-driven + scheduled
eventBus.subscribe([EventType.TRANSACTION_COMPLETED], async (event) => {
  // Immediately sync balance for this account
  await syncAccountBalance(event.payload.accountNumber);
});

// Plus scheduled sync for all accounts
cron.schedule('*/5 * * * *', () => {
  eventBus.publish({
    type: EventType.BALANCE_SYNC_STARTED,
    ...
  });
});
```

### Account Discovery (Event-Driven)
```typescript
// Trigger on user registration
eventBus.subscribe([EventType.USER_REGISTERED], async (event) => {
  await discoverAccountsForUser(event.payload.userId);
});

// Still keep scheduled discovery for existing users
```

### Alert Settings (Event-Driven)
```typescript
// React to balance changes
eventBus.subscribe([EventType.BALANCE_SYNC_COMPLETED], async (event) => {
  const balance = event.payload.balance;
  const alerts = await getAlertsForAccount(event.payload.accountId);
  
  // Check if any alert thresholds are met
  alerts.forEach(alert => {
    if (shouldTrigger(alert, balance)) {
      eventBus.publish({
        type: EventType.ALERT_TRIGGERED,
        payload: { alertId: alert.id, ... }
      });
    }
  });
});
```

---

## Migration Path

### Option A: Big Bang (Risky)
- Migrate everything at once
- High risk
- Shorter timeline

### Option B: Gradual (Recommended)
1. **Week 1**: Set up event infrastructure
2. **Week 2**: Run events + old system in parallel
3. **Week 3**: Monitor & validate
4. **Week 4**: Disable old system
5. **Week 5**: Clean up old code

### Option C: Feature-by-Feature
1. Start with notifications (most benefit)
2. Then transaction events
3. Then service events
4. Finally, full migration

---

## Questions to Consider

### 1. Event Store Strategy
- ✅ **Recommend:** Store all events indefinitely (valuable audit trail)
- ❌ **Alternative:** Expire old events after 90 days

### 2. Event Processing
- ✅ **Recommend:** Async processing (don't block API)
- ⚠️ **Consider:** Some critical events need sync (account frozen)

### 3. Failure Handling
- ✅ **Recommend:** Retry with exponential backoff
- ✅ **Recommend:** Dead letter queue after max retries
- ✅ **Recommend:** Alert admins for persistent failures

### 4. Monitoring
- ✅ **Must have:** Notification delivery dashboard
- ✅ **Must have:** Failed notification alerts
- ✅ **Nice to have:** Event flow visualization

### 5. User Preferences
- ✅ **Recommend:** Allow users to opt-out per channel
- ✅ **Recommend:** Quiet hours support
- ✅ **Recommend:** Notification frequency limits

---

## Estimated Effort

### Development Time
- Event Bus Infrastructure: **3-4 days**
- Notification Handler: **2-3 days**
- Database migrations: **1 day**
- Monitoring Dashboard: **3-4 days**
- Service Migration: **5-7 days**
- Testing: **3-4 days**

**Total: 3-4 weeks** for complete implementation

### Complexity: Medium-High
- Redis PubSub experience needed
- Event sourcing concepts
- Async programming patterns
- Database design

---

## Recommendation

### ✅ **YES - Do This!**

**Why:**
1. You already have Redis infrastructure
2. Notifications are critical (must be reliable)
3. Easy to monitor & debug
4. Scales naturally
5. Audit trail for compliance

**Priority Order:**
1. 🔴 **HIGH:** Notification monitoring (immediate value)
2. 🟡 **MEDIUM:** Event-driven notifications (reliability)
3. 🟢 **LOW:** Event-driven services (optimization)

**Start Small:**
```
Week 1: Add notification monitoring (no events needed)
Week 2: Add notification event handler
Week 3: Migrate one notification type (transaction alerts)
Week 4: Expand to all notifications
```

---

## Next Steps

1. **Discuss with team**
   - Do we need all event types?
   - Which notifications are most critical?
   - What metrics matter most?

2. **Create Prisma schema**
   - Add `DomainEvent` model
   - Add `Notification` model
   - Add `NotificationHistory` model

3. **Build EventBus**
   - Simple implementation first
   - Test with one event type

4. **Create monitoring dashboard**
   - Start with basic metrics
   - Add filtering & search
   - Add realtime feed

5. **Migrate notifications gradually**
   - One type at a time
   - Keep old code as fallback
   - Monitor & validate

---

**Questions? Concerns? Alternative approaches?**

Let's discuss! 💬
