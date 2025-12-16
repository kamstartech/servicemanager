import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const secret = new TextEncoder().encode(JWT_SECRET);

export interface JWTPayload {
  userId: number;
  username: string;
  context: string;
  phoneNumber?: string | null;
  iat?: number;
  exp?: number;
  iss?: string;
  sub?: string;
}

/**
 * Verify JWT token (Edge Runtime compatible)
 */
export async function verifyTokenEdge(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: "service-manager-admin",
    });
    return payload as unknown as JWTPayload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

/**
 * Generate JWT token (Edge Runtime compatible)
 */
export async function generateTokenEdge(
  payload: Omit<JWTPayload, "iat" | "exp" | "iss" | "sub">
): Promise<string> {
  const token = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("service-manager-admin")
    .setSubject(String(payload.userId))
    .setExpirationTime(process.env.JWT_EXPIRES_IN || "24h")
    .sign(secret);

  return token;
}
