import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/me
 * Get current authenticated user's information
 * 
 * Requires: Authorization: Bearer <token>
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  // Fetch fresh user data from database
  const dbUser = await prisma.mobileUser.findUnique({
    where: { id: user.userId },
  });

  if (!dbUser) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  // Return user info (without sensitive data)
  return NextResponse.json({
    id: dbUser.id,
    username: dbUser.username,
    phoneNumber: dbUser.phoneNumber,
    context: dbUser.context,
    isActive: dbUser.isActive,
    createdAt: dbUser.createdAt.toISOString(),
    updatedAt: dbUser.updatedAt.toISOString(),
  });
});
