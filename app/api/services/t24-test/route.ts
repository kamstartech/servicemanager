import { NextResponse } from "next/server";
import { t24BalanceService } from "@/lib/services/t24/balance";
import { t24AccountsService } from "@/lib/services/t24/accounts";

export async function POST(request: Request) {
  try {
    const { type, accountNumber, customerId } = await request.json();

    if (type === "balance") {
      if (!accountNumber) {
        return NextResponse.json(
          { success: false, error: "accountNumber is required for balance test" },
          { status: 400 }
        );
      }

      console.log(`🔄 Testing T24 balance API for account: ${accountNumber}`);

      const result = await t24BalanceService.getAccountBalanceExtended(accountNumber);

      return NextResponse.json({
        success: result.ok,
        data: result.ok
          ? {
              workingBalance: result.workingBalance,
              availableBalance: result.availableBalance,
              clearedBalance: result.clearedBalance,
              onlineActualBalance: result.onlineActualBalance,
            }
          : null,
        error: result.ok ? null : result.error,
      });
    }

    if (type === "accounts") {
      if (!customerId) {
        return NextResponse.json(
          { success: false, error: "customerId is required for accounts test" },
          { status: 400 }
        );
      }

      console.log(`🔄 Testing T24 accounts API for customer: ${customerId}`);

      const result = await t24AccountsService.getCustomerAccountsDetailed(customerId);

      return NextResponse.json({
        success: result.ok,
        data: result.ok ? result.accounts : null,
        count: result.ok ? result.accounts?.length : 0,
        error: result.ok ? null : result.error,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid type. Use 'balance' or 'accounts'" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("❌ T24 test failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
