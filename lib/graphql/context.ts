import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";
const INACTIVITY_TIMEOUT_MS = 5.5 * 60 * 1000; // 5.5 minutes

export interface GraphQLContext {
  userId?: number;
  deviceId?: string;
  sessionId?: string;
  token?: string;
}

export async function createGraphQLContext({
  req,
}: any): Promise<GraphQLContext> {
  const authHeader = req?.headers?.authorization;

  // No auth header = unauthenticated context
  if (!authHeader?.startsWith("Bearer ")) {
    return {};
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    // 1. Verify JWT signature and decode
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // 2. Hash token and lookup session
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const session = await prisma.deviceSession.findUnique({
      where: { tokenHash },
      include: { mobileUser: true },
    });

    // 3. Session not found or revoked
    if (!session || !session.isActive) {
      console.log("Session not found or inactive");
      return {};
    }

    // 4. Check user is active
    if (!session.mobileUser.isActive) {
      console.log("User account inactive");
      return {};
    }

    // 5. Check inactivity timeout (5.5 minutes)
    const now = new Date();
    const inactiveMs = now.getTime() - session.lastActivityAt.getTime();

    if (inactiveMs > INACTIVITY_TIMEOUT_MS) {
      console.log("Session expired due to inactivity");

      // Auto-revoke inactive session
      await prisma.deviceSession.update({
        where: { id: session.id },
        data: {
          isActive: false,
          revokedAt: now,
        },
      });

      return {};
    }

    // 6. Update last activity (async, don't block request)
    prisma.deviceSession
      .update({
        where: { id: session.id },
        data: { lastActivityAt: now },
      })
      .catch((err) => {
        console.error("Failed to update lastActivityAt:", err);
      });

    // 7. Return authenticated context
    return {
      userId: decoded.userId,
      deviceId: decoded.deviceId,
      sessionId: decoded.sessionId,
      token,
    };
  } catch (err: any) {
    console.error("Auth validation error:", err.message);
    return {};
  }
}
