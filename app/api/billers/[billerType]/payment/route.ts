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

    // Extract fields (support both snake_case and camelCase)
    const accountNumber = body.account_number || body.accountNumber;
    const amount = body.amount;
    const currency = body.currency;
    const accountType = body.account_type || body.accountType;
    const creditAccount = body.credit_account || body.creditAccount;
    const creditAccountType = body.credit_account_type || body.creditAccountType;
    const debitAccount = body.debit_account || body.debitAccount;
    const debitAccountType = body.debit_account_type || body.debitAccountType;
    const customerAccountNumber = body.customer_account_number || body.customerAccountNumber;
    const customerAccountName = body.customer_account_name || body.customerAccountName;

    // Validation
    if (!accountNumber) {
      return NextResponse.json(
        {
          success: false,
          error: "account_number is required",
        },
        { status: 400 }
      );
    }

    if (!amount) {
      return NextResponse.json(
        {
          success: false,
          error: "amount is required",
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

    const result = await transactionService.processPayment(billerTypeEnum, {
      accountNumber,
      amount,
      currency,
      accountType,
      creditAccount,
      creditAccountType,
      debitAccount,
      debitAccountType,
      customerAccountNumber,
      customerAccountName,
      metadata: body.metadata,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          transaction: result.transaction,
          result: result.result,
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
    console.error("Payment processing error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Payment processing failed",
      },
      { status: 500 }
    );
  }
}
