import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

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

export function verifyToken(token: string): JWTPayload | null {
  try {
    // @ts-ignore - TypeScript overload issue with jwt.verify
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

export function generateToken(payload: Omit<JWTPayload, "iat" | "exp" | "iss" | "sub">): string {
  // @ts-ignore - TypeScript overload issue with jwt.sign
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    issuer: "service-manager-admin",
    subject: String(payload.userId),
  });
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    console.error("JWT decode failed:", error);
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }
  return Date.now() >= decoded.exp * 1000;
}

export function extractTokenFromHeader(authHeader?: string | null): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0] === "Bearer") {
    return parts[1];
  }
  return authHeader;
}

export function getUserFromAuthHeader(authHeader?: string | null): JWTPayload | null {
  const token = extractTokenFromHeader(authHeader);
  if (!token) return null;
  return verifyToken(token);
}
