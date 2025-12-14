import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/admin/third-party/clients
 * List all third-party clients
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search");

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { contactEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    const [clients, total] = await Promise.all([
      prisma.thirdPartyClient.findMany({
        where,
        include: {
          _count: {
            select: {
              apiKeys: true,
              accessLogs: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.thirdPartyClient.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: clients,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    console.error("Error fetching clients:", error);
    
    // Check if tables don't exist
    if (error?.code === 'P2021' || error?.message?.includes('table') || error?.message?.includes('relation')) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
          message: "Database tables not created. Run: npx prisma migrate dev"
        },
        { status: 200 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/third-party/clients
 * Create a new third-party client
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // TODO: Get admin user ID from session
    const adminUserId = 1; // Replace with actual admin ID from auth

    const client = await prisma.thirdPartyClient.create({
      data: {
        name: body.name,
        description: body.description,
        contactName: body.contactName,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        allowedIps: body.allowedIps || [],
        rateLimitPerMinute: body.rateLimitPerMinute || 60,
        rateLimitPerHour: body.rateLimitPerHour || 1000,
        createdBy: adminUserId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: client,
        message: "Client created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating third-party client:", error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
