export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Use dynamic imports to prevent Edge Runtime warnings
        const { initializeBuckets } = await import('@/lib/storage/minio');
        const { migrationScheduler } = await import('@/lib/services/scheduler');
        const { backupScheduler } = await import('@/lib/services/backup-scheduler');
        const { balanceSyncService } = await import('@/lib/services/background/balance-sync');
        const { accountDiscoveryService } = await import('@/lib/services/background/account-discovery');
        const { accountEnrichmentService } = await import('@/lib/services/background/account-enrichment');
        const { alertSettingsService } = await import('@/lib/services/background/alert-settings');
        const { startTransactionProcessorJob } = await import('@/lib/jobs/transaction-processor-job');
        
        // Initialize MinIO buckets on startup
        try {
            await initializeBuckets();
        } catch (error) {
            console.error('⚠️ MinIO initialization failed (will retry on first use):', error);
        }
        
        migrationScheduler.init();
        backupScheduler.init();
        balanceSyncService.start();
        accountDiscoveryService.start();
        accountEnrichmentService.start();
        alertSettingsService.start();
        startTransactionProcessorJob();
    }
}
