import { NextRequest, NextResponse } from "next/server";
import { billerTransactionService } from "@/lib/services/billers/transactions";
import { BillerTransactionStatus, BillerType } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const billerType = searchParams.get("billerType");
    const status = searchParams.get("status");
    const accountNumber = searchParams.get("accountNumber");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const filters: any = {
      limit,
      offset,
    };

    let transactions;

    if (billerType) {
      transactions = await billerTransactionService.getTransactionsByBiller(
        billerType as BillerType,
        filters
      );
    } else if (status) {
      transactions = await billerTransactionService.getTransactionsByStatus(
        status as BillerTransactionStatus,
        filters
      );
    } else if (accountNumber) {
      transactions = await billerTransactionService.getTransactionsByAccount(
        accountNumber,
        filters
      );
    } else {
      transactions = await billerTransactionService.getAllTransactions(filters);
    }

    return NextResponse.json({
      success: true,
      data: transactions,
      pagination: {
        limit,
        offset,
        count: transactions.length,
      },
    });
  } catch (error: any) {
    console.error("Get transactions error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to retrieve transactions",
      },
      { status: 500 }
    );
  }
}
