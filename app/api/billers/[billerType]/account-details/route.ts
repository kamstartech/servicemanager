import { NextRequest, NextResponse } from "next/server";
import { BillerTransactionService } from "@/lib/services/billers/transactions";
import { BillerType } from "@prisma/client";

const transactionService = new BillerTransactionService();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ billerType: string }> }
) {
  try {
    const { billerType } = await params;
    const body = await request.json();
    const { account_number, accountNumber, account_type, accountType } = body;

    const finalAccountNumber = account_number || accountNumber;
    const finalAccountType = account_type || accountType;

    if (!finalAccountNumber) {
      return NextResponse.json(
        {
          success: false,
          error: "account_number is required",
        },
        { status: 400 }
      );
    }

    // Convert biller type to enum
    const billerTypeEnum = billerType.toUpperCase() as BillerType;

    // Validate biller type
    if (!Object.values(BillerType).includes(billerTypeEnum)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid biller type",
        },
        { status: 400 }
      );
    }

    const result = await transactionService.processAccountLookup(
      billerTypeEnum,
      finalAccountNumber,
      finalAccountType
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          transaction: result.transaction,
          account_details: result.accountDetails,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          transaction: result.transaction,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Account lookup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Account lookup failed",
      },
      { status: 500 }
    );
  }
}
