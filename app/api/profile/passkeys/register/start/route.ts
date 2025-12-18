import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { isoUint8Array } from "@simplewebauthn/server/helpers";
import { getRedis } from "@/lib/db/redis";

const RP_ID = process.env.NEXT_PUBLIC_RP_ID || "mobile-banking-v2.abakula.com";
const RP_NAME = "Admin Panel";

export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    const adminUser = await prisma.adminWebUser.findUnique({
      where: { id: user.userId },
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: isoUint8Array.fromUTF8String(user.userId.toString()),
      userName: adminUser.email,
      userDisplayName: adminUser.name || adminUser.email,
      timeout: 60000,
      attestationType: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        requireResidentKey: false,
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    // Store challenge in Redis with 5-minute expiry
    const challengeKey = `passkey:reg:challenge:${user.userId}`;
    const redis = await getRedis();
    await redis.setex(challengeKey, 300, options.challenge);

    return NextResponse.json({ options });
  } catch (error: any) {
    console.error("Passkey registration start error:", error);
    return NextResponse.json(
      { error: "Failed to start passkey registration" },
      { status: 500 }
    );
  }
});
