import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");

    const where: any = {};
    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    const configs = await prisma.billerConfig.findMany({
      where,
      orderBy: { billerName: "asc" },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: configs,
    });
  } catch (error: any) {
    console.error("Error fetching biller configs:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      "billerType",
      "billerName",
      "displayName",
      "baseUrl",
      "endpoints",
      "defaultCurrency",
      "timeoutMs",
      "retryAttempts",
      "features",
      "validationRules",
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const config = await prisma.billerConfig.create({
      data: {
        billerType: body.billerType,
        billerName: body.billerName,
        displayName: body.displayName,
        description: body.description || null,
        isActive: body.isActive ?? true,
        baseUrl: body.baseUrl,
        endpoints: body.endpoints,
        authentication: body.authentication || null,
        defaultCurrency: body.defaultCurrency,
        supportedCurrencies: body.supportedCurrencies || [body.defaultCurrency],
        timeoutMs: body.timeoutMs,
        retryAttempts: body.retryAttempts,
        features: body.features,
        validationRules: body.validationRules,
        createdBy: body.createdBy || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    console.error("Error creating biller config:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
