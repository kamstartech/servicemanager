import { NextRequest, NextResponse } from "next/server";
import { BillerTransactionService } from "@/lib/services/billers/transactions";

const transactionService = new BillerTransactionService();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await transactionService.retryTransaction(id);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          transaction: result.transaction,
        },
        message: "Transaction retry initiated successfully",
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
    console.error("Transaction retry error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Transaction retry failed",
      },
      { status: 500 }
    );
  }
}
