import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db/prisma";
import { ApiKeyStatus } from "@prisma/client";

const JWT_SECRET =
  process.env.THIRD_PARTY_JWT_SECRET || process.env.JWT_SECRET || "change-me";
const secret = new TextEncoder().encode(JWT_SECRET);

export interface ThirdPartyJWTPayload {
  clientId: string;
  clientName: string;
  permissions: string[];
  allowedIps?: string[];
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
  iat?: number;
  exp?: number;
  iss?: string;
  sub?: string;
  jti?: string;
}

interface GenerateTokenOptions {
  clientId: string;
  name: string;
  description?: string;
  expiresIn?: string;
  permissions?: string[];
  createdBy?: number;
}

/**
 * Generate API token for third-party client
 */
export async function generateThirdPartyToken(
  options: GenerateTokenOptions
): Promise<{ token: string; tokenId: string; expiresAt: Date }> {
  const {
    clientId,
    name,
    description,
    expiresIn = "1y",
    permissions = ["registrations:read", "registrations:create"],
    createdBy,
  } = options;

  // Get client details from database
  const client = await prisma.thirdPartyClient.findUnique({
    where: { id: clientId },
  });

  if (!client || !client.isActive) {
    throw new Error("Client not found or inactive");
  }

  // Generate unique JWT ID for revocation tracking
  const jti = crypto.randomUUID();

  // Calculate expiration date
  const expirationMs = parseExpiration(expiresIn);
  const expiresAt = new Date(Date.now() + expirationMs);

  // Build payload
  const payload: Omit<ThirdPartyJWTPayload, "iat" | "exp" | "iss" | "sub"> = {
    clientId: client.id,
    clientName: client.name,
    permissions,
    allowedIps: client.allowedIps.length > 0 ? client.allowedIps : undefined,
    rateLimitPerMinute: client.rateLimitPerMinute,
    rateLimitPerHour: client.rateLimitPerHour,
    jti,
  };

  // Sign token
  const token = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("service-manager-api")
    .setSubject(clientId)
    .setJti(jti)
    .setExpirationTime(expiresIn)
    .sign(secret);

  // Store token metadata in database for revocation
  const apiKey = await prisma.thirdPartyApiKey.create({
    data: {
      clientId,
      keyHash: jti, // Store JTI instead of full token hash
      keyPrefix: token.substring(0, 47) + "...", // First 50 chars (47 + "...")
      name,
      description,
      permissions: permissions,
      expiresAt,
      status: ApiKeyStatus.ACTIVE,
      createdBy,
    },
  });

  return { token, tokenId: apiKey.id, expiresAt };
}

/**
 * Verify third-party API token
 */
export async function verifyThirdPartyToken(
  token: string,
  clientIp: string
): Promise<ThirdPartyJWTPayload | null> {
  try {
    // Verify signature and extract payload
    const { payload } = await jwtVerify(token, secret, {
      issuer: "service-manager-api",
    });

    const decoded = payload as unknown as ThirdPartyJWTPayload;

    if (!decoded.jti) {
      console.error("Token missing JTI");
      return null;
    }

    // Check if token is revoked (by JTI)
    const apiKey = await prisma.thirdPartyApiKey.findFirst({
      where: {
        keyHash: decoded.jti,
      },
    });

    if (!apiKey) {
      console.error("Token not found in database");
      return null;
    }

    // Check if manually revoked or suspended
    if (
      apiKey.status === ApiKeyStatus.REVOKED ||
      apiKey.status === ApiKeyStatus.SUSPENDED
    ) {
      console.error(`Token ${apiKey.status.toLowerCase()}`);
      return null;
    }

    // Check database expiration (backup check)
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      // Auto-update status to EXPIRED
      await prisma.thirdPartyApiKey
        .update({
          where: { id: apiKey.id },
          data: { status: ApiKeyStatus.EXPIRED },
        })
        .catch(console.error);
      console.error("Token expired");
      return null;
    }

    // Verify IP whitelist if configured
    if (decoded.allowedIps && decoded.allowedIps.length > 0) {
      if (!isIpAllowed(clientIp, decoded.allowedIps)) {
        console.error(`IP ${clientIp} not in whitelist:`, decoded.allowedIps);
        return null;
      }
    }

    // Update last used timestamp (async, don't wait)
    prisma.thirdPartyApiKey
      .update({
        where: { id: apiKey.id },
        data: {
          lastUsedAt: new Date(),
          usageCount: { increment: 1 },
        },
      })
      .catch(console.error);

    return decoded;
  } catch (error: any) {
    if (error?.code === "ERR_JWT_EXPIRED") {
      console.error("JWT token expired");
    } else {
      console.error("Token verification failed:", error);
    }
    return null;
  }
}

/**
 * Check if IP is in whitelist (supports CIDR notation)
 */
function isIpAllowed(clientIp: string, allowedIps: string[]): boolean {
  // Exact match
  if (allowedIps.includes(clientIp)) {
    return true;
  }

  // CIDR range check
  for (const allowed of allowedIps) {
    if (allowed.includes("/")) {
      if (ipInCidr(clientIp, allowed)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if IP is in CIDR range (simplified)
 * TODO: Use 'ip-cidr' package for production
 */
function ipInCidr(ip: string, cidr: string): boolean {
  // For now, just return false
  // In production, install and use: npm install ip-cidr
  console.warn("CIDR checking not fully implemented. Install 'ip-cidr' package.");
  return false;
}

/**
 * Parse expiration string to milliseconds
 */
function parseExpiration(exp: string): number {
  const unit = exp.slice(-1);
  const value = parseInt(exp.slice(0, -1));

  if (isNaN(value)) {
    throw new Error(`Invalid expiration format: ${exp}`);
  }

  switch (unit) {
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "y":
      return value * 365 * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Invalid expiration unit: ${unit}. Use 'h', 'd', or 'y'`);
  }
}

/**
 * Revoke token by JTI
 */
export async function revokeThirdPartyToken(
  jti: string,
  revokedBy?: number
): Promise<void> {
  await prisma.thirdPartyApiKey.updateMany({
    where: { keyHash: jti },
    data: {
      status: ApiKeyStatus.REVOKED,
      revokedAt: new Date(),
      revokedBy,
    },
  });
}

/**
 * Revoke token by ID
 */
export async function revokeThirdPartyTokenById(
  tokenId: string,
  revokedBy?: number
): Promise<void> {
  await prisma.thirdPartyApiKey.update({
    where: { id: tokenId },
    data: {
      status: ApiKeyStatus.REVOKED,
      revokedAt: new Date(),
      revokedBy,
    },
  });
}

/**
 * Suspend token (reversible)
 */
export async function suspendThirdPartyToken(
  tokenId: string
): Promise<void> {
  await prisma.thirdPartyApiKey.update({
    where: { id: tokenId },
    data: { status: ApiKeyStatus.SUSPENDED },
  });
}

/**
 * Reactivate suspended token
 */
export async function reactivateThirdPartyToken(
  tokenId: string
): Promise<void> {
  await prisma.thirdPartyApiKey.update({
    where: { id: tokenId },
    data: { status: ApiKeyStatus.ACTIVE },
  });
}
