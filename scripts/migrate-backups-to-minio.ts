import { prisma } from "../lib/db/prisma";
import { uploadFile, BUCKETS } from "../lib/storage/minio";
import fs from "fs";
import path from "path";

async function migrateBackupsToMinio() {
  console.log("🚀 Migrating existing backups to MinIO...\n");

  try {
    const BACKUP_DIR = process.env.BACKUP_DIR || path.resolve(process.cwd(), "backups");

    // Find all backups without MinIO storage URL
    const backups = await (prisma as any).backup.findMany({
      where: {
        storageUrl: null,
      },
    });

    console.log(`📦 Found ${backups.length} backup(s) to migrate\n`);

    if (backups.length === 0) {
      console.log("✅ All backups are already in MinIO!");
      process.exit(0);
    }

    let successful = 0;
    let failed = 0;

    for (const backup of backups) {
      const filepath = path.join(BACKUP_DIR, backup.filename);
      
      console.log(`📤 Uploading: ${backup.filename}`);
      
      if (!fs.existsSync(filepath)) {
        console.log(`   ⚠️ Local file not found, skipping...\n`);
        failed++;
        continue;
      }

      try {
        const fileBuffer = fs.readFileSync(filepath);
        const result = await uploadFile(
          BUCKETS.BACKUPS,
          backup.filename,
          fileBuffer,
          {
            "Content-Type": "application/sql",
            "X-Backup-Timestamp": backup.createdAt.toISOString(),
            "X-Database": "service_manager",
            "X-Migration": "true",
          }
        );

        // Update backup record with storage URL
        await (prisma as any).backup.update({
          where: { id: backup.id },
          data: { storageUrl: result.url },
        });

        console.log(`   ✅ Uploaded: ${result.url}\n`);
        successful++;
      } catch (error) {
        console.log(`   ❌ Failed: ${error}\n`);
        failed++;
      }
    }

    console.log("\n📊 Migration Summary:");
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📦 Total: ${backups.length}`);

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateBackupsToMinio();
