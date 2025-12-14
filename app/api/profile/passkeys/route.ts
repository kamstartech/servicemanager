import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    const passkeys = await prisma.adminWebPasskey.findMany({
      where: { userId: user.userId },
      select: {
        id: true,
        deviceName: true,
        createdAt: true,
        lastUsedAt: true,
        transports: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ passkeys });
  } catch (error: any) {
    console.error("Failed to fetch passkeys:", error);
    return NextResponse.json(
      { error: "Failed to fetch passkeys" },
      { status: 500 }
    );
  }
});
