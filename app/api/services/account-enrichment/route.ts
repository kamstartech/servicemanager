import { NextResponse } from "next/server";
import { accountEnrichmentService } from "@/lib/services/background/account-enrichment";

export async function POST(request: Request) {
  try {
    const { accountNumber } = await request.json();

    if (!accountNumber) {
      return NextResponse.json(
        { success: false, error: "accountNumber is required" },
        { status: 400 }
      );
    }

    console.log(`🔄 Manual account enrichment triggered for account ${accountNumber}`);

    const result = await accountEnrichmentService.enrichAccountManual(accountNumber);

    return NextResponse.json({
      success: result.enriched,
      enriched: result.enriched,
      profileUpdated: result.profileUpdated,
      categoryCreated: result.categoryCreated,
      message: result.enriched
        ? `Account enriched successfully${result.profileUpdated ? " (profile updated)" : ""}${result.categoryCreated ? " (category created)" : ""}`
        : "Failed to enrich account",
    });
  } catch (error: any) {
    console.error("❌ Manual account enrichment failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
