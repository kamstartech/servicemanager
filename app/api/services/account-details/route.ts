import { NextRequest, NextResponse } from "next/server";
import { t24AccountDetailsService } from "@/lib/services/t24/account-details";

/**
 * GET /api/services/account-details?accountNumber={accountNumber}
 * POST /api/services/account-details with body: { accountNumber: string }
 * 
 * Fetches detailed account information from T24
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get("accountNumber");

    if (!accountNumber) {
      return NextResponse.json(
        {
          status: 1,
          message: "Account number is required",
          error: "MISSING_ACCOUNT_NUMBER",
        },
        { status: 400 }
      );
    }

    console.log(`📞 API: Fetching account details for ${accountNumber}`);

    const result = await t24AccountDetailsService.getAccountDetailsFormatted(accountNumber);

    if (!result.ok) {
      return NextResponse.json(
        {
          status: 1,
          message: result.error || "Failed to fetch account details",
          error: "T24_FETCH_FAILED",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 0,
      message: "Account details fetched successfully",
      data: result.data,
    });
  } catch (error) {
    console.error("❌ Account details API error:", error);
    return NextResponse.json(
      {
        status: 1,
        message: "Internal server error",
        error: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { accountNumber } = await request.json();

    if (!accountNumber) {
      return NextResponse.json(
        { success: false, error: "accountNumber is required" },
        { status: 400 }
      );
    }

    console.log(`📞 API: Testing account details for ${accountNumber}`);

    const result = await t24AccountDetailsService.getAccountDetailsFormatted(accountNumber);

    if (!result.ok) {
      return NextResponse.json({
        success: false,
        error: result.error || "Failed to fetch account details",
      });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: `Account details fetched: ${result.data?.holderName || "N/A"}`,
    });
  } catch (error: any) {
    console.error("❌ Account details test failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
