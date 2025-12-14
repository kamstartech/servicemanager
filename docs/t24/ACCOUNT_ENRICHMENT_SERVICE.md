# Account Enrichment Service

## Summary

Background service that automatically enriches account records with detailed information from T24, including account category, status, holder name, and other metadata.

## Problem

When accounts are discovered, they only contain the account number. Users and applications need additional information like:
- Account category (Platinum Current, Premium Savings, etc.)
- Account status (Active, Dormant, etc.)
- Holder name
- Opening date
- Online transaction limits
- Account nickname

Additionally, T24 account details include customer information that can be used to enrich **user profiles** with:
- First name and last name
- Email address
- Phone number
- Physical address
- City/Town

## Solution

The Account Enrichment Service automatically:
1. Identifies accounts missing detailed information
2. Fetches complete account details from T24 API
3. Updates database with enriched account data
4. **Creates or updates user profiles** with customer details from T24
5. Runs periodically to catch newly discovered accounts

## Implementation

### Service File
`lib/services/background/account-enrichment.ts`

### Database Schema
Added fields to `fdh_mobile_user_accounts`:
```sql
ALTER TABLE fdh_mobile_user_accounts ADD COLUMN
  category_id TEXT,
  category_name TEXT,
  account_status TEXT,
  holder_name TEXT,
  nick_name TEXT,
  online_limit TEXT,
  opening_date TEXT;
```

### T24 Integration
Uses `t24AccountDetailsService` to fetch account details:
```typescript
GET /api/esb/accounts/1.0/account/{account_number}
```

## Configuration

### Environment Variables
```env
# Account Enrichment Service (optional - defaults shown)
ACCOUNT_ENRICHMENT_INTERVAL="43200000"    # 12 hours in milliseconds
ACCOUNT_ENRICHMENT_BATCH_SIZE="20"        # Accounts per batch
```

### Intervals
| Interval | Milliseconds | Description |
|----------|--------------|-------------|
| **6 hours** | 21600000 | Frequent enrichment |
| **12 hours** | 43200000 | Default (recommended) |
| **24 hours** | 86400000 | Less frequent |

## How It Works

### Automatic Enrichment Flow
```
1. Timer triggers (every 12 hours)
2. Find accounts where categoryId IS NULL or categoryName IS NULL
3. Batch up to 20 accounts
4. For each account:
   a. Fetch details from T24
   b. Update database with enriched data
   c. Wait 2 seconds (rate limiting)
5. Log statistics
```

### Data Enriched
From T24 API response, the service extracts and stores:

**Account Details:**
- **categoryName**: "Platinum Current Account"
- **accountStatus**: "Active"
- **holderName**: "HELBERT CHIKWAWA"
- **nickName**: "NOLIMIT"
- **onlineLimit**: "NOLIMIT"
- **openingDate**: "2024-07-29"
- **currency**: "MWK"
- **categoryId**: Extracted from categoryName

**User Profile** (created/updated if missing):
- **firstName**: "HELBERT"
- **lastName**: "CHIKWAWA"
- **email**: "chikwawahelbert@gmail.com"
- **phone**: "265888067666"
- **address**: "NDIRANDE"
- **city**: "BLANTYRE"

## API Endpoints

### Get Account Details
```http
GET /api/services/account-details?accountNumber=1010100011629
```

**Response:**
```json
{
  "status": 0,
  "message": "Account details fetched successfully",
  "data": {
    "accountNumber": "1010100011629",
    "holderName": "HELBERT CHIKWAWA",
    "categoryName": "Platinum Current Account",
    "accountStatus": "Active",
    "currency": "MWK",
    "openingDate": "2024-07-29",
    "nickName": "NOLIMIT",
    "onlineLimit": "NOLIMIT",
    "customer": {
      "id": 29519407,
      "firstName": "HELBERT",
      "lastName": "CHIKWAWA",
      "phoneNumber": "265888067666",
      "email": "chikwawahelbert@gmail.com",
      "dateOfBirth": "1996-08-04",
      "street": "NDIRANDE",
      "town": "BLANTYRE",
      "maritalStatus": "SINGLE",
      "employmentStatus": "EMPLOYED"
    }
  }
}
```

### Check Service Status
```http
GET /api/services/status
```

**Response includes:**
```json
{
  "success": true,
  "services": {
    "accountEnrichment": {
      "running": true,
      "enriching": false,
      "interval": 43200000,
      "intervalHours": 12
    }
  }
}
```

## Usage Example

### Query Enriched Accounts
```typescript
import { prisma } from '@/lib/db/prisma';

// Get accounts with category information
const accounts = await prisma.mobileUserAccount.findMany({
  where: {
    mobileUserId: userId,
    isActive: true,
    categoryName: { not: null } // Only enriched accounts
  },
  select: {
    accountNumber: true,
    categoryName: true,
    accountStatus: true,
    holderName: true,
    balance: true,
    currency: true,
  }
});
```

### Manual Enrichment
```typescript
import { accountEnrichmentService } from '@/lib/services/background/account-enrichment';

// Enrich specific account
const success = await accountEnrichmentService.enrichAccountManual("1010100011629");
```

## Test Results

### Example Enrichment Run
```
🔍 Starting account enrichment...
   Found 17 accounts to enrich
   
   🔄 Enriching account 1010100011815...
   ✅ Fetched details for account 1010100011815
   📝 Updating user profile for user 55...
   ✅ Created profile for user 55
   ✅ Enriched account 1010100011815: Platinum Current Account
   
   ... (16 more accounts)
   
✅ Account enrichment complete:
   Accounts checked: 17
   Accounts enriched: 17
   Profiles updated: 1
   Errors: 0
```

## Rate Limiting

The service includes a 2-second delay between T24 API requests to avoid overloading the system:
```typescript
await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 seconds
```

For 20 accounts: ~40 seconds total processing time

## Benefits

### For Users
- ✅ Better account identification (category names visible)
- ✅ Account status visibility (Active/Dormant)
- ✅ Proper account holder names
- ✅ Transaction limit awareness
- ✅ **Auto-populated user profiles** (name, email, phone)

### For Applications
- ✅ Rich account metadata for display
- ✅ Category-based filtering/sorting
- ✅ Better UX with descriptive account names
- ✅ Status-based access control
- ✅ **Complete user profiles without manual data entry**

### For System
- ✅ Automatic enrichment (no manual intervention)
- ✅ Rate-limited (doesn't overload T24)
- ✅ Idempotent (safe to run multiple times)
- ✅ Batch processing (efficient)

## Monitoring

### Service Logs
```bash
# Check if service is running
docker logs service_manager_adminpanel | grep "account enrichment"

# Check enrichment progress
docker logs service_manager_adminpanel | grep "Enriched account"

# Check for errors
docker logs service_manager_adminpanel | grep "enrichment.*ERROR"
```

### Service Status
```bash
curl http://localhost:3000/api/services/status | jq '.services.accountEnrichment'
```

## Files

### Service Implementation
- `lib/services/background/account-enrichment.ts` - Main service
- `lib/services/t24/account-details.ts` - T24 API integration
- `app/api/services/account-details/route.ts` - API endpoint

### Configuration
- `instrumentation.ts` - Service startup
- `prisma/schema.prisma` - Database schema
- `.env` - Environment configuration

## Related Services

### Depends On
- **T24 Account Details API** - Fetches account information
- **Account Discovery Service** - Discovers accounts to enrich

### Works With
- **Balance Sync Service** - Syncs balances for enriched accounts
- **Mobile Banking API** - Exposes enriched account data

## Troubleshooting

### Issue: Accounts not being enriched
**Check:**
- Service is running: `GET /api/services/status`
- Accounts exist: Check database for accounts with `categoryName IS NULL`
- T24 API connectivity: Check logs for T24 errors

### Issue: Enrichment taking too long
**Solution:**
- Reduce `ACCOUNT_ENRICHMENT_BATCH_SIZE`
- Increase `ACCOUNT_ENRICHMENT_INTERVAL`
- Check T24 API response times

### Issue: Some accounts fail enrichment
**Cause:** Account might not exist in T24 or API error

**Check logs:**
```bash
docker logs service_manager_adminpanel | grep "Failed to enrich"
```

## Future Enhancements

1. **Retry Logic** - Retry failed enrichments with exponential backoff
2. **Priority Queue** - Prioritize newly discovered accounts
3. **Incremental Updates** - Re-enrich accounts periodically to catch status changes
4. **Webhook Support** - Trigger enrichment on account creation
5. **Metrics** - Add Prometheus metrics for enrichment success rates

## Production Checklist

- [ ] Set `ACCOUNT_ENRICHMENT_INTERVAL` based on account discovery frequency
- [ ] Set `ACCOUNT_ENRICHMENT_BATCH_SIZE` based on T24 API capacity
- [ ] Monitor enrichment success rate
- [ ] Set up alerts for enrichment failures
- [ ] Verify T24 API rate limits
- [ ] Test manual enrichment endpoint
- [ ] Document enriched fields for frontend teams

---

**Status:** ✅ Operational

**Last Updated:** 2025-12-13

**Related Documentation:**
- [Account Discovery Service](ACCOUNT_DISCOVERY_SERVICE.md)
- [T24 Account Details](T24_ACCOUNTS_ENDPOINT.md)
- [T24 Docker IPv6 Fix](T24_DOCKER_IPV6_FIX.md)
