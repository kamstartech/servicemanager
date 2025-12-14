import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";

export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    const { credential, deviceName } = await request.json();

    if (!credential || !deviceName) {
      return NextResponse.json(
        { error: "Credential and device name are required" },
        { status: 400 }
      );
    }

    // In a production app, verify the attestation using @simplewebauthn/server
    
    const passkey = await prisma.adminWebPasskey.create({
      data: {
        userId: user.userId,
        credentialId: credential.id,
        publicKey: credential.response.attestationObject,
        deviceName,
        transports: credential.response.transports || [],
        counter: 0,
      },
    });

    return NextResponse.json({ success: true, passkeyId: passkey.id });
  } catch (error: any) {
    console.error("Passkey registration complete error:", error);
    return NextResponse.json(
      { error: "Failed to complete passkey registration" },
      { status: 500 }
    );
  }
});
