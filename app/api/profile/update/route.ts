import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    const { name } = await request.json();

    if (name !== undefined && name !== null && name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.adminWebUser.update({
      where: { id: user.userId },
      data: { name: name?.trim() || null },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
});
