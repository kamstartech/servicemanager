
// Verify scheduler
import { migrationScheduler } from './lib/services/scheduler';

async function verifyScheduler() {
    console.log("Starting Scheduler Verification...");
    try {
        console.log("Scheduler imported successfully.");

        // Manual dry run
        console.log("Running checkAndRunMigrations (Dry Run)...");
        await migrationScheduler.checkAndRunMigrations();
        console.log("checkAndRunMigrations completed without error.");

    } catch (error) {
        console.error("Scheduler Verification Failed:", error);
        process.exit(1);
    }
}

verifyScheduler();
