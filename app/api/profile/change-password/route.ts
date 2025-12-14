import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcrypt";

export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const adminUser = await prisma.adminWebUser.findUnique({
      where: { id: user.userId },
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const isValid = await bcrypt.compare(currentPassword, adminUser.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await prisma.adminWebUser.update({
      where: { id: user.userId },
      data: { passwordHash: newPasswordHash },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Password change error:", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
});
