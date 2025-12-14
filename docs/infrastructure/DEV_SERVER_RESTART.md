# Fix: Restart Dev Server After Schema Changes

## The Issue
Even after running `npx prisma generate`, the Next.js dev server (with Turbopack) keeps using the old cached Prisma client.

## Quick Fix

**Stop the dev server and restart it:**

```bash
# 1. Stop the current dev server (Ctrl+C)

# 2. Clear Next.js cache
rm -rf .next

# 3. Regenerate Prisma client (just to be sure)
npx prisma generate

# 4. Restart dev server
npm run dev
```

## Why This Happens

Next.js with Turbopack caches modules in `.next/` directory. When you update Prisma schema and regenerate the client, the running dev server doesn't pick up the changes until you restart.

## Complete Workflow

Whenever you change the Prisma schema:

```bash
# 1. Update schema
vim prisma/schema.prisma

# 2. Create and apply migration
npx prisma migrate dev --name your_change_name

# 3. Generate client (usually automatic with migrate dev)
npx prisma generate

# 4. Clear cache and restart
rm -rf .next
npm run dev
```

## Verification

After restarting, test the backup creation:
1. Navigate to http://localhost:3000/system/backups
2. Click "Create Backup"
3. Should see success with MinIO URL

Expected in logs:
```
✅ Backup uploaded to MinIO: http://localhost:9000/backups/backup-2024-12-12.sql
```

## Alternative: Production Build

If dev mode continues to have issues:

```bash
# Build for production
npm run build

# Run production server
npm start
```

Production mode doesn't have the same caching issues.

---

**TL;DR: After schema changes, always stop dev server, clear .next, and restart!**
