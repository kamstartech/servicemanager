import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyTokenEdge } from "@/lib/auth/jwt-edge";

// Public routes that don't require authentication
const publicRoutes = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/setup-password",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/validate-reset-token",
  "/api/graphql", // Allow GraphQL for mobile login and public operations
  "/api/mobile/graphql",
  "/api/services/airtel-airtime-test",
  "/api/services/tnm-airtime-test",
];

// Third-party API routes (handled by endpoint-level JWT verification)
const thirdPartyRoutes = [
  "/api/registrations/status",
  "/api/registrations",
];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token from cookie or header
  const token =
    request.cookies.get("admin_token")?.value ||
    request.headers.get("authorization")?.split(" ")[1];

  // Debug logging (remove in production)
  if (pathname === "/" || pathname === "/login") {
    console.log(`[Middleware] Path: ${pathname}, Token exists: ${!!token}`);
  }

  // If user is authenticated and trying to access login page, redirect to dashboard
  if (pathname === "/login" && token) {
    const user = await verifyTokenEdge(token);
    if (user && user.context === "ADMIN") {
      console.log(`[Middleware] Authenticated user on /login, redirecting to /`);
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow third-party routes (they have their own JWT verification)
  if (thirdPartyRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check if token exists and is valid
  if (!token) {
    // Redirect to login for page routes
    if (!pathname.startsWith("/api")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // Return 401 for API routes
    return NextResponse.json(
      { error: "Unauthorized", message: "Authentication required" },
      { status: 401 }
    );
  }

  // Verify token
  const user = await verifyTokenEdge(token);

  if (!user) {
    // Clear invalid cookie
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set({
      name: "admin_token",
      value: "",
      maxAge: 0,
      path: "/",
    });

    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    return response;
  }

  // Check if admin context is required for admin panel routes
  if (!pathname.startsWith("/api") && user.context !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // For API routes, check context based on the endpoint
  if (pathname.startsWith("/api")) {
    // Admin-only API routes (admin panel operations)
    const adminOnlyApiRoutes = [
      "/api/admin",
    ];

    const isAdminOnlyRoute = adminOnlyApiRoutes.some(route => pathname.startsWith(route));

    // Block non-admin users from admin-specific APIs
    if (isAdminOnlyRoute && user.context !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden", message: "Admin access required" },
        { status: 403 }
      );
    }
  }

  // User is authenticated, continue
  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    "/((?!_next/static|_next/image|favicon.ico|images|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$).*)",
  ],
};
