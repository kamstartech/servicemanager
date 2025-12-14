import { NextResponse } from "next/server";
import { accountDiscoveryService } from "@/lib/services/background/account-discovery";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    console.log(`🔍 Manual account discovery triggered for user ${userId}`);

    const result = await accountDiscoveryService.discoverForUser(userId);

    return NextResponse.json({
      success: true,
      added: result.added,
      deactivated: result.deactivated,
      message: `Found ${result.added} new accounts, deactivated ${result.deactivated} accounts`,
    });
  } catch (error: any) {
    console.error("❌ Manual account discovery failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
