# Checkbook Requests - Quick Reference

## Quick Commands

```bash
# Run migration
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Start dev server
npm run dev
```

## Access URL
```
http://localhost:3000/mobile-banking/checkbook-requests
```

## API Endpoints Quick Reference

```bash
# List all requests
GET /api/checkbook-requests?page=1&pageSize=20&status=PENDING

# Create request
POST /api/checkbook-requests
{
  "mobileUserId": 1,
  "accountNumber": "1234567890",
  "numberOfCheckbooks": 1,
  "collectionPoint": "Main Branch"
}

# Get single request
GET /api/checkbook-requests/1

# Update status
PATCH /api/checkbook-requests/1
{
  "status": "APPROVED"
}

# Delete request
DELETE /api/checkbook-requests/1
```

## Status Values

- `PENDING` - Initial state
- `APPROVED` - Admin approved
- `READY_FOR_COLLECTION` - Ready at branch
- `COLLECTED` - Customer collected
- `CANCELLED` - Request cancelled
- `REJECTED` - Request rejected

## Key Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema |
| `types/checkbook.ts` | TypeScript types |
| `app/api/checkbook-requests/route.ts` | List & Create API |
| `app/api/checkbook-requests/[id]/route.ts` | Get, Update, Delete API |
| `app/mobile-banking/checkbook-requests/page.tsx` | Admin UI |
| `components/admin-sidebar.tsx` | Navigation |
| `CHECKBOOK_REQUESTS_DOCUMENTATION.md` | Full docs |

## Database Schema

```sql
checkbook_requests (
  id SERIAL PRIMARY KEY,
  mobile_user_id INTEGER NOT NULL,
  account_number TEXT NOT NULL,
  number_of_checkbooks INTEGER DEFAULT 1,
  collection_point TEXT NOT NULL,
  status CheckbookRequestStatus DEFAULT 'PENDING',
  requested_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  approved_by INTEGER,
  ready_at TIMESTAMP,
  collected_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  rejected_at TIMESTAMP,
  notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
)
```

## Common Tasks

### Approve a Request
```typescript
await fetch(`/api/checkbook-requests/${id}`, {
  method: 'PATCH',
  body: JSON.stringify({ status: 'APPROVED' })
});
```

### Mark Ready for Collection
```typescript
await fetch(`/api/checkbook-requests/${id}`, {
  method: 'PATCH',
  body: JSON.stringify({ status: 'READY_FOR_COLLECTION' })
});
```

### Reject a Request
```typescript
await fetch(`/api/checkbook-requests/${id}`, {
  method: 'PATCH',
  body: JSON.stringify({ 
    status: 'REJECTED',
    rejectionReason: 'Insufficient documentation'
  })
});
```

## Testing Tips

1. Create a test request via API
2. Check it appears in the UI
3. Test status transitions
4. Verify timestamps are set correctly
5. Check filtering works
6. Test pagination with multiple records
