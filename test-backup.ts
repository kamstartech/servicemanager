import { backupService } from "./lib/services/backup";

async function testBackup() {
  try {
    console.log("🧪 Testing backup creation...");
    const filename = await backupService.createBackup();
    console.log("✅ Backup created successfully:", filename);
    process.exit(0);
  } catch (error) {
    console.error("❌ Backup test failed:", error);
    process.exit(1);
  }
}

testBackup();
