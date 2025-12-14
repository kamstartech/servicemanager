# Registration Workflow - Quick Reference

## Status Flow

```
PENDING → (New User) → APPROVED → COMPLETED ✅
         ↘ FAILED (can retry) → APPROVED → COMPLETED
         ↘ (Duplicate - Same Info) → DUPLICATE ❌ (final state)
         ↘ (Duplicate - Updated Info) → COMPLETED ✅ (immediate)
```

## API Quick Reference

### Create Registration
```bash
POST /api/registrations
Body: {
  phone_number: "260971234567",
  customer_number: "C123456",
  # Optional: email, name, profile_type, company
}
```

### List Registrations
```bash
GET /api/registrations?status=PENDING&page=1&pageSize=20
```

### Get Details
```bash
GET /api/registrations/42
```

### Validate Customer
```bash
POST /api/registrations/42/process
Body: { processedBy: 1, notes: "..." }
```

### Update Status
```bash
PATCH /api/registrations/42
Body: { status: "COMPLETED", mobileUserId: 789 }
```

## Status Meanings

- **PENDING** - New request, awaiting validation
- **APPROVED** - Validated, accounts found, ready for cron processing (new users only)
- **COMPLETED** - User created successfully OR existing user updated
- **FAILED** - Validation failed (no accounts or error)
- **DUPLICATE** - User already exists with identical information (no changes needed)

## Validation Process

1. **Duplicate Check** - Check if user exists
   - If exists with same info → DUPLICATE (done)
   - If exists with different info → Update user → COMPLETED (done)
   - If new user → Continue to step 2
2. **T24 Lookup** - Fetch customer accounts from T24 (new users only)
3. **Account Validation** - Validate account data (new users only)
4. **Status Update** - Update to APPROVED with validation data (new users only)

## UI Navigation

- **List Page**: `/mobile-banking/registration-requests`
- **Detail Page**: `/mobile-banking/registration-requests/[id]`
- **Add Dialog**: Click "Add Registration" button

## Key Files

```
app/api/registrations/route.ts              # Create, List
app/api/registrations/[id]/route.ts         # Get, Update, Delete
app/api/registrations/[id]/process/route.ts # Validate
lib/services/t24/accounts.ts                # T24 integration
types/registration.ts                       # TypeScript types
types/process-stages.ts                     # Process stages
```

## Environment Variables

```env
T24_ESB_URL=https://fdh-esb.ngrok.dev
T24_USERNAME=your_username
T24_PASSWORD=your_password
```

## Common Operations

### Create via Admin UI
1. Go to Registration Requests page
2. Click "Add Registration"
3. Fill form (phone & customer number required)
4. Submit

### Validate Request
1. View registration detail
2. Click "Validate Customer"
3. System checks T24 for accounts
4. Status changes to APPROVED if accounts found

### Retry Failed Validation
1. Fix issue in T24 or system
2. Click "Validate Customer" again
3. Retry count increments

## Troubleshooting

**No accounts found**
- Verify customer exists in T24
- Check customer number format (e.g., C123456)
- Review T24 connection

**Duplicate with same info**
- User already exists in system
- No changes detected
- Status: DUPLICATE (no action taken)

**Duplicate with updated info**
- User exists but info changed
- System updates user automatically
- Status: COMPLETED immediately
- Updated fields shown in response

**T24 connection error**
- Check T24_ESB_URL
- Verify credentials
- Check network connectivity

## Next Steps

After APPROVED status:
1. Cron job picks up approved registrations
2. Creates user in Elixir service
3. Creates wallet accounts
4. Links accounts to user
5. Updates status to COMPLETED

---

For full documentation, see: **REGISTRATION_WORKFLOW_SUMMARY.md**
