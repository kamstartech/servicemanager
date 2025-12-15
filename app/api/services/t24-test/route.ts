import { NextResponse } from "next/server";
import { t24BalanceService } from "@/lib/services/t24/balance";
import { t24AccountsService } from "@/lib/services/t24/accounts";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Check if this is a Balance API test (has accountNumber but not customerId)
    if (body.accountNumber && !body.customerId) {
      const { accountNumber } = body;
      
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
        message: result.ok 
          ? `Balance fetched: ${result.availableBalance}` 
          : result.error,
        error: result.ok ? null : result.error,
      });
    }

    // Check if this is an Accounts API test (has customerId)
    if (body.customerId) {
      const { customerId } = body;
      
      console.log(`🔄 Testing T24 accounts API for customer: ${customerId}`);

      const result = await t24AccountsService.getCustomerAccountsDetailed(customerId);

      return NextResponse.json({
        success: result.ok,
        data: result.ok ? result.accounts : null,
        count: result.ok ? result.accounts?.length : 0,
        message: result.ok 
          ? `Found ${result.accounts?.length || 0} accounts` 
          : result.error,
        error: result.ok ? null : result.error,
      });
    }

    // Legacy support for type parameter
    const { type, accountNumber, customerId } = body;

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
      { success: false, error: "Invalid request. Provide accountNumber or customerId" },
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
