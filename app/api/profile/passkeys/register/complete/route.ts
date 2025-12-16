import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  VerifiedRegistrationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { redis } from "@/lib/db/redis";

const RP_ID = process.env.NEXT_PUBLIC_RP_ID || "mobile-banking-v2.abakula.com";
const EXPECTED_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL || "https://mobile-banking-v2.abakula.com";

export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    const { credential, deviceName } = await request.json();

    if (!credential || !deviceName) {
      return NextResponse.json(
        { error: "Credential and device name are required" },
        { status: 400 }
      );
    }

    // Get stored challenge from Redis
    const challengeKey = `passkey:reg:challenge:${user.userId}`;
    const expectedChallenge = await redis.get(challengeKey);

    if (!expectedChallenge) {
      return NextResponse.json(
        { error: "Challenge expired or not found. Please try again." },
        { status: 400 }
      );
    }

    // Verify the registration response
    let verification: VerifiedRegistrationResponse;
    try {
      verification = await verifyRegistrationResponse({
        response: credential as RegistrationResponseJSON,
        expectedChallenge,
        expectedOrigin: EXPECTED_ORIGIN,
        expectedRPID: RP_ID,
      });
    } catch (error: any) {
      console.error("Registration verification failed:", error);
      return NextResponse.json(
        { error: "Registration verification failed" },
        { status: 400 }
      );
    }

    const { verified, registrationInfo } = verification;

    if (!verified || !registrationInfo) {
      return NextResponse.json(
        { error: "Registration verification failed" },
        { status: 400 }
      );
    }

    const credentialPublicKey = registrationInfo.credential.publicKey;
    const credentialID = registrationInfo.credential.id;
    const counter = registrationInfo.credential.counter;
    const credentialBackedUp = registrationInfo.credentialBackedUp;
    const credentialDeviceType = registrationInfo.credentialDeviceType;
    const attestationObject = registrationInfo.attestationObject;

    // Store the passkey
    const passkey = await prisma.adminWebPasskey.create({
      data: {
        userId: user.userId,
        credentialId: typeof credentialID === 'string' ? credentialID : isoBase64URL.fromBuffer(credentialID),
        publicKey: isoBase64URL.fromBuffer(credentialPublicKey),
        deviceName,
        transports: credential.response.transports || [],
        counter: BigInt(counter),
        backupEligible: credentialBackedUp,
        backupState: credentialBackedUp,
      },
    });

    // Delete the challenge from Redis
    await redis.del(challengeKey);

    return NextResponse.json({ success: true, passkeyId: passkey.id });
  } catch (error: any) {
    console.error("Passkey registration complete error:", error);
    return NextResponse.json(
      { error: "Failed to complete passkey registration" },
      { status: 500 }
    );
  }
});
