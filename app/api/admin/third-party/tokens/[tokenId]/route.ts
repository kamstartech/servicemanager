import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  revokeThirdPartyTokenById,
  suspendThirdPartyToken,
  reactivateThirdPartyToken,
} from "@/lib/auth/third-party-jwt";
import { ApiKeyStatus } from "@prisma/client";

/**
 * GET /api/admin/third-party/tokens/[tokenId]
 * Get token details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId } = await params;

    const token = await prisma.thirdPartyApiKey.findUnique({
      where: { id: tokenId },
      include: {
        client: true,
      },
    });

    if (!token) {
      return NextResponse.json(
        { error: "Token not found" },
        { status: 404 }
      );
    }

    // Calculate days until expiry
    let daysUntilExpiry = null;
    if (token.expiresAt) {
      const now = new Date();
      const diff = token.expiresAt.getTime() - now.getTime();
      daysUntilExpiry = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      success: true,
      data: {
        ...token,
        daysUntilExpiry,
      },
    });
  } catch (error) {
    console.error("Error fetching token:", error);
    return NextResponse.json(
      { error: "Failed to fetch token" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/third-party/tokens/[tokenId]
 * Update token status (suspend, reactivate, revoke)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId } = await params;
    const body = await request.json();

    // TODO: Get admin user ID from session
    const adminUserId = 1;

    const action = body.action;

    switch (action) {
      case "suspend":
        await suspendThirdPartyToken(tokenId);
        return NextResponse.json({
          success: true,
          message: "Token suspended successfully",
        });

      case "reactivate":
        await reactivateThirdPartyToken(tokenId);
        return NextResponse.json({
          success: true,
          message: "Token reactivated successfully",
        });

      case "revoke":
        await revokeThirdPartyTokenById(tokenId, adminUserId);
        return NextResponse.json({
          success: true,
          message: "Token revoked successfully",
        });

      default:
        return NextResponse.json(
          {
            error: "Invalid action",
            message:
              "Action must be one of: suspend, reactivate, revoke",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error updating token:", error);
    return NextResponse.json(
      { error: "Failed to update token" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/third-party/tokens/[tokenId]
 * Revoke token (alias for PATCH with revoke action)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId } = await params;

    // TODO: Get admin user ID from session
    const adminUserId = 1;

    await revokeThirdPartyTokenById(tokenId, adminUserId);

    return NextResponse.json({
      success: true,
      message: "Token revoked successfully",
    });
  } catch (error) {
    console.error("Error revoking token:", error);
    return NextResponse.json(
      { error: "Failed to revoke token" },
      { status: 500 }
    );
  }
}
