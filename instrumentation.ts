export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Use dynamic imports to prevent Edge Runtime warnings
        const { migrationScheduler } = await import('@/lib/services/scheduler');
        const { balanceSyncService } = await import('@/lib/services/background/balance-sync');
        const { accountDiscoveryService } = await import('@/lib/services/background/account-discovery');
        const { accountEnrichmentService } = await import('@/lib/services/background/account-enrichment');
        const { alertSettingsService } = await import('@/lib/services/background/alert-settings');
        
        migrationScheduler.init();
        balanceSyncService.start();
        accountDiscoveryService.start();
        accountEnrichmentService.start();
        alertSettingsService.start();
    }
}
