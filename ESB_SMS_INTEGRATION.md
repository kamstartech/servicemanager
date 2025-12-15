# ESB SMS Gateway Integration

This document describes the SMS integration with FDH ESB Gateway for the Next.js application.

## Overview

The SMS service uses the **FDH ESB Gateway** which routes SMS messages through the Elixir backend's established SMS infrastructure. This provides a single, unified SMS gateway for the entire application.

## Architecture

```
Next.js App → ESB Gateway → SMS Provider (configured in ESB)
```

The ESB handles:
- SMS provider routing
- Message queuing
- Delivery tracking
- Error handling
- Provider failover

## Configuration

### Environment Variables

Add these to your `.env.local` file (all have defaults):

```bash
# ESB SMS Gateway Configuration
ESB_SMS_URL=https://fdh-esb.ngrok.dev/esb/sent-messages/v1/sent-messages
ESB_USERNAME=admin
ESB_PASSWORD=admin
ESB_CLIENT_ID=d79b32b5-b9a8-41de-b215-b038a913f619
```

**Note**: All values have defaults matching the Elixir backend configuration, so no env vars are required for development.

## API Structure

### ESB Request Format

The service sends requests in this format:

```json
{
  "client": "d79b32b5-b9a8-41de-b215-b038a913f619",
  "message": "Your message text",
  "phoneNumber": "260977396223"
}
```

### ESB Response Format

Success:
```json
{
  "messageId": "abc123",
  "status": "sent"
}
```

Error:
```json
{
  "message": "There is no rule matching the destination 260977396223"
}
```

## Usage Examples

### 1. Send Simple SMS

```typescript
import { ESBSMSService } from '@/lib/services/sms';

const result = await ESBSMSService.sendSMS(
  '260977396223',
  'Hello from Next.js!'
);

if (result.success) {
  console.log('SMS sent:', result.messageId);
} else {
  console.error('SMS failed:', result.error);
}
```

### 2. Send OTP

```typescript
const result = await ESBSMSService.sendOTP(
  '260977396223',
  '123456'
);
```

### 3. Send Account Alert

```typescript
const result = await ESBSMSService.sendAccountAlert(
  '260977396223',
  'LOW_BALANCE',
  {
    balance: '100',
    currency: 'ZMW',
    threshold: '500'
  }
);
```

### 4. Send Transaction Notification

```typescript
const result = await ESBSMSService.sendTransactionNotification(
  '260977396223',
  '1000',      // amount
  'ZMW',       // currency
  'CREDIT',    // type
  '5000'       // new balance (optional)
);
```

### 5. Send Password Reset

```typescript
const result = await ESBSMSService.sendPasswordReset(
  '260977396223',
  'RESET123'
);
```

### 6. Send Welcome Message

```typescript
const result = await ESBSMSService.sendWelcome(
  '260977396223',
  'John Doe'
);
```

## API Endpoint

### Send SMS via API

```bash
curl -X POST http://localhost:3000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "260977396223",
    "message": "Test message",
    "type": "generic"
  }'
```

### API Types

- `generic` - Simple text message
- `otp` - One-time password
- `alert` - Account alert
- `transaction` - Transaction notification
- `password_reset` - Password reset code
- `welcome` - Welcome message

### API Examples

**Send OTP:**
```bash
curl -X POST http://localhost:3000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "260977396223",
    "otp": "123456",
    "type": "otp"
  }'
```

**Send Alert:**
```bash
curl -X POST http://localhost:3000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "260977396223",
    "alertType": "LOW_BALANCE",
    "alertData": {
      "balance": "100",
      "currency": "ZMW",
      "threshold": "500"
    },
    "type": "alert"
  }'
```

**Send Transaction:**
```bash
curl -X POST http://localhost:3000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "260977396223",
    "amount": "1000",
    "currency": "ZMW",
    "transactionType": "CREDIT",
    "balance": "5000",
    "type": "transaction"
  }'
```

## Testing

### Run Test Script

```bash
# Default phone number (260977396223)
npx tsx scripts/test-esb-sms.ts

# Custom phone number
npx tsx scripts/test-esb-sms.ts 260976123456
```

### Test in Docker

```bash
docker exec service_manager_adminpanel npx tsx scripts/test-esb-sms.ts
```

### Get API Documentation

```bash
curl http://localhost:3000/api/sms/send
```

## Integration with Account Alerts

The ESB SMS service is integrated with the Account Alert system:

```typescript
import { AccountAlertService } from '@/lib/services/account-alert';

// Will send via PUSH and/or SMS based on user preferences
await AccountAlertService.triggerLowBalanceAlert(
  userId,
  accountNumber,
  '100',
  'ZMW',
  '500'
);
```

## Phone Number Format

The ESB gateway accepts phone numbers in these formats:
- With country code: `260977396223`
- With + prefix: `+260977396223`

Both formats are supported by the service.

## Response Format

All methods return an `SMSResponse`:

```typescript
interface SMSResponse {
  success: boolean;      // true if sent successfully
  messageId?: string;    // ESB message ID
  status: 'sent' | 'failed' | 'pending';
  error?: string;        // Error message if failed
  details?: any;         // Full ESB response
}
```

## Error Handling

Common errors:

### No Routing Rule
```
Error: "There is no rule matching the destination 260977396223"
```
**Solution**: Contact ESB admin to add routing rule for the phone number.

### Connection Failed
```
Error: "fetch failed"
```
**Solution**: Check network connectivity to ESB gateway. Verify ESB_SMS_URL is correct.

### Unauthorized
```
Error: "Unauthorized"
```
**Solution**: Verify ESB_USERNAME and ESB_PASSWORD are correct.

## ESB Configuration

To configure SMS routing in the ESB:

1. Contact ESB administrator
2. Request routing rule for destination number pattern (e.g., `26097*`)
3. Specify SMS provider (Orbit Mobile, BulkSMS, etc.)
4. Test with configured number

## Production Deployment

### Prerequisites

1. ✅ ESB gateway accessible from production environment
2. ✅ ESB routing rules configured for production numbers
3. ✅ Valid ESB credentials
4. ✅ Network connectivity between Next.js and ESB

### Environment Variables

Set in production:

```bash
ESB_SMS_URL=https://your-production-esb.com/esb/sent-messages/v1/sent-messages
ESB_USERNAME=your_username
ESB_PASSWORD=your_password
ESB_CLIENT_ID=your_client_id
```

### Monitoring

Monitor SMS delivery by:
- Checking ESB logs
- Reviewing response status codes
- Setting up alerts for failed messages
- Tracking delivery rates

## Files Structure

```
lib/services/sms/
├── types.ts          # TypeScript interfaces
├── sms-service.ts    # ESB SMS service implementation
└── index.ts          # Exports

app/api/sms/send/     # REST API endpoint
scripts/test-esb-sms.ts  # Test script
```

## Benefits of ESB Gateway

- ✅ Centralized SMS routing
- ✅ Provider abstraction (change providers without code changes)
- ✅ Built-in retry logic
- ✅ Message queuing
- ✅ Delivery tracking
- ✅ Cost optimization
- ✅ Failover support

## Comparison with Direct Integration

| Feature | ESB Gateway | Direct Provider |
|---------|-------------|-----------------|
| Provider Management | Centralized | Per application |
| Routing Logic | In ESB | In application |
| Provider Switching | No code change | Code change needed |
| Message Queuing | Built-in | Custom implementation |
| Monitoring | Centralized | Per application |
| Cost Optimization | Shared | Individual |

## Troubleshooting

### Test ESB Connectivity

```bash
curl -X POST https://fdh-esb.ngrok.dev/esb/sent-messages/v1/sent-messages \
  -H "Authorization: Basic YWRtaW46YWRtaW4=" \
  -H "Content-Type: application/json" \
  -d '{
    "client": "d79b32b5-b9a8-41de-b215-b038a913f619",
    "message": "Test",
    "phoneNumber": "260977396223"
  }'
```

### Check ESB Configuration

1. Verify ESB is running
2. Check routing rules exist for test number
3. Verify SMS provider credentials in ESB
4. Test from Elixir backend first

### Get Help

If issues persist:
1. Check ESB logs
2. Verify network connectivity
3. Test with Elixir backend's SMS service
4. Contact ESB administrator

## Next Steps

1. **Configure ESB Routing**: Add routing rules for your phone numbers
2. **Test in Production**: Verify connectivity in production environment
3. **Monitor Usage**: Set up monitoring for SMS delivery rates
4. **Add Logging**: Implement application-level SMS logging if needed

## Support

For ESB-related issues:
- Check ESB documentation
- Contact ESB administrator
- Review ESB logs

For Next.js integration issues:
- Review this documentation
- Check test results in `SMS_TEST_RESULTS.md`
- Run test script: `npx tsx scripts/test-esb-sms.ts`
