import { NextRequest, NextResponse } from "next/server";
import { billerTransactionService } from "@/lib/services/billers/transactions";
import { BillerTransactionStatus, BillerType } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const billerType = searchParams.get("billerType");
    const status = searchParams.get("status");
    const accountNumber = searchParams.get("accountNumber");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    const filters: any = {
      page,
      pageSize,
    };

    if (billerType) filters.billerType = billerType;
    if (status) filters.status = status as BillerTransactionStatus;
    if (accountNumber) filters.accountNumber = accountNumber;

    const result = await billerTransactionService.getTransactions(filters);

    return NextResponse.json({
      success: true,
      data: result.transactions,
      pagination: result.pagination,
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
