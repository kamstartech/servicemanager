import { NextResponse } from "next/server";
import { balanceSyncService } from "@/lib/services/background/balance-sync";
import { accountDiscoveryService } from "@/lib/services/background/account-discovery";
import { accountEnrichmentService } from "@/lib/services/background/account-enrichment";

export async function GET() {
  try {
    const balanceSyncStatus = balanceSyncService.getStatus();
    const accountDiscoveryStatus = accountDiscoveryService.getStatus();
    const accountEnrichmentStatus = accountEnrichmentService.getStatus();

    return NextResponse.json({
      success: true,
      services: {
        balanceSync: {
          ...balanceSyncStatus,
          intervalMinutes: Math.round(balanceSyncStatus.interval / 1000 / 60),
        },
        accountDiscovery: {
          ...accountDiscoveryStatus,
          intervalHours: Math.round(accountDiscoveryStatus.interval / 1000 / 60 / 60),
        },
        accountEnrichment: {
          ...accountEnrichmentStatus,
          intervalHours: Math.round(accountEnrichmentStatus.interval / 1000 / 60 / 60),
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
