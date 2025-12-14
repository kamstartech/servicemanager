# Database Backups with MinIO Storage - Complete ✅

## Overview

Database backups are now automatically saved to **MinIO object storage** in addition to local filesystem, providing redundancy and cloud-ready backup storage.

---

## 🎯 What Changed

### 1. Added `backups` Bucket to MinIO

**File:** `lib/storage/minio.ts`

Added new bucket:
```typescript
export const BUCKETS = {
  PROFILE_IMAGES: "profile-images",
  DOCUMENTS: "documents",
  KYC_DOCUMENTS: "kyc-documents",
  RECEIPTS: "receipts",
  ATTACHMENTS: "attachments",
  BACKUPS: "backups",  // ← New bucket for database backups
} as const;
```

### 2. Updated Backup Service

**File:** `lib/services/backup.ts`

**Enhanced with MinIO integration:**
- ✅ Uploads backups to MinIO automatically
- ✅ Downloads from MinIO if local file missing
- ✅ Deletes from both local and MinIO storage
- ✅ Stores storage URL in database

### 3. Database Schema Update

**File:** `prisma/schema.prisma`

Added `storageUrl` field to Backup model:
```prisma
model Backup {
  id         String   @id @default(cuid())
  filename   String   @unique
  sizeBytes  BigInt   @map("size_bytes")
  storageUrl String?  @map("storage_url") @db.Text  // ← New field
  createdAt  DateTime @default(now()) @map("created_at")

  @@map("fdh_backups")
}
```

**Migration:** `20251212111833_add_storage_url_to_backups`

---

## 🔄 Backup Flow

### Creating Backup (Dual Storage)

```
1. Generate backup with pg_dump
   ↓
2. Save to local filesystem (/app/backups/)
   ↓
3. Upload to MinIO (backups bucket)
   ↓
4. Store metadata in database:
   - filename
   - sizeBytes
   - storageUrl (MinIO URL)
   - createdAt
```

### Restoring Backup (Smart Retrieval)

```
1. Check if backup exists locally
   ↓
   ├─ YES → Use local file
   │
   └─ NO → Download from MinIO storage
            ↓
            Save to local filesystem
            ↓
            Restore database
```

### Deleting Backup (Clean Removal)

```
1. Delete from MinIO storage
   ↓
2. Delete from database records
   ↓
3. Delete from local filesystem
```

---

## 📦 Storage Architecture

### Dual Storage System

```
Database Backup Created
    ↓
    ├─→ Local Storage (Volume Mount)
    │   └─ /app/backups/backup-2024-12-12.sql
    │
    └─→ MinIO Storage (Object Storage)
        └─ backups/backup-2024-12-12.sql
```

### Benefits

1. **Redundancy** - Backups exist in two locations
2. **Portability** - Can run without MinIO (falls back to local)
3. **Cloud-Ready** - MinIO compatible with S3, Azure Blob, etc.
4. **Space Management** - Can clean up local backups, keep in MinIO
5. **Disaster Recovery** - MinIO can be replicated/backed up separately

---

## 🔒 Security & Access

### Backup Bucket Policy

- **Access:** Private (no public access)
- **Retrieval:** Via presigned URLs only
- **Authentication:** MinIO access key required

### File Metadata

Each backup stored with metadata:
```typescript
{
  "Content-Type": "application/sql",
  "X-Backup-Timestamp": "2024-12-12T10-00-00-000Z",
  "X-Database": "service_manager"
}
```

---

## 💻 Usage Examples

### Create Backup (Automatic MinIO Upload)

```typescript
import { backupService } from "@/lib/services/backup";

// Creates backup locally AND uploads to MinIO
const filename = await backupService.createBackup();
console.log(`Backup created: ${filename}`);

// Result stored in database with storageUrl
```

### Restore Backup (Auto-Downloads if Needed)

```typescript
// Will download from MinIO if local file doesn't exist
await backupService.restoreBackup(backupId);
```

### Get Backup for Download

```typescript
// Downloads from MinIO if needed, returns local path
const filepath = await backupService.getBackupPath(backupId);

// Use for streaming to client
const stream = fs.createReadStream(filepath);
```

---

## 📊 Database Records

### Backup Table Schema

```sql
CREATE TABLE "fdh_backups" (
    "id" TEXT PRIMARY KEY,
    "filename" TEXT UNIQUE NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "storage_url" TEXT,           -- MinIO URL
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Example Record

```typescript
{
  id: "clxyz123abc456",
  filename: "backup-2024-12-12T10-00-00-000Z.sql",
  sizeBytes: 15728640n,  // ~15MB
  storageUrl: "http://localhost:9000/backups/backup-2024-12-12T10-00-00-000Z.sql",
  createdAt: "2024-12-12T10:00:00.000Z"
}
```

---

## 🛠️ Management

### MinIO Console Access

**View backups:** http://localhost:9001

Navigate to **backups** bucket to see all database backups.

### List Backups via CLI

```bash
# List all backup files in MinIO
docker exec service_manager_minio mc ls local/backups

# Check backup size
docker exec service_manager_minio mc du local/backups
```

### Manual Backup Download

```bash
# Download specific backup from MinIO
docker exec service_manager_minio mc cp \
  local/backups/backup-2024-12-12.sql \
  ./downloaded-backup.sql
```

---

## 🔄 Migration & Upgrade

### Existing Backups

Old backups (created before this update) will:
- ✅ Still work for restore
- ❌ Won't have `storageUrl` (will be `null`)
- ℹ️ Won't be in MinIO (only local)

### After Update

New backups will:
- ✅ Be saved locally
- ✅ Be uploaded to MinIO
- ✅ Have `storageUrl` populated

---

## 🚀 Production Recommendations

### 1. Set Up MinIO Replication

```bash
# Configure replication to another MinIO instance
mc admin bucket remote add minio/backups \
  https://backup-minio.yourdomain.com/backups \
  --service replication
```

### 2. Configure Retention Policy

```typescript
// lib/services/backup.ts
const BACKUP_RETENTION_DAYS = 30;

// Add cleanup job
async cleanupOldBackups() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - BACKUP_RETENTION_DAYS);
  
  const oldBackups = await prisma.backup.findMany({
    where: { createdAt: { lt: cutoffDate } }
  });
  
  for (const backup of oldBackups) {
    await this.deleteBackup(backup.id);
  }
}
```

### 3. Monitor Backup Storage

```bash
# Check MinIO backup bucket size
docker exec service_manager_minio mc du local/backups

# Set up alerts for storage usage
docker exec service_manager_minio mc admin config set minio/ \
  notify_webhook:1 endpoint="https://alerts.yourdomain.com/webhook"
```

### 4. Test Disaster Recovery

```bash
# 1. Simulate data loss - delete local backups
rm -rf backups/*.sql

# 2. Try restore - should download from MinIO
npm run restore-backup

# 3. Verify data integrity
npm run verify-backup
```

---

## 🔍 Troubleshooting

### Backup Creation Fails

**Issue:** Backup created locally but not uploaded to MinIO

**Check:**
```bash
# 1. MinIO running?
docker ps | grep minio

# 2. Bucket exists?
docker exec service_manager_minio mc ls local | grep backups

# 3. Check logs
docker logs service_manager_minio
```

**Fix:**
```bash
# Reinitialize buckets
cd admin
npm run init-minio
```

### Restore Can't Find Backup

**Issue:** "Backup file not found locally or in storage"

**Solutions:**
1. Check database record has `storageUrl`
2. Verify file exists in MinIO console
3. Check MinIO connection settings in `.env.local`

### MinIO Storage Growing Too Large

**Issue:** Backups taking up too much space

**Solutions:**
1. Implement retention policy (see above)
2. Compress backups with gzip:
   ```typescript
   // In backup.ts, add compression
   const command = `pg_dump "${dbUrl}" | gzip > "${filepath}.gz"`;
   ```
3. Configure lifecycle rules in MinIO

---

## 📋 Verification Checklist

Test the complete backup flow:

```bash
# 1. Create backup
curl -X POST http://localhost:3000/api/backups/create

# 2. Verify in MinIO console
open http://localhost:9001
# Navigate to backups bucket

# 3. Delete local file
rm backups/*.sql

# 4. Try restore (should download from MinIO)
curl -X POST http://localhost:3000/api/backups/{id}/restore

# 5. Verify database restored correctly
psql $DATABASE_URL -c "SELECT COUNT(*) FROM fdh_mobile_users;"
```

---

## 📊 Storage Comparison

### Before (Local Only)

```
Pros:
- Fast access
- Simple setup
- No external dependencies

Cons:
- Single point of failure
- Lost if container/volume deleted
- Hard to share across environments
```

### After (Dual Storage)

```
Pros:
- Redundancy (local + MinIO)
- Cloud-ready (S3-compatible)
- Easy replication
- Disaster recovery ready
- Can share across environments

Cons:
- Slightly slower backup creation
- Requires MinIO running
- Uses more storage space
```

---

## 🎯 Next Steps

### Optional Enhancements

1. **Compression** - Gzip backups to save space
2. **Encryption** - Encrypt backups at rest
3. **Incremental Backups** - Only backup changes
4. **Multi-Region** - Replicate to multiple MinIO instances
5. **Backup Verification** - Automated restore tests
6. **Monitoring Dashboard** - Track backup health

---

## 📚 Related Documentation

- **MinIO Setup:** `MINIO_STORAGE_IMPLEMENTATION.md`
- **Quick Start:** `MINIO_QUICK_START.md`
- **Backup Service:** `lib/services/backup.ts`

---

## Summary

✅ **Backups saved to MinIO automatically**
✅ **Local filesystem still used (volume mount)**
✅ **Dual storage for redundancy**
✅ **Smart restore (downloads from MinIO if needed)**
✅ **Database tracks storage URLs**
✅ **Production-ready with S3 compatibility**

**Your backups are now cloud-ready! 🎉☁️**
