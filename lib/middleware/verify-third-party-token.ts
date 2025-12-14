import { NextRequest, NextResponse } from "next/server";
import { verifyThirdPartyToken } from "@/lib/auth/third-party-jwt";
import { prisma } from "@/lib/db/prisma";

interface VerificationResult {
  authorized: boolean;
  response?: NextResponse;
  clientId?: string;
  payload?: any;
}

/**
 * Verify third-party API request with JWT token
 */
export async function verifyThirdPartyRequest(
  request: NextRequest,
  requiredPermissions: string[] = []
): Promise<VerificationResult> {
  // Extract token from header
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Missing or invalid authorization header",
          message: "Please provide a valid Bearer token",
        },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.substring(7);

  // Get client IP
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Verify token
  const payload = await verifyThirdPartyToken(token, clientIp);
  if (!payload) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Invalid or expired token",
          message:
            "Your API token is invalid, expired, or has been revoked",
        },
        { status: 401 }
      ),
    };
  }

  // Check permissions
  if (requiredPermissions.length > 0) {
    const hasPermission = requiredPermissions.every(
      (perm) =>
        payload.permissions.includes(perm) ||
        payload.permissions.includes("*:*")
    );

    if (!hasPermission) {
      return {
        authorized: false,
        response: NextResponse.json(
          {
            success: false,
            error: "Insufficient permissions",
            message: `This token does not have the required permissions: ${requiredPermissions.join(", ")}`,
          },
          { status: 403 }
        ),
      };
    }
  }

  return { authorized: true, clientId: payload.clientId, payload };
}

/**
 * Log third-party API access
 */
export async function logThirdPartyAccess(
  clientId: string,
  apiKeyId: string | null,
  request: NextRequest,
  statusCode: number,
  responseTime?: number,
  errorMessage?: string
): Promise<void> {
  try {
    const { pathname, searchParams } = new URL(request.url);
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent");

    await prisma.thirdPartyAccessLog.create({
      data: {
        clientId,
        apiKeyId,
        method: request.method,
        endpoint: pathname,
        statusCode,
        responseTime,
        ipAddress,
        userAgent,
        errorMessage,
      },
    });
  } catch (error) {
    console.error("Failed to log third-party access:", error);
  }
}
