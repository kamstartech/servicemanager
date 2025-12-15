import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { extractTokenFromHeader, verifyToken, type JWTPayload } from "@/lib/auth/jwt";

const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";
const INACTIVITY_TIMEOUT_MS = 5.5 * 60 * 1000; // 5.5 minutes

export interface GraphQLContext {
  userId?: number;
  deviceId?: string;
  sessionId?: string;
  token?: string;
  auth?: JWTPayload;
}

export async function createGraphQLContext({
  req,
}: any): Promise<GraphQLContext> {
  const getHeader = (name: string): string | undefined => {
    const headers = req?.headers;
    if (!headers) return undefined;

    // Fetch API Headers instance (GraphQL Yoga)
    if (typeof headers.get === "function") {
      return headers.get(name) ?? undefined;
    }

    // Node/Next style object
    return headers[name] ?? headers[name.toLowerCase()] ?? undefined;
  };

  const authHeader = getHeader("authorization");

  const cookieHeader: string | undefined = getHeader("cookie");
  const adminToken = cookieHeader
    ?.split(";")
    .map((c: string) => c.trim())
    .find((c: string) => c.startsWith("admin_token="))
    ?.split("=")[1];

  const tokenFromHeader = extractTokenFromHeader(authHeader);
  const token = adminToken || tokenFromHeader;

  // No token = unauthenticated context
  if (!token) {
    return {};
  }

  const decoded = verifyToken(token);
  if (decoded) {
    return { auth: decoded, token };
  }

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
      auth: decoded,
    };
  } catch (err: any) {
    console.error("Auth validation error:", err.message);
    return {};
  }
}
