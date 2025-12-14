import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generateThirdPartyToken } from "@/lib/auth/third-party-jwt";

/**
 * GET /api/admin/third-party/clients/[id]/tokens
 * List all tokens for a client
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tokens = await prisma.thirdPartyApiKey.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        keyPrefix: true,
        name: true,
        description: true,
        status: true,
        permissions: true,
        expiresAt: true,
        lastUsedAt: true,
        usageCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Calculate days until expiry for each token
    const tokensWithExpiry = tokens.map((token) => {
      let daysUntilExpiry = null;
      if (token.expiresAt) {
        const now = new Date();
        const diff = token.expiresAt.getTime() - now.getTime();
        daysUntilExpiry = Math.ceil(diff / (1000 * 60 * 60 * 24));
      }

      return {
        ...token,
        daysUntilExpiry,
      };
    });

    // Summary
    const summary = {
      total: tokens.length,
      active: tokens.filter((t) => t.status === "ACTIVE").length,
      expired: tokens.filter((t) => t.status === "EXPIRED").length,
      revoked: tokens.filter((t) => t.status === "REVOKED").length,
      suspended: tokens.filter((t) => t.status === "SUSPENDED").length,
    };

    return NextResponse.json({
      success: true,
      data: {
        tokens: tokensWithExpiry,
        summary,
      },
    });
  } catch (error: any) {
    console.error("Error fetching tokens:", error);
    
    // Check if it's a table doesn't exist error
    if (error?.code === 'P2021' || error?.message?.includes('table') || error?.message?.includes('relation')) {
      return NextResponse.json(
        { 
          success: false,
          error: "Database tables not created",
          message: "Please run: npx prisma migrate dev",
          data: { tokens: [], summary: { total: 0, active: 0, expired: 0, revoked: 0, suspended: 0 } }
        },
        { status: 200 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: "Failed to fetch tokens" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/third-party/clients/[id]/tokens
 * Generate a new API token for a client
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // TODO: Get admin user ID from session
    const adminUserId = 1; // Replace with actual admin ID from auth

    const { token, tokenId, expiresAt } = await generateThirdPartyToken({
      clientId: id,
      name: body.name || "API Token",
      description: body.description,
      expiresIn: body.expiresIn || "1y",
      permissions: body.permissions || [
        "registrations:read",
        "registrations:create",
      ],
      createdBy: adminUserId,
    });

    // Calculate expiration info
    const now = new Date();
    const expiresInDays = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          token, // ⚠️ SHOWN ONLY ONCE
          tokenId,
          expiresAt,
          expiresInDays,
        },
        message:
          "⚠️ Save this token securely. It will not be shown again.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error generating token:", error);
    
    // Check if it's a table doesn't exist error
    if (error?.code === 'P2021' || error?.message?.includes('table') || error?.message?.includes('relation')) {
      return NextResponse.json(
        {
          success: false,
          error: "Database tables not created",
          message: "Please run: npx prisma migrate dev to create the third_party tables",
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate token",
        message:
          error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
