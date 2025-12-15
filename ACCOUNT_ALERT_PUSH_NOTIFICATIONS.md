# Account Alert Push Notifications - Implementation

## Summary
Extended push notification system to support account alerts including low balance, large transactions, suspicious activity, payment reminders, and login notifications.

---

## New Features

### 1. Account Alert Service ✅
**File**: `lib/services/account-alert.ts`

Centralized service for triggering account alerts with automatic push notifications.

### 2. Extended Push Notification Service ✅
**File**: `lib/services/push-notification.ts`

Added new methods:
- `sendAccountAlert()` - Generic account alert notification
- `sendLoginAlert()` - New device/location login notification
- `sendPaymentDueReminder()` - Payment due reminder notification

---

## Alert Types Supported

### 1. Low Balance Alert
**Trigger**: When account balance falls below threshold

```typescript
await AccountAlertService.triggerLowBalanceAlert(
  userId,
  accountNumber,
  balance: "1000.00",
  currency: "MWK",
  threshold: "5000.00"
);
```

**Push Notification**:
- **Title**: "Low Balance Alert"
- **Body**: "Your account 1234567890 balance is 1000.00 MWK"
- **Priority**: HIGH
- **Action**: Opens account details

---

### 2. Large Transaction Alert
**Trigger**: When transaction exceeds threshold

```typescript
await AccountAlertService.triggerLargeTransactionAlert(
  userId,
  accountNumber,
  transactionId: "TXN12345",
  amount: "500000.00",
  currency: "MWK",
  type: "DEBIT",
  description: "ATM Withdrawal"
);
```

**Push Notification**:
- **Title**: "Large Transaction"
- **Body**: "Large transaction of 500000.00 MWK detected on account 1234567890"
- **Priority**: HIGH
- **Action**: Opens transaction details

---

### 3. Suspicious Activity Alert
**Trigger**: Unusual activity detected

```typescript
await AccountAlertService.triggerSuspiciousActivityAlert(
  userId,
  accountNumber,
  reason: "Multiple failed login attempts",
  details: {
    attemptCount: 5,
    deviceId: "unknown",
    ipAddress: "192.168.1.1",
    location: "Unknown Location"
  },
  riskScore: 85
);
```

**Push Notification**:
- **Title**: "Security Alert"
- **Body**: "Suspicious activity detected on account 1234567890: Multiple failed login attempts"
- **Priority**: URGENT
- **Action**: Opens security settings

**Creates**: `SuspiciousActivityLog` entry for admin review

---

### 4. Login Alert
**Trigger**: New device login or all logins (based on settings)

```typescript
await AccountAlertService.triggerLoginAlert(
  userId,
  deviceName: "iPhone 14",
  deviceId: "device-123",
  location: "Lilongwe, Malawi",
  ipAddress: "41.70.x.x"
);
```

**Push Notification**:
- **Title**: "New Login Detected"
- **Body**: "New login from iPhone 14 in Lilongwe, Malawi"
- **Priority**: HIGH
- **Action**: Opens device management

**Settings**:
- `NEVER` - No login alerts
- `NEW_DEVICE` - Only for first-time devices
- `ALWAYS` - All login attempts

---

### 5. Payment Due Reminder
**Trigger**: Payment due date approaching

```typescript
await AccountAlertService.triggerPaymentDueReminder(
  userId,
  accountNumber,
  paymentId: "PAY123",
  amount: "25000.00",
  currency: "MWK",
  dueDate: "2025-12-20"
);
```

**Push Notification**:
- **Title**: "Payment Reminder"
- **Body**: "Payment of 25000.00 MWK is due on 2025-12-20"
- **Priority**: NORMAL
- **Action**: Opens payment details

---

## Alert Settings Integration

### User-Controlled Settings
Each alert type can be enabled/disabled per account:

```graphql
mutation UpdateAlertSettings {
  updateAccountAlertSettings(settings: {
    accountNumber: "1234567890"
    
    # Low Balance
    lowBalanceEnabled: true
    lowBalanceThreshold: "5000.00"
    lowBalanceChannels: [PUSH, SMS]
    
    # Large Transaction
    largeTransactionEnabled: true
    largeTransactionThreshold: "100000.00"
    largeTransactionChannels: [PUSH, SMS]
    largeTransactionDebitOnly: true  # Only alert on debits
    
    # Suspicious Activity
    alertUnusualLocation: true
    alertMultipleFailedAttempts: true
    alertNewDeviceTransaction: true
    suspiciousActivityChannels: [PUSH, SMS, EMAIL]
    
    # Payment Due
    paymentDueEnabled: true
    paymentDueChannels: [PUSH, SMS]
    paymentReminderInterval: ONE_DAY
    
    # Login Alerts
    loginAlertMode: NEW_DEVICE  # NEVER, NEW_DEVICE, ALWAYS
    loginAlertChannels: [PUSH, EMAIL]
    
    # Quiet Hours
    quietHoursEnabled: true
    quietHoursStart: "22:00"
    quietHoursEnd: "08:00"
  }) {
    id
    lowBalanceEnabled
    largeTransactionEnabled
  }
}
```

---

## Automatic Notification Channels

The system respects user preferences for notification channels:

| Alert Type | Default Channels | Can Customize |
|------------|------------------|---------------|
| Low Balance | PUSH | Yes - PUSH, SMS, EMAIL |
| Large Transaction | PUSH, SMS | Yes |
| Suspicious Activity | PUSH, SMS, EMAIL | Yes |
| Payment Due | PUSH, SMS | Yes |
| Login | PUSH, EMAIL | Yes |

---

## Integration Points

### 1. Transaction Processing
When processing transactions, check thresholds and trigger alerts:

```typescript
// After transaction completes
const account = await getAccount(accountNumber);

// Check large transaction
if (amount > largeTransactionThreshold) {
  await AccountAlertService.triggerLargeTransactionAlert(
    userId,
    accountNumber,
    transactionId,
    amount,
    currency,
    type,
    description
  );
}

// Check low balance
if (newBalance < lowBalanceThreshold) {
  await AccountAlertService.triggerLowBalanceAlert(
    userId,
    accountNumber,
    newBalance,
    currency,
    threshold
  );
}
```

### 2. Authentication/Login
After successful login, trigger login alert:

```typescript
// After successful authentication
await AccountAlertService.triggerLoginAlert(
  userId,
  deviceName,
  deviceId,
  location,
  ipAddress
);
```

### 3. Fraud Detection
When suspicious activity is detected:

```typescript
if (riskScore > threshold) {
  await AccountAlertService.triggerSuspiciousActivityAlert(
    userId,
    accountNumber,
    reason: "Multiple failed transactions",
    details: {
      failedCount: 5,
      deviceId,
      ipAddress,
      location
    },
    riskScore
  );
}
```

### 4. Payment System
Send reminders before due date:

```typescript
// Cron job or scheduled task
const upcomingPayments = await getUpcomingPayments();

for (const payment of upcomingPayments) {
  await AccountAlertService.triggerPaymentDueReminder(
    payment.userId,
    payment.accountNumber,
    payment.id,
    payment.amount,
    payment.currency,
    payment.dueDate
  );
}
```

---

## Testing

### Test Low Balance Alert
```graphql
mutation {
  testAlert(
    accountNumber: "1234567890"
    alertType: "LOW_BALANCE"
  )
}
```

### Test Large Transaction Alert
```graphql
mutation {
  testAlert(
    accountNumber: "1234567890"
    alertType: "LARGE_TRANSACTION"
  )
}
```

### Test Suspicious Activity Alert
```graphql
mutation {
  testAlert(
    accountNumber: "1234567890"
    alertType: "SUSPICIOUS_ACTIVITY"
  )
}
```

### Test Login Alert
```graphql
mutation {
  testAlert(
    accountNumber: "1234567890"
    alertType: "ACCOUNT_LOGIN"
  )
}
```

---

## Mobile App Integration

### Display Alert in App
```dart
// Handle push notification data
void handleNotification(RemoteMessage message) {
  final data = message.data;
  final type = data['type'];
  final actionUrl = data['actionUrl'];
  final actionData = jsonDecode(data['actionData']);
  
  if (type == 'ACCOUNT_ALERT') {
    final alertType = actionData['alertType'];
    final accountNumber = actionData['accountNumber'];
    
    // Navigate to appropriate screen
    if (alertType == 'LOW_BALANCE') {
      navigateToAccount(accountNumber);
    } else if (alertType == 'SUSPICIOUS_ACTIVITY') {
      showSecurityAlert(actionData);
    }
  }
}
```

### Query Alert History
```graphql
query GetMyAlerts($accountNumber: String!) {
  accountAlerts(
    accountNumber: $accountNumber
    limit: 50
  ) {
    alerts {
      id
      alertType
      alertData
      status
      triggeredAt
      acknowledgedAt
      userAction
    }
    totalCount
  }
}
```

### Acknowledge Alert
```graphql
mutation AcknowledgeAlert($alertId: ID!, $action: String) {
  acknowledgeAlert(
    alertId: $alertId
    action: $action  # DISMISSED, THIS_WAS_ME, REPORT_FRAUD
  )
}
```

---

## Alert Lifecycle

1. **Trigger**: Event occurs (low balance, large transaction, etc.)
2. **Check Settings**: Verify alert is enabled for user
3. **Create Record**: Store in `account_alerts` table
4. **Determine Channels**: Based on user preferences
5. **Send Notifications**: 
   - PUSH via Firebase
   - SMS via provider (if enabled)
   - EMAIL via SMTP (if enabled)
6. **Track Delivery**: Update status and timestamps
7. **User Action**: User acknowledges or dismisses
8. **Resolution**: For suspicious activity, admin reviews and resolves

---

## Database Schema

### AccountAlert Table
```sql
CREATE TABLE account_alerts (
  id SERIAL PRIMARY KEY,
  mobile_user_id INTEGER NOT NULL,
  account_number VARCHAR(20),
  alert_type VARCHAR(50) NOT NULL,
  alert_data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  channels_sent TEXT[] DEFAULT '{}',
  sent_at TIMESTAMP,
  delivery_status JSONB,
  acknowledged_at TIMESTAMP,
  user_action VARCHAR(20),
  triggered_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### SuspiciousActivityLog Table
```sql
CREATE TABLE suspicious_activity_logs (
  id SERIAL PRIMARY KEY,
  alert_id INTEGER,
  mobile_user_id INTEGER NOT NULL,
  account_number VARCHAR(20),
  suspicion_reason TEXT NOT NULL,
  risk_score INTEGER,
  detection_details JSONB,
  related_transaction_ids TEXT[],
  device_id TEXT,
  ip_address VARCHAR(45),
  location TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolution_action VARCHAR(50),
  admin_notes TEXT,
  detected_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Methods Added

### AccountAlertService
```typescript
// Trigger generic alert
triggerAlert(userId, accountNumber, alertType, alertData)

// Specific alert types
triggerLowBalanceAlert(userId, accountNumber, balance, currency, threshold)
triggerLargeTransactionAlert(userId, accountNumber, transactionId, amount, currency, type, description)
triggerSuspiciousActivityAlert(userId, accountNumber, reason, details, riskScore)
triggerLoginAlert(userId, deviceName, deviceId, location, ipAddress)
triggerPaymentDueReminder(userId, accountNumber, paymentId, amount, currency, dueDate)
```

### PushNotificationService (Extended)
```typescript
sendAccountAlert(userId, alertType, accountNumber, alertData)
sendLoginAlert(userId, deviceName, location, ipAddress)
sendPaymentDueReminder(userId, amount, currency, dueDate, paymentId)
```

---

## Security Considerations

1. **Suspicious Activity Logs**
   - All suspicious activity creates audit trail
   - Admin can review and take action
   - Risk scores help prioritize

2. **User Privacy**
   - Users control which alerts they receive
   - Users control which channels (PUSH, SMS, EMAIL)
   - Quiet hours respected

3. **Rate Limiting**
   - Prevent alert spam
   - Consolidate similar alerts
   - Respect quiet hours

4. **Data Privacy**
   - Sensitive data (amounts, balances) only in secure channels
   - Alert history encrypted
   - PII handled appropriately

---

## Performance

- **Asynchronous**: Alerts don't block main operations
- **Batch Processing**: Multiple alerts can be sent together
- **Channel Fallback**: If PUSH fails, try SMS/EMAIL
- **Retry Logic**: Failed notifications are retried
- **Invalid Token Cleanup**: Auto-remove invalid FCM tokens

---

## Next Steps

1. **Implement Transaction Monitoring**
   - Hook into transaction processing
   - Real-time balance checks
   - Threshold monitoring

2. **Fraud Detection Integration**
   - ML-based risk scoring
   - Pattern detection
   - Velocity checks

3. **Payment Reminder Scheduler**
   - Cron job for upcoming payments
   - Configurable reminder intervals
   - Multi-day reminders

4. **Analytics Dashboard**
   - Alert frequency
   - User engagement
   - False positive rates

---

## Files Modified

1. ✅ `lib/services/push-notification.ts` - Added account alert methods
2. ✅ `lib/services/account-alert.ts` - New alert service
3. ✅ `lib/graphql/schema/resolvers/accountAlert.ts` - Integrated push notifications

---

## Success Criteria

✅ Account alerts integrated with push notifications  
✅ User preferences respected  
✅ Multiple alert types supported  
✅ Suspicious activity logging  
✅ Login alerts  
✅ Payment reminders  
✅ Test mutations working  
✅ Automatic channel selection  
✅ Error handling  

**Status: READY FOR INTEGRATION** 🎉
