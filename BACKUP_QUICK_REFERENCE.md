# Database Backup Quick Reference

## Quick Verification

```bash
# Check container status
docker ps | grep service_manager

# View backups in MinIO
docker exec -e MC_HOST_myminio=http://minioadmin:minioadmin@localhost:9000 \
  service_manager_minio mc ls myminio/backups/

# Check container logs for MinIO initialization
docker logs service_manager_adminpanel 2>&1 | grep "MinIO buckets initialized"
```

## Create Backup (from inside container)

```bash
docker exec service_manager_adminpanel npx tsx -e "
import { backupService } from './lib/services/backup';
(async () => {
  const filename = await backupService.createBackup();
  console.log('Backup created:', filename);
})();
"
```

## List All Backups

```bash
docker exec service_manager_adminpanel npx tsx -e "
import { prisma } from './lib/db/prisma';
(async () => {
  const backups = await (prisma as any).backup.findMany({
    orderBy: { createdAt: 'desc' }
  });
  console.log('Backups:', backups.length);
  backups.forEach((b) => {
    console.log(\`- \${b.filename}: \${b.storageUrl ? 'MinIO ✅' : 'Local ❌'}\`);
  });
})();
"
```

## Access MinIO Console

1. Open browser: http://localhost:9001
2. Login with:
   - Username: `minioadmin`
   - Password: `minioadmin`
3. Navigate to `backups` bucket

## Test Complete Backup System

```bash
bash scripts/verify-backup-minio.sh
```

## Container Boot Sequence

1. ✅ Container starts
2. ✅ MinIO buckets initialized (including `backups`)
3. ✅ Background services start
4. ✅ Application ready

## Status

- ✅ Backups automatically upload to MinIO
- ✅ MinIO initialized on container boot
- ✅ Backups downloadable from MinIO when needed
- ✅ Local and cloud storage working together

