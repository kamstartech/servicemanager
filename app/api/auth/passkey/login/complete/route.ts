import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { redis } from "@/lib/db/redis";
import { generateToken } from "@/lib/auth/jwt";

const RP_ID = process.env.NEXT_PUBLIC_RP_ID || "localhost";
const EXPECTED_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * POST /api/auth/passkey/login/complete
 * Completes passkey authentication and creates session
 */
export async function POST(request: NextRequest) {
  try {
    const { credential, userId } = await request.json();

    if (!credential || !userId) {
      return NextResponse.json(
        { error: "Credential and user ID are required" },
        { status: 400 }
      );
    }

    // Get stored challenge from Redis
    const challengeKey = `passkey:challenge:${userId}`;
    const expectedChallenge = await redis.get(challengeKey);

    if (!expectedChallenge) {
      return NextResponse.json(
        { error: "Challenge expired or not found. Please try again." },
        { status: 400 }
      );
    }

    // Find the passkey
    const passkey = await prisma.adminWebPasskey.findFirst({
      where: {
        userId: parseInt(userId),
        credentialId: credential.id,
      },
      include: {
        user: true,
      },
    });

    if (!passkey) {
      return NextResponse.json(
        { error: "Passkey not found" },
        { status: 404 }
      );
    }

    if (!passkey.user.isActive) {
      return NextResponse.json(
        { error: "Account is not active" },
        { status: 401 }
      );
    }

    // Verify the authentication response
    let verification: VerifiedAuthenticationResponse;
    try {
      verification = await verifyAuthenticationResponse({
        response: credential as AuthenticationResponseJSON,
        expectedChallenge,
        expectedOrigin: EXPECTED_ORIGIN,
        expectedRPID: RP_ID,
        credential: {
          id: passkey.credentialId,
          publicKey: isoBase64URL.toBuffer(passkey.publicKey),
          counter: Number(passkey.counter),
          transports: passkey.transports as AuthenticatorTransport[],
        },
      });
    } catch (error: any) {
      console.error("Verification failed:", error);

      return NextResponse.json(
        { error: "Authentication verification failed" },
        { status: 401 }
      );
    }

    const { verified, authenticationInfo } = verification;

    if (!verified) {
      return NextResponse.json(
        { error: "Authentication verification failed" },
        { status: 401 }
      );
    }

    // Update passkey counter and last used timestamp
    await prisma.adminWebPasskey.update({
      where: { id: passkey.id },
      data: {
        counter: authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      },
    });

    // Delete the challenge from Redis
    await redis.del(challengeKey);
    await redis.del(`passkey:user:${expectedChallenge}`);

    // Generate JWT token
    const token = generateToken({
      userId: passkey.user.id,
      username: passkey.user.email,
      context: "ADMIN",
    });

    // Create response with token
    const response = NextResponse.json(
      {
        message: "Login successful",
        user: {
          id: passkey.user.id,
          email: passkey.user.email,
          name: passkey.user.name,
        },
      },
      { status: 200 }
    );

    // Set HTTP-only cookie with the token
    response.cookies.set({
      name: "admin_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
      domain: undefined,
    });

    return response;
  } catch (error: any) {
    console.error("Passkey login complete error:", error);
    return NextResponse.json(
      { error: "Failed to complete passkey authentication" },
      { status: 500 }
    );
  }
}
