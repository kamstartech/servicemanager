# Account Alerts - Phase 1 Implementation Summary

**Date**: 2025-12-13  
**Status**: ✅ Phase 1 Complete - Foundation Ready

## What Was Implemented

### 1. Database Schema (Prisma)

Created 3 main tables with proper enum types:

#### Enums Added:
- `AlertType` (5 values)
- `NotificationChannel` (3 values: PUSH, SMS, EMAIL)
- `AlertStatus` (4 values)
- `TransactionType` (2 values)
- `SuspicionReason` (3 values)
- `PaymentType` (4 values)
- `PaymentReminderInterval` (3 values)
- `LoginAlertMode` (3 values)
- `LoginMethod` (4 values)
- `UserAction` (4 values)
- `ResolutionAction` (3 values)

#### Tables:
1. **AccountAlertSettings** - User alert preferences per account
   - Low balance threshold & channels
   - Large transaction threshold & channels
   - Suspicious activity toggles (3 types)
   - Payment reminder interval (radio select)
   - Login alert mode (radio select)
   - Quiet hours settings

2. **AccountAlert** - History of triggered alerts
   - Alert type, status, delivery tracking
   - User acknowledgment and actions
   - JSON alert data for flexibility

3. **SuspiciousActivityLog** - Detailed security monitoring
   - Risk scoring
   - Resolution tracking
   - Admin notes

**Location**: `prisma/schema.prisma`

### 2. GraphQL Schema

Added to `lib/graphql/schema/typeDefs.ts`:
- All 11 enum types
- 3 main types: `AccountAlertSettings`, `AccountAlert`, `SuspiciousActivityLog`
- Input types for mutations
- 3 queries: `accountAlertSettings`, `accountAlerts`, `suspiciousActivities`
- 4 mutations: `updateAccountAlertSettings`, `acknowledgeAlert`, `testAlert`, `resolveSuspiciousActivity`

### 3. GraphQL Resolvers

Created `lib/graphql/schema/resolvers/accountAlert.ts`:

#### Queries:
- `accountAlertSettings(accountNumber)` - Get settings for an account
- `accountAlerts(...)` - Get alert history with filters
- `suspiciousActivities(...)` - Get suspicious activity logs

#### Mutations:
- `updateAccountAlertSettings(settings)` - Update/create alert preferences
- `acknowledgeAlert(alertId, action)` - Mark alert as acknowledged
- `testAlert(accountNumber, alertType)` - Send test notification
- `resolveSuspiciousActivity(logId, action, notes)` - Resolve security incidents

### 4. UI Implementation

#### Account Details Page - Alerts Section
**File**: `app/mobile-banking/accounts/[accountNumber]/page.tsx`

Added comprehensive **Account Alerts** card section with:
- **Low Balance Alert**: Toggle + threshold input
- **Large Transaction Alert**: Toggle + threshold input + "debit only" option
- **Suspicious Activity**: 3 independent toggles (unusual location, failed attempts, new device)
- **Payment Reminders**: Toggle + radio selection (1 week/3 days/1 day)
- **Login Notifications**: Radio selection (every login/new device/new location)
- Save button in card header to persist all changes at once
- Real-time form state management with React hooks
- Integrated into existing account view (no separate page needed)

## Key Features

### Type Safety
- ✅ All enums defined in Prisma
- ✅ TypeScript types auto-generated
- ✅ GraphQL enums match Prisma exactly
- ✅ No magic strings anywhere

### User Experience
- ✅ Clean, card-based UI
- ✅ Toggle switches for enable/disable
- ✅ Radio buttons for single-choice options
- ✅ Test functionality to verify channels
- ✅ Real-time form updates
- ✅ Loading and error states
- ✅ Form validation with visual feedback
- ✅ Red border highlights for invalid fields
- ✅ Inline error messages
- ✅ Validation on save attempt

### Data Integrity
- ✅ Unique constraint: (mobileUserId, accountNumber)
- ✅ Foreign keys with CASCADE delete
- ✅ Proper indexes for performance
- ✅ JSON fields for flexible alert data

## Files Created/Modified

### Created:
1. `lib/graphql/schema/resolvers/accountAlert.ts` (404 lines)
2. `ACCOUNT_ALERTS_IMPLEMENTATION.md` (full specification)
3. `ALERT_IMPLEMENTATION_SUMMARY.md` (implementation summary)

### Modified:
1. `prisma/schema.prisma` - Added 11 enums and 3 alert models
2. `lib/graphql/schema/typeDefs.ts` - Added alert types and queries/mutations  
3. `lib/graphql/schema/resolvers/index.ts` - Registered alert resolvers
4. `app/mobile-banking/accounts/[accountNumber]/page.tsx` - Added inline alerts section (~200 lines)

## Database Migration

**Status**: 🟡 Migration file needs to be created when database is available

To apply:
```bash
npx prisma migrate dev --name add_account_alerts
npx prisma generate
```

## Testing Checklist

### Manual Testing Required:
- [ ] Create alert settings for an account
- [ ] Update threshold values
- [ ] Toggle alert types on/off
- [ ] Change radio selections (payment interval, login mode)
- [ ] Test alert functionality (requires notification integration)
- [ ] View alert history
- [ ] Acknowledge alerts
- [ ] Resolve suspicious activities

### Integration Points:
- [ ] Connect to SMS service (existing SMSWorker)
- [ ] Connect to Push notification service (needs FCM)
- [ ] Connect to Email service (existing Swoosh)
- [ ] Implement alert triggers in transaction flow
- [ ] Implement alert triggers in auth flow
- [ ] Implement background job for payment reminders

## Next Phase: Alert Triggers

Phase 2 will implement the actual alert detection and notification sending:

1. **Low Balance Detection** - Hook into balance sync processor
2. **Large Transaction Detection** - Hook into transaction creation
3. **Login Detection** - Hook into auth resolver
4. **Suspicious Activity Detection** - Create pattern detection service
5. **Payment Due Detection** - Create Oban scheduled job

Each trigger will:
1. Check user's alert settings
2. Evaluate trigger conditions
3. Create alert record
4. Send notifications via configured channels
5. Log delivery status

## Notes

- All alert settings have sensible defaults
- Settings are per-account except security alerts (per-user)
- Failed login attempts cannot be disabled (security requirement)
- Test functionality creates dummy alerts without actual triggers
- Quiet hours not yet implemented in UI (future enhancement)
- **Alert settings are displayed inline** on the account details page (no separate page needed)
- All 5 alert types configured in one unified section with a single Save button

## References

- Full spec: `ACCOUNT_ALERTS_IMPLEMENTATION.md`
- Prisma schema: `prisma/schema.prisma`
- GraphQL types: `lib/graphql/schema/typeDefs.ts`
- Resolvers: `lib/graphql/schema/resolvers/accountAlert.ts`
- UI: `app/mobile-banking/accounts/[accountNumber]/alerts/page.tsx`

## Form Validation

### Validation Rules:

1. **Low Balance Threshold**
   - Required when low balance alert is enabled
   - Must be greater than 0
   - Shows red border and error message if invalid

2. **Large Transaction Threshold**
   - Required when large transaction alert is enabled
   - Must be greater than 0
   - Shows red border and error message if invalid

3. **Payment Reminder Interval**
   - Required when payment reminders are enabled
   - Must select one option: ONE_WEEK, THREE_DAYS, or ONE_DAY
   - Shows error message below radio group if not selected

4. **Login Alert Mode**
   - Always required
   - Must select one option: EVERY_LOGIN, NEW_DEVICE, or NEW_LOCATION
   - Shows error message below radio group if not selected

### Validation Behavior:

- ✅ Validation runs when user clicks "Save" button
- ✅ All errors displayed simultaneously
- ✅ Red border highlights invalid input fields
- ✅ Error messages appear below each invalid field
- ✅ Alert dialog summarizes validation status
- ✅ Errors clear automatically when user corrects the field
- ✅ Form won't submit until all validation passes


## Alert Settings Background Service

### Overview
A cron job service that automatically creates default alert settings for all accounts.

### Service Details

**File**: `lib/services/background/alert-settings.ts`

**Schedule**: Runs every 6 hours (configurable via `ALERT_SETTINGS_INTERVAL`)

**Batch Size**: Processes 100 accounts per run (configurable via `ALERT_SETTINGS_BATCH_SIZE`)

### How It Works

1. **Service starts** with the app via `instrumentation.ts`
2. **Initial run** after 1 minute (lets other services start first)
3. **Periodic checks** every 6 hours
4. **Process flow**:
   - Queries all active mobile banking accounts
   - Checks if alert settings exist for each account
   - Creates default settings for accounts without them
   - Skips accounts that already have settings
   - Logs all operations

### Integration Points

- **Triggered by**: Node.js runtime startup (instrumentation.ts)
- **Works with**: Account sync from T24
- **Creates defaults from**: Prisma schema defaults
- **Logs to**: Console (searchable in production logs)

### Default Values Created

When settings are created, they use Prisma schema defaults:
- `lowBalanceEnabled: true`
- `lowBalanceThreshold: null` (user must set)
- `largeTransactionEnabled: true`
- `largeTransactionThreshold: null` (user must set)
- `paymentReminderInterval: ONE_DAY`
- `loginAlertMode: NEW_DEVICE`
- All notification channels: `[PUSH, SMS, EMAIL]`

### Benefits

✅ **Automatic**: No manual intervention needed  
✅ **Scalable**: Handles bulk account sync  
✅ **Resilient**: Retries on next run if errors occur  
✅ **Efficient**: Only processes accounts without settings  
✅ **Safe**: Uses unique constraint to prevent duplicates  
✅ **Observable**: Comprehensive logging  

### Environment Variables

```bash
# Alert settings service interval (milliseconds)
ALERT_SETTINGS_INTERVAL=21600000  # 6 hours (default)

# Number of accounts to process per run
ALERT_SETTINGS_BATCH_SIZE=100  # default
```

### Manual Trigger

For testing or admin purposes:
```typescript
import { alertSettingsService } from '@/lib/services/background/alert-settings';

// Trigger manually
await alertSettingsService.triggerCreation();
```

### Service Lifecycle

```typescript
// Started automatically in instrumentation.ts
alertSettingsService.start();

// Can be stopped if needed
alertSettingsService.stop();

// Check status
const status = alertSettingsService.getStatus();
// { running: false, interval: 21600000 }
```

### Logs Example

```
🚀 Starting alert settings service...
   Check interval: 6h
   Batch size: 100 accounts
✅ Alert settings service started

🔔 Starting alert settings creation...
   Found 50 active accounts to check
   ✅ Created alert settings for account A000123
   ✅ Created alert settings for account A000124
✅ Alert settings creation completed
   Accounts checked: 50
   Settings created: 2
   Errors: 0
```

### Error Handling

- Individual account errors are caught and logged
- Service continues processing remaining accounts
- Failed accounts will be retried on next run
- Stats track success/failure counts

### Testing

When database is available:
1. Start the app
2. Wait 1 minute for initial run
3. Check logs for alert settings creation
4. Verify settings in database
5. Confirm UI shows settings for accounts

