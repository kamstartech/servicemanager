import { backupService } from "../lib/services/backup";
import { prisma } from "../lib/db/prisma";
import fs from "fs";
import path from "path";

async function testBackupDownload() {
  console.log("🧪 Testing backup download from MinIO...\n");

  try {
    // Step 1: Find a backup that exists in MinIO
    console.log("1️⃣ Finding backups with MinIO storage...");
    const backups = await (prisma as any).backup.findMany({
      where: {
        storageUrl: {
          not: null,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    if (backups.length === 0) {
      console.log("⚠️ No backups found in MinIO. Please create a backup first.");
      process.exit(1);
    }

    const backup = backups[0];
    console.log(`✅ Found backup: ${backup.filename}`);
    console.log(`   Storage URL: ${backup.storageUrl}\n`);

    // Step 2: Delete local file to force download from MinIO
    const BACKUP_DIR = process.env.BACKUP_DIR || path.resolve(process.cwd(), "backups");
    const localPath = path.join(BACKUP_DIR, backup.filename);
    
    if (fs.existsSync(localPath)) {
      console.log("2️⃣ Deleting local backup file to test MinIO download...");
      fs.unlinkSync(localPath);
      console.log(`✅ Local file deleted\n`);
    }

    // Step 3: Try to get backup path (should download from MinIO)
    console.log("3️⃣ Requesting backup (should download from MinIO)...");
    const downloadedPath = await backupService.getBackupPath(backup.id);
    console.log(`✅ Backup retrieved: ${downloadedPath}\n`);

    // Step 4: Verify file exists locally now
    if (fs.existsSync(downloadedPath)) {
      const stats = fs.statSync(downloadedPath);
      console.log("4️⃣ Verifying downloaded file...");
      console.log(`✅ File exists locally`);
      console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`   Path: ${downloadedPath}\n`);
      
      console.log("✅ SUCCESS: Backup can be downloaded from MinIO!");
    } else {
      console.log("❌ File not found after download!");
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testBackupDownload();
