import crypto from "crypto";
import { AdminWebUser, MobileUser } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { extractTokenFromHeader, verifyToken, type JWTPayload } from "@/lib/auth/jwt";

const INACTIVITY_TIMEOUT_MS = 5.5 * 60 * 1000; // 5.5 minutes

export interface GraphQLContext {
  userId?: number;
  deviceId?: string;
  sessionId?: string;
  token?: string;
  auth?: JWTPayload;
  adminId?: number;
  adminUser?: AdminWebUser;
  mobileUser?: MobileUser;
  user?: MobileUser | AdminWebUser;
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
  const adminTokenFromCookies: string | undefined =
    typeof req?.cookies?.get === "function"
      ? req.cookies.get("admin_token")?.value
      : undefined;
  const adminTokenFromHeader: string | undefined = cookieHeader
    ?.split(";")
    .map((c: string) => c.trim())
    .find((c: string) => c.startsWith("admin_token="))
    ?.split("=")[1];
  const adminToken = adminTokenFromCookies || adminTokenFromHeader;

  const tokenFromHeader = extractTokenFromHeader(authHeader);
  const token = adminToken || tokenFromHeader;

  const deviceSession = (prisma as unknown as { deviceSession: any }).deviceSession;

  // No token = unauthenticated context
  if (!token) {
    return {};
  }

  try {
    // 1. Verify JWT signature and decode
    const decoded = verifyToken(token) as any;

    if (!decoded) {
      return {};
    }

    // Admin tokens are validated purely by JWT signature (cookie-based sessions)
    if (decoded.context === "ADMIN" || decoded.context === "ADMIN_WEB") {
      const adminUser = await prisma.adminWebUser.findUnique({
        where: { id: decoded.userId },
      });

      if (!adminUser || !adminUser.isActive) {
        return {};
      }

      return {
        token,
        auth: decoded,
        adminId: decoded.userId,
        adminUser,
        user: adminUser,
      };
    }

    // 2. Hash token and lookup session
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const session = await deviceSession.findUnique({
      where: { tokenHash },
      include: { mobileUser: true },
    });

    // 3. Session not found or revoked
    if (!session || !session.isActive) {
      console.log("Session not found or inactive");
      return {};
    }

    if (session.sessionId && session.sessionId !== decoded.sessionId) {
      console.log("Session mismatch");
      return {};
    }

    if (session.deviceId && session.deviceId !== decoded.deviceId) {
      console.log("Device mismatch");
      return {};
    }

    if (session.mobileUserId && session.mobileUserId !== decoded.userId) {
      console.log("User mismatch");
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
      await deviceSession.update({
        where: { id: session.id },
        data: {
          isActive: false,
          revokedAt: now,
        },
      });

      return {};
    }

    // 6. Update last activity (async, don't block request)
    deviceSession
      .update({
        where: { id: session.id },
        data: { lastActivityAt: now },
      })
      .catch((err: unknown) => {
        console.error("Failed to update lastActivityAt:", err);
      });

    // 7. Return authenticated context
    return {
      userId: decoded.userId,
      deviceId: decoded.deviceId,
      sessionId: decoded.sessionId,
      token,
      auth: decoded,
      mobileUser: session.mobileUser,
      user: session.mobileUser,
    };
  } catch (err: any) {
    console.error("Auth validation error:", err.message);
    return {};
  }
}
