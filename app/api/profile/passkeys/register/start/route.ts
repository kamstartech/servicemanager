import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

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

    // Generate challenge
    const challenge = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
    
    const options = {
      challenge,
      rp: {
        name: "Admin Panel",
        id: process.env.NEXT_PUBLIC_RP_ID || "localhost",
      },
      user: {
        id: Buffer.from(user.userId.toString()).toString('base64url'),
        name: adminUser.email,
        displayName: adminUser.name || adminUser.email,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },  // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      timeout: 60000,
      attestation: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        requireResidentKey: false,
        userVerification: "preferred",
      },
    };

    return NextResponse.json({ options });
  } catch (error: any) {
    console.error("Passkey registration start error:", error);
    return NextResponse.json(
      { error: "Failed to start passkey registration" },
      { status: 500 }
    );
  }
});
