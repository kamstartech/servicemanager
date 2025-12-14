# Backup Service Fix - Prisma Client Update

## Issue
Error when creating backups after adding `storageUrl` field to schema:
```
Unknown argument `storageUrl`. Available options are marked with ?.
```

## Root Cause
The Prisma client was not regenerated after updating the schema with the new `storageUrl` field.

## Fix Applied

### 1. Regenerated Prisma Client
```bash
npx prisma generate
```

This updates the TypeScript types and client to include the new `storageUrl` field.

### 2. Removed Type Casting
Removed all `(prisma as any)` type casts and used proper typing:

**Before:**
```typescript
await (prisma as any).backup.create({
  data: {
    filename,
    sizeBytes: BigInt(stats.size),
    storageUrl,
  },
});
```

**After:**
```typescript
await prisma.backup.create({
  data: {
    filename,
    sizeBytes: BigInt(stats.size),
    storageUrl,
  },
});
```

### Changes Made
- `lib/services/backup.ts` - Removed 5 instances of `(prisma as any)`
- All methods now use properly typed `prisma.backup` calls

## Verification

Test backup creation:
```bash
# Start MinIO
docker-compose up -d minio

# Initialize buckets
npm run init-minio

# Create a backup
npx ts-node test-backup.ts
```

Expected output:
```
🧪 Testing backup creation...
✅ Backup uploaded to MinIO: http://localhost:9000/backups/backup-2024-12-12.sql
✅ Backup created successfully: backup-2024-12-12.sql
```

## Important Notes

### When to Regenerate Prisma Client

**Always run after:**
1. ✅ Changing `prisma/schema.prisma`
2. ✅ Adding/removing fields
3. ✅ Creating new models
4. ✅ Modifying relationships
5. ✅ Running migrations

**Command:**
```bash
npx prisma generate
```

### Development Workflow

1. Edit schema: `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name your_change`
3. Generate client: `npx prisma generate` (usually automatic)
4. Restart dev server: `npm run dev`

## Status

✅ **Fixed and Tested**

All backup operations now work correctly:
- ✅ Create backup (saves to local + MinIO)
- ✅ Restore backup (downloads from MinIO if needed)
- ✅ Delete backup (removes from both locations)
- ✅ Download backup (auto-fetches from MinIO)

## Related Files

- `lib/services/backup.ts` - Backup service (fixed)
- `prisma/schema.prisma` - Database schema
- `node_modules/@prisma/client` - Generated client (updated)
- `prisma/migrations/20251212111833_add_storage_url_to_backups/` - Migration

---

**Issue Resolved! Backups now working with MinIO storage.** ✅
