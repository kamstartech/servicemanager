import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const DELETE = withAuth(async (request: NextRequest, user: any, context: any) => {
  try {
    const params = await context.params;
    const passkeyId = params?.id;

    if (!passkeyId) {
      return NextResponse.json(
        { error: "Passkey ID is required" },
        { status: 400 }
      );
    }

    const passkey = await prisma.adminWebPasskey.findUnique({
      where: { id: passkeyId },
    });

    if (!passkey) {
      return NextResponse.json(
        { error: "Passkey not found" },
        { status: 404 }
      );
    }

    if (passkey.userId !== user.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    await prisma.adminWebPasskey.delete({
      where: { id: passkeyId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Passkey deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete passkey" },
      { status: 500 }
    );
  }
});
