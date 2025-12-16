import { backupService } from "../lib/services/backup";
import { listFiles, BUCKETS } from "../lib/storage/minio";

async function testBackupToMinio() {
  console.log("🧪 Testing backup to MinIO...\n");

  try {
    // Step 1: Create a backup
    console.log("1️⃣ Creating database backup...");
    const filename = await backupService.createBackup();
    console.log(`✅ Backup created: ${filename}\n`);

    // Step 2: Wait a moment for upload to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: List files in MinIO backups bucket
    console.log("2️⃣ Listing files in MinIO backups bucket...");
    const files = await listFiles(BUCKETS.BACKUPS);
    console.log(`📦 Found ${files.length} file(s) in MinIO:\n`);
    
    files.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.name}`);
      console.log(`      Size: ${(file.size / 1024).toFixed(2)} KB`);
      console.log(`      Last Modified: ${file.lastModified}\n`);
    });

    // Step 4: Verify our backup is in the list
    const backupExists = files.some(f => f.name === filename);
    if (backupExists) {
      console.log("✅ Backup successfully stored in MinIO!");
    } else {
      console.log("⚠️ Backup not found in MinIO bucket!");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testBackupToMinio();
