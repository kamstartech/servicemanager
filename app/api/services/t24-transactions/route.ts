import { NextRequest, NextResponse } from "next/server";
import { withContextAuth } from "@/lib/auth/middleware";
import { t24TransactionsService } from "@/lib/services/t24/transactions";

export const POST = withContextAuth(["ADMIN"], async (request: NextRequest) => {
  try {
    const { accountNumber } = await request.json();

    if (!accountNumber) {
      return NextResponse.json(
        { success: false, error: "accountNumber is required" },
        { status: 400 }
      );
    }

    console.log(`🔄 Fetching T24 transactions for account: ${accountNumber}`);

    const result = await t24TransactionsService.getAccountTransactions(accountNumber);

    if (result.status !== "success") {
      return NextResponse.json({
        success: false,
        error: result.error || "Failed to fetch transactions",
      });
    }

    return NextResponse.json({
      success: true,
      data: result.transactions,
      count: result.transactions?.length || 0,
      message: `Found ${result.transactions?.length || 0} transactions`,
    });
  } catch (error: any) {
    console.error("❌ T24 transactions fetch failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});
