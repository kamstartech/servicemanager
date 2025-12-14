# Account Alerts Implementation

> **Target Audience**: Mobile Banking Customers  
> **Last Updated**: 2025-12-13  
> **Status**: Planning Phase

## Overview

Account alerts system to notify mobile banking customers of important account activities and conditions in real-time.

---

## Enums & Constants

### Alert Types
```typescript
enum AlertType {
  LOW_BALANCE = "LOW_BALANCE",
  LARGE_TRANSACTION = "LARGE_TRANSACTION",
  SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
  PAYMENT_DUE = "PAYMENT_DUE",
  ACCOUNT_LOGIN = "ACCOUNT_LOGIN"
}
```

### Notification Channels
```typescript
enum NotificationChannel {
  PUSH = "PUSH",
  SMS = "SMS",
  EMAIL = "EMAIL"
}
```

### Alert Status
```typescript
enum AlertStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  FAILED = "FAILED",
  ACKNOWLEDGED = "ACKNOWLEDGED"
}
```

### Transaction Types
```typescript
enum TransactionType {
  DEBIT = "DEBIT",
  CREDIT = "CREDIT"
}
```

### Suspicion Reasons
```typescript
enum SuspicionReason {
  UNUSUAL_LOCATION = "UNUSUAL_LOCATION",
  MULTIPLE_FAILED_ATTEMPTS = "MULTIPLE_FAILED_ATTEMPTS",
  NEW_DEVICE_TRANSACTION = "NEW_DEVICE_TRANSACTION"
}
```

### Payment Types
```typescript
enum PaymentType {
  BILL = "BILL",
  LOAN = "LOAN",
  SUBSCRIPTION = "SUBSCRIPTION",
  RECURRING = "RECURRING"
}
```

### Payment Reminder Intervals
```typescript
enum PaymentReminderInterval {
  ONE_WEEK = "ONE_WEEK",      // 7 days before
  THREE_DAYS = "THREE_DAYS",  // 3 days before
  ONE_DAY = "ONE_DAY"         // 1 day before
}
```

### Login Alert Modes
```typescript
enum LoginAlertMode {
  EVERY_LOGIN = "EVERY_LOGIN",
  NEW_DEVICE = "NEW_DEVICE",
  NEW_LOCATION = "NEW_LOCATION"
}
```

### Login Methods
```typescript
enum LoginMethod {
  PASSWORD = "PASSWORD",
  BIOMETRIC = "BIOMETRIC",
  PASSKEY = "PASSKEY",
  OTP = "OTP"
}
```

### User Actions
```typescript
enum UserAction {
  DISMISSED = "DISMISSED",
  THIS_WAS_ME = "THIS_WAS_ME",
  REPORT_FRAUD = "REPORT_FRAUD",
  QUICK_PAY = "QUICK_PAY"
}
```

### Resolution Actions (for suspicious activity)
```typescript
enum ResolutionAction {
  CONFIRMED_LEGITIMATE = "CONFIRMED_LEGITIMATE",
  FRAUD_REPORTED = "FRAUD_REPORTED",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED"
}
```

---

## Alert Types & Field Definitions

### 1. Low Balance Alert

**Purpose**: Notify customer when account balance falls below their configured threshold

**Trigger Point**: After any transaction that reduces balance, or during T24 balance sync

**Fields Needed**:
```typescript
{
  alertType: AlertType.LOW_BALANCE,
  accountNumber: string,
  mobileUserId: number,
  threshold: Decimal,
  currentBalance: Decimal,
  currency: string,
  isEnabled: boolean,
  notificationChannels: NotificationChannel[],
  createdAt: DateTime,
  triggeredAt: DateTime,
}
```

**Configuration Fields** (per account):
- `lowBalanceThreshold: Decimal` (default: 5000 MWK or equivalent)
- `lowBalanceEnabled: boolean` (default: true)
- `lowBalanceChannels: NotificationChannel[]` (default: [NotificationChannel.PUSH])

**Business Rules**:
- Only trigger once per day (avoid spam if balance stays low)
- Don't trigger if balance increases above threshold then drops again within 24hrs
- Respect user's quiet hours (if configured)

---

### 2. Large Transaction Alert

**Purpose**: Notify customer when a single transaction exceeds configured threshold for security

**Trigger Point**: During transaction creation in `TransactionsContext`

**Fields Needed**:
```typescript
{
  alertType: AlertType.LARGE_TRANSACTION,
  accountNumber: string,
  mobileUserId: number,
  threshold: Decimal,
  transactionAmount: Decimal,
  transactionType: TransactionType,
  transactionId: string,
  transactionReference: string,
  transactionDescription: string,
  currency: string,
  isEnabled: boolean,
  notificationChannels: NotificationChannel[],
  createdAt: DateTime,
  triggeredAt: DateTime,
}
```

**Configuration Fields** (per account):
- `largeTransactionThreshold: Decimal` (default: 50000 MWK or equivalent)
- `largeTransactionEnabled: boolean` (default: true)
- `largeTransactionChannels: NotificationChannel[]` (default: [NotificationChannel.PUSH, NotificationChannel.SMS])
- `applyToDebitOnly: boolean` (default: true)

**Business Rules**:
- Alert on both debit and credit (unless `applyToDebitOnly` is true)
- Always send immediately (critical security alert)
- Include transaction details for verification

---

### 3. Suspicious Activity Alert

**Purpose**: Detect and notify unusual patterns that may indicate fraud

**Trigger Point**: Real-time during transaction/login, or pattern detection service

**Fields Needed**:
```typescript
{
  alertType: AlertType.SUSPICIOUS_ACTIVITY,
  accountNumber: string,
  mobileUserId: number,
  suspicionReason: SuspicionReason,
  suspicionDetails: JSON,
  relatedTransactionIds: string[],
  deviceId: string,
  location: string,
  ipAddress: string,
  detectedAt: DateTime,
  notificationChannels: NotificationChannel[],
  actionRequired: boolean,
  createdAt: DateTime,
  triggeredAt: DateTime,
}
```

**Configuration Fields** (per user):
- `alertUnusualLocation: boolean` (default: true)
- `alertMultipleFailedAttempts: boolean` (default: true)
- `alertNewDeviceTransaction: boolean` (default: true)
- `suspiciousActivityChannels: NotificationChannel[]` (default: [NotificationChannel.PUSH, NotificationChannel.SMS, NotificationChannel.EMAIL])

**Suspicious Patterns (User Configurable)**:
1. **SuspicionReason.UNUSUAL_LOCATION**: Transaction from location >100km from usual locations
2. **SuspicionReason.MULTIPLE_FAILED_ATTEMPTS**: >3 failed login attempts in 10 minutes
3. **SuspicionReason.NEW_DEVICE_TRANSACTION**: Transaction initiated from previously unseen device

**Business Rules**:
- Send immediately when pattern detected
- User can toggle individual patterns on/off
- Include action buttons: "This was me" / "Report fraud"
- Log all suspicious activities for audit
- Failed attempts alert cannot be disabled (security requirement)

---

### 4. Payment Due Alert

**Purpose**: Remind customer of upcoming bill payments, loan installments, or recurring charges

**Trigger Point**: Scheduled Oban job running daily at 8am

**Fields Needed**:
```typescript
{
  alertType: AlertType.PAYMENT_DUE,
  accountNumber: string,
  mobileUserId: number,
  paymentType: PaymentType,
  paymentDescription: string,
  amountDue: Decimal,
  currency: string,
  dueDate: DateTime,
  reminderInterval: PaymentReminderInterval,
  beneficiaryName: string,
  beneficiaryReference: string,
  isEnabled: boolean,
  notificationChannels: NotificationChannel[],
  createdAt: DateTime,
  triggeredAt: DateTime,
}
```

**Configuration Fields** (per user):
- `paymentDueEnabled: boolean` (default: true)
- `paymentDueChannels: NotificationChannel[]` (default: [NotificationChannel.PUSH, NotificationChannel.SMS])
- `paymentReminderInterval: PaymentReminderInterval` (default: PaymentReminderInterval.ONE_DAY)

**Reminder Intervals (Single Choice)**:
1. **PaymentReminderInterval.ONE_WEEK** - Single reminder 7 days before due date
2. **PaymentReminderInterval.THREE_DAYS** - Single reminder 3 days before due date
3. **PaymentReminderInterval.ONE_DAY** - Single reminder 1 day before due date

**Business Rules**:
- User selects ONE reminder interval (radio button selection)
- Reminder sent at 8am local time on the selected day
- Mark as "SENT" after sending to avoid duplicates
- Include quick-pay action button in notification

**Data Source**:
- Scheduled payments from `Beneficiaries` table (if exists)
- Loan schedule from T24 integration
- Bill payment history patterns

---

### 5. Account Login Alert

**Purpose**: Notify customer of login activity for security monitoring

**Trigger Point**: In auth resolver after successful login

**Fields Needed**:
```typescript
{
  alertType: AlertType.ACCOUNT_LOGIN,
  mobileUserId: number,
  deviceId: string,
  deviceName: string,
  deviceModel: string,
  deviceOs: string,
  ipAddress: string,
  location: string,
  loginMethod: LoginMethod,
  isNewDevice: boolean,
  isNewLocation: boolean,
  loginTimestamp: DateTime,
  notificationChannels: NotificationChannel[],
  createdAt: DateTime,
  triggeredAt: DateTime,
}
```

**Configuration Fields** (per user):
- `loginAlertMode: LoginAlertMode` (default: LoginAlertMode.NEW_DEVICE)
- `loginAlertChannels: NotificationChannel[]` (default: [NotificationChannel.PUSH, NotificationChannel.EMAIL])

**Alert Modes (Single Choice)**:
1. **LoginAlertMode.EVERY_LOGIN** - Alert on every successful login
2. **LoginAlertMode.NEW_DEVICE** - Alert only when logging in from new device
3. **LoginAlertMode.NEW_LOCATION** - Alert when login from location >100km from previous

**Business Rules**:
- User selects ONE mode (radio button selection)
- "Every Login" sends alert for all logins
- "New Device" triggers on first login from device (tracked by deviceId)
- "New Location" triggers when location differs significantly from history
- Include "Not you?" action button for immediate account lockdown
- Device/location tracked in `device_login_attempt` table

---

## Database Schema

### Primary Tables

#### 1. `AccountAlertSettings`
User's alert preferences per account

```sql
-- Enum Types
CREATE TYPE alert_type_enum AS ENUM (
  'LOW_BALANCE',
  'LARGE_TRANSACTION',
  'SUSPICIOUS_ACTIVITY',
  'PAYMENT_DUE',
  'ACCOUNT_LOGIN'
);

CREATE TYPE alert_channel AS ENUM (
  'PUSH',
  'SMS',
  'EMAIL'
);

CREATE TYPE alert_status_enum AS ENUM (
  'PENDING',
  'SENT',
  'FAILED',
  'ACKNOWLEDGED'
);

CREATE TYPE transaction_type_enum AS ENUM (
  'DEBIT',
  'CREDIT'
);

CREATE TYPE suspicion_reason_enum AS ENUM (
  'UNUSUAL_LOCATION',
  'MULTIPLE_FAILED_ATTEMPTS',
  'NEW_DEVICE_TRANSACTION'
);

CREATE TYPE payment_type_enum AS ENUM (
  'BILL',
  'LOAN',
  'SUBSCRIPTION',
  'RECURRING'
);

CREATE TYPE payment_reminder_interval_enum AS ENUM (
  'ONE_WEEK',
  'THREE_DAYS',
  'ONE_DAY'
);

CREATE TYPE login_alert_mode_enum AS ENUM (
  'EVERY_LOGIN',
  'NEW_DEVICE',
  'NEW_LOCATION'
);

CREATE TYPE login_method_enum AS ENUM (
  'PASSWORD',
  'BIOMETRIC',
  'PASSKEY',
  'OTP'
);

CREATE TYPE user_action_enum AS ENUM (
  'DISMISSED',
  'THIS_WAS_ME',
  'REPORT_FRAUD',
  'QUICK_PAY'
);

CREATE TYPE resolution_action_enum AS ENUM (
  'CONFIRMED_LEGITIMATE',
  'FRAUD_REPORTED',
  'ACCOUNT_LOCKED'
);

CREATE TABLE account_alert_settings (
  id SERIAL PRIMARY KEY,
  mobile_user_id INTEGER NOT NULL REFERENCES mobile_users(id),
  account_number VARCHAR(20) NOT NULL,
  
  -- Low Balance Alert
  low_balance_enabled BOOLEAN DEFAULT true,
  low_balance_threshold DECIMAL(19,4),
  low_balance_channels alert_channel[] DEFAULT '{PUSH}',
  
  -- Large Transaction Alert
  large_transaction_enabled BOOLEAN DEFAULT true,
  large_transaction_threshold DECIMAL(19,4),
  large_transaction_channels alert_channel[] DEFAULT '{PUSH,SMS}',
  large_transaction_debit_only BOOLEAN DEFAULT true,
  
  -- Suspicious Activity Alert (user-level, but stored here for convenience)
  alert_unusual_location BOOLEAN DEFAULT true,
  alert_multiple_failed_attempts BOOLEAN DEFAULT true,
  alert_new_device_transaction BOOLEAN DEFAULT true,
  suspicious_activity_channels alert_channel[] DEFAULT '{PUSH,SMS,EMAIL}',
  
  -- Payment Due Alert
  payment_due_enabled BOOLEAN DEFAULT true,
  payment_due_channels alert_channel[] DEFAULT '{PUSH,SMS}',
  payment_reminder_interval payment_reminder_interval_enum DEFAULT 'ONE_DAY',
  
  -- Login Alert (user-level)
  login_alert_mode login_alert_mode_enum DEFAULT 'NEW_DEVICE',
  login_alert_channels alert_channel[] DEFAULT '{PUSH,EMAIL}',
  
  -- Quiet Hours (optional)
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(mobile_user_id, account_number)
);

CREATE INDEX idx_alert_settings_user ON account_alert_settings(mobile_user_id);
CREATE INDEX idx_alert_settings_account ON account_alert_settings(account_number);
```

#### 2. `AccountAlerts`
History of triggered alerts

```sql
CREATE TABLE account_alerts (
  id SERIAL PRIMARY KEY,
  mobile_user_id INTEGER NOT NULL REFERENCES mobile_users(id),
  account_number VARCHAR(20),
  alert_type alert_type_enum NOT NULL,
  
  -- Alert Context (JSON for flexibility)
  alert_data JSONB NOT NULL,
  
  -- Status
  status alert_status_enum DEFAULT 'PENDING',
  
  -- Delivery Tracking
  channels_sent alert_channel[],
  sent_at TIMESTAMP,
  delivery_status JSONB,
  
  -- User Interaction
  acknowledged_at TIMESTAMP,
  user_action user_action_enum,
  
  -- Timestamps
  triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_user ON account_alerts(mobile_user_id);
CREATE INDEX idx_alerts_account ON account_alerts(account_number);
CREATE INDEX idx_alerts_type ON account_alerts(alert_type);
CREATE INDEX idx_alerts_status ON account_alerts(status);
CREATE INDEX idx_alerts_triggered_at ON account_alerts(triggered_at);
```

#### 3. `SuspiciousActivityLog`
Detailed logging for security monitoring

```sql
CREATE TABLE suspicious_activity_log (
  id SERIAL PRIMARY KEY,
  alert_id INTEGER REFERENCES account_alerts(id),
  mobile_user_id INTEGER NOT NULL REFERENCES mobile_users(id),
  account_number VARCHAR(20),
  
  -- Detection Details
  suspicion_reason suspicion_reason_enum NOT NULL,
  risk_score INTEGER NOT NULL,
  detection_details JSONB NOT NULL,
  
  -- Related Data
  related_transaction_ids TEXT[],
  device_id VARCHAR(255),
  ip_address VARCHAR(45),
  location VARCHAR(255),
  
  -- Resolution
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  resolution_action resolution_action_enum,
  admin_notes TEXT,
  
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_suspicious_user ON suspicious_activity_log(mobile_user_id);
CREATE INDEX idx_suspicious_risk ON suspicious_activity_log(risk_score);
CREATE INDEX idx_suspicious_resolved ON suspicious_activity_log(is_resolved);
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)
- [x] Create database migrations for alert tables
- [x] Add Prisma schema definitions
- [x] Create alert settings GraphQL types and resolvers
- [x] Build UI for alert settings on account details page

### Phase 2: Low Balance Alert (Week 1)
- [ ] Implement low balance detection in balance sync
- [ ] Create alert trigger service
- [ ] Integrate notification channels (SMS, Push, Email)
- [ ] Test end-to-end flow

### Phase 3: Large Transaction Alert (Week 2)
- [ ] Add alert check in transaction creation flow
- [ ] Implement threshold validation
- [ ] Create transaction alert notifications
- [ ] Test with various transaction scenarios

### Phase 4: Account Login Alert (Week 2)
- [ ] Enhance auth resolver with alert logic
- [ ] Implement device/location tracking
- [ ] Create login notification service
- [ ] Add "Not you?" quick action

### Phase 5: Suspicious Activity Detection (Week 3)
- [ ] Design pattern detection algorithms
- [ ] Create background processor for analysis
- [ ] Implement risk scoring system
- [ ] Build fraud reporting workflow

### Phase 6: Payment Due Alert (Week 3)
- [ ] Create Oban scheduled job
- [ ] Integrate with beneficiaries/loan data
- [ ] Implement reminder interval logic
- [ ] Add quick-pay actions

### Phase 7: Admin Dashboard (Week 4)
- [ ] Add alert history view to account details
- [ ] Create alert analytics dashboard
- [ ] Build alert management tools
- [ ] Add fraud investigation tools

---

## Notification Channels

### SMS Integration
- **Existing**: `ServiceManager.Services.Notification.SMSWorker`
- **Format**: "Alert: Your account {account_number} balance is below {threshold}. Current: {balance}. Reply STOP to unsubscribe."

### Push Notifications
- **Implementation Needed**: Firebase Cloud Messaging (FCM) or similar
- **Payload**: Include alert_id, type, action buttons

### Email Integration
- **Existing**: Swoosh mailer
- **Template**: HTML email with alert details and action buttons

### In-App Notifications
- **Storage**: Store in `account_alerts` table
- **Display**: Badge count, notification center in mobile app

---

## Security Considerations

1. **Rate Limiting**: Prevent alert spam (max 10 alerts per user per hour)
2. **PII Protection**: Mask sensitive data in notifications
3. **Authentication**: Require re-authentication for alert settings changes
4. **Audit Logging**: Log all alert triggers and user actions
5. **Fraud Prevention**: Suspicious activity alerts cannot be disabled
6. **Channel Verification**: Verify SMS/Email before enabling those channels

---

## Testing Checklist

- [ ] Low balance alert triggers correctly at threshold
- [ ] Large transaction alert respects debit-only setting
- [ ] Suspicious activity detects all pattern types
- [ ] Payment due reminder sends at correct interval (only one selected)
- [ ] Login alerts distinguish new vs. known devices
- [ ] Quiet hours are respected for non-critical alerts
- [ ] Notification channels deliver successfully
- [ ] User can acknowledge/dismiss alerts
- [ ] Settings persist correctly across sessions
- [ ] Admin can view user alert history

---

## Notes & Decisions

**Decision Log**:
- 2025-12-13: Alerts are for mobile banking customers, not admins
- 2025-12-13: Settings are per-account for balance/transaction alerts, per-user for security alerts
- 2025-12-13: Low balance and large transaction use threshold amounts
- 2025-12-13: Suspicious activity has 3 configurable booleans: unusual location, multiple failed attempts, new device transaction
- 2025-12-13: Payment due alerts - single choice: 1 week before OR 3 days before OR 1 day before
- 2025-12-13: Login alerts have 3 modes: every login, new device only, new location only (single selection)

**Open Questions**:
- [ ] Should we support custom alert rules (e.g., "alert me if transaction to specific beneficiary")?
- [ ] Integrate with existing Telegram notifications for critical security events?
- [ ] Should admins receive copies of high-risk suspicious activity alerts?
- [ ] Implement machine learning for suspicious activity detection in future?

---

## Related Files

- **Balance Sync**: `lib/service_manager/processors/UserBalanceSyncProcessor` (Elixir backend)
- **Transaction Context**: `.information/domain/transfer_system_analysis.md`
- **Auth Resolver**: `lib/graphql/schema/resolvers/auth.ts`
- **SMS Worker**: Backend service (Elixir)
- **Email Service**: Swoosh mailer (Elixir backend)

---

## API Endpoints Needed

### GraphQL Mutations
```graphql
# Update alert settings
updateAccountAlertSettings(
  accountNumber: String!
  settings: AccountAlertSettingsInput!
): AccountAlertSettings!

# Acknowledge alert
acknowledgeAlert(
  alertId: ID!
  action: String # "DISMISSED", "THIS_WAS_ME", "REPORT_FRAUD"
): Boolean!

# Test alert (for user to verify channels)
testAlert(
  accountNumber: String!
  alertType: String!
): Boolean!
```

### GraphQL Queries
```graphql
# Get alert settings
accountAlertSettings(accountNumber: String!): AccountAlertSettings

# Get alert history
accountAlerts(
  accountNumber: String
  alertType: String
  startDate: DateTime
  endDate: DateTime
  limit: Int
  offset: Int
): AccountAlertsResult!
```

---

**Implementation Status**: 🟡 Phase 1 Complete - Foundation Ready

**Next Steps**: 
1. ✅ Database schema created with Prisma
2. ✅ GraphQL types and resolvers implemented
3. ✅ Alert settings UI page created
4. ⏭️ Run database migration when DB is available
5. ⏭️ Begin Phase 2: Implement low balance detection service
