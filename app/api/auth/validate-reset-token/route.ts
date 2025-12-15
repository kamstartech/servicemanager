import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/auth/validate-reset-token?token=xxx
 * Validate a password reset token
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Token is required" },
        { status: 400 }
      );
    }

    // Find the token
    const resetToken = await prisma.adminWebPasswordResetToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!resetToken) {
      return NextResponse.json(
        { valid: false, error: "Invalid or expired token" },
        { status: 404 }
      );
    }

    // Check if token has been used
    if (resetToken.usedAt) {
      return NextResponse.json(
        { valid: false, error: "This reset link has already been used" },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json(
        { valid: false, error: "This reset link has expired" },
        { status: 400 }
      );
    }

    // Token is valid
    return NextResponse.json({
      valid: true,
      user: {
        email: resetToken.user.email,
        name: resetToken.user.name,
      },
    });
  } catch (error) {
    console.error("Validate token error:", error);
    return NextResponse.json(
      { valid: false, error: "An error occurred while validating the token" },
      { status: 500 }
    );
  }
}
