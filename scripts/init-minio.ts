import { initializeBuckets } from "../lib/storage/minio";

async function main() {
  console.log("🚀 Initializing MinIO buckets...");

  try {
    await initializeBuckets();
    console.log("✅ MinIO initialization complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ MinIO initialization failed:", error);
    process.exit(1);
  }
}

main();
