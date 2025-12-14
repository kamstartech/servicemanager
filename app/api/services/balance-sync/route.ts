import { NextResponse } from "next/server";
import { balanceSyncService } from "@/lib/services/background/balance-sync";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    console.log(`🔄 Manual balance sync triggered for user ${userId}`);

    const result = await balanceSyncService.syncWithTimeout(userId);

    return NextResponse.json({
      success: result.ok,
      balance: result.balance,
      message: result.ok
        ? `Balance synced: ${result.balance}`
        : "Sync failed or timed out, continuing in background",
    });
  } catch (error: any) {
    console.error("❌ Manual balance sync failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
