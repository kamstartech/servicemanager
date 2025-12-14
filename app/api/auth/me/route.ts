import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/auth/me
 * Get current authenticated admin user's information
 * 
 * Requires: Authentication cookie or Bearer token
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  // Fetch fresh user data from database
  const dbUser = await prisma.adminWebUser.findUnique({
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
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      isActive: dbUser.isActive,
      createdAt: dbUser.createdAt.toISOString(),
      updatedAt: dbUser.updatedAt.toISOString(),
    },
  });
});
