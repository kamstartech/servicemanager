import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  generateAuthenticationOptions,
} from "@simplewebauthn/server";
import { getRedis } from "@/lib/db/redis";

const RP_ID = process.env.NEXT_PUBLIC_RP_ID || "mobile-banking-v2.abakula.com";

/**
 * POST /api/auth/passkey/login/start
 * Initiates passkey authentication
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    console.log("[PasskeyLoginStart] request", { email: email ? String(email) : null });

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find user and their passkeys
    const user = await prisma.adminWebUser.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        passkeys: {
          where: { 
            // Only active passkeys (not explicitly deleted)
          },
          select: {
            credentialId: true,
            transports: true,
          },
        },
      },
    });

    if (!user) {
      // Don't reveal if user exists
      return NextResponse.json(
        { error: "No passkeys found for this account" },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account is not active" },
        { status: 401 }
      );
    }

    if (user.passkeys.length === 0) {
      return NextResponse.json(
        { error: "No passkeys registered for this account" },
        { status: 404 }
      );
    }

    // Prepare allowed credentials
    const allowCredentials = user.passkeys.map(
      (passkey) => ({
        id: passkey.credentialId,
        type: "public-key" as const,
        transports: passkey.transports as AuthenticatorTransport[],
      })
    );

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials,
      userVerification: "preferred",
      timeout: 60000,
    });

    // Store challenge in Redis with 5-minute expiry
    const challengeKey = `passkey:challenge:${user.id}`;
    const redis = await getRedis();
    await redis.setex(challengeKey, 300, options.challenge); // 5 minutes

    // Also store user ID for the challenge for lookup
    const userKey = `passkey:user:${options.challenge}`;
    await redis.setex(userKey, 300, user.id.toString());

    return NextResponse.json({
      options,
      userId: user.id, // Send back for frontend to track
    });
  } catch (error: any) {
    console.error("Passkey login start error:", error);
    return NextResponse.json(
      { error: "Failed to start passkey authentication" },
      { status: 500 }
    );
  }
}
