import { NextRequest, NextResponse } from "next/server";
import { getUserFromAuthHeader, JWTPayload } from "./jwt";

/**
 * Middleware to require authentication
 * Usage in API routes:
 * 
 * export async function GET(request: NextRequest) {
 *   const user = await requireAuth(request);
 *   if (!user) {
 *     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *   }
 *   // User is authenticated, proceed with request
 * }
 */
export async function requireAuth(
  request: NextRequest
): Promise<JWTPayload | null> {
  const authHeader = request.headers.get("authorization");
  return getUserFromAuthHeader(authHeader);
}

/**
 * Check if user has specific context
 */
export function requireContext(
  user: JWTPayload | null,
  allowedContexts: string[]
): boolean {
  if (!user) return false;
  return allowedContexts.includes(user.context);
}

/**
 * Higher-order function to protect API routes
 * 
 * Usage:
 * export const GET = withAuth(async (request, user) => {
 *   // user is guaranteed to be authenticated
 *   return NextResponse.json({ userId: user.userId });
 * });
 */
export function withAuth(
  handler: (
    request: NextRequest,
    user: JWTPayload,
    ...args: any[]
  ) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest, ...args: any[]) => {
    const user = await requireAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Valid JWT token required" },
        { status: 401 }
      );
    }

    return handler(request, user, ...args);
  };
}

/**
 * Higher-order function to protect API routes with context check
 * 
 * Usage:
 * export const GET = withContextAuth(['MOBILE_BANKING', 'WALLET'], async (request, user) => {
 *   // user is guaranteed to be authenticated and have correct context
 *   return NextResponse.json({ userId: user.userId });
 * });
 */
export function withContextAuth(
  allowedContexts: string[],
  handler: (
    request: NextRequest,
    user: JWTPayload
  ) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest) => {
    const user = await requireAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Valid JWT token required" },
        { status: 401 }
      );
    }

    if (!requireContext(user, allowedContexts)) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: `Access denied. Required contexts: ${allowedContexts.join(", ")}`,
        },
        { status: 403 }
      );
    }

    return handler(request, user);
  };
}
