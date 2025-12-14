import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const config = await prisma.billerConfig.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!config) {
      return NextResponse.json(
        { success: false, error: "Biller configuration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    console.error("Error fetching biller config:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const config = await prisma.billerConfig.update({
      where: { id: params.id },
      data: {
        billerName: body.billerName,
        displayName: body.displayName,
        description: body.description,
        isActive: body.isActive,
        baseUrl: body.baseUrl,
        endpoints: body.endpoints,
        authentication: body.authentication,
        defaultCurrency: body.defaultCurrency,
        supportedCurrencies: body.supportedCurrencies,
        timeoutMs: body.timeoutMs,
        retryAttempts: body.retryAttempts,
        features: body.features,
        validationRules: body.validationRules,
        updatedBy: body.updatedBy || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    console.error("Error updating biller config:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Soft delete by setting isActive to false
    const config = await prisma.billerConfig.update({
      where: { id: params.id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    console.error("Error deleting biller config:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
