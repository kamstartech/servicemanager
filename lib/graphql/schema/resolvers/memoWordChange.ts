import { prisma } from "@/lib/db/prisma";
import { GraphQLError } from "graphql";
import bcrypt from "bcryptjs";

/**
 * Memo Word Change Resolvers
 * 
 * Handles secure memo word changes with OTP verification.
 * 
 * Flow:
 * 1. User calls requestMemoWordChangeOtp() - sends OTP to phone/email
 * 2. User calls setMemoWord(memoWord, otpCode) - verifies OTP and updates
 */

// In-memory OTP store (same pattern as password change)
// In production, consider using Redis for distributed systems
const otpStore = new Map<number, { code: string; expiresAt: Date }>();

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const memoWordChangeResolvers = {
  Mutation: {
    /**
     * Request OTP for memo word change
     * Sends OTP to user's phone number or email
     */
    requestMemoWordChangeOtp: async (_: unknown, __: unknown, context: any) => {
      try {
        const userId = context.userId;

        if (!userId) {
          throw new GraphQLError("Authentication required", {
            extensions: { code: "UNAUTHENTICATED" },
          });
        }

        // Get user details
        const user = await prisma.mobileUser.findUnique({
          where: { id: userId },
          include: { profile: true },
        });

        if (!user) {
          throw new GraphQLError("User not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        // Check if user already has a memo word set
        if (!user.secretHash) {
          throw new GraphQLError(
            "Memo word not set. Use setMemoWord without OTP for first-time setup.",
            {
              extensions: { code: "BAD_REQUEST" },
            }
          );
        }

        // Generate OTP
        const otpCode = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP
        otpStore.set(userId, { code: otpCode, expiresAt });

        // Get phone number or email for OTP delivery
        const phoneNumber = user.phoneNumber || user.profile?.phone;
        const email = user.profile?.email;

        // TODO: Send OTP via SMS or Email
        // For now, log it (in production, integrate with SMS/Email service)
        console.log(
          `📱 OTP for memo word change (User ID: ${userId}): ${otpCode}`
        );
        console.log(`Phone: ${phoneNumber}, Email: ${email}`);

        // In development, you might want to return the OTP
        // In production, NEVER return the OTP in the response
        return {
          success: true,
          message: "OTP sent successfully",
          // DEV ONLY: Remove this in production
          otpCode: process.env.NODE_ENV === "development" ? otpCode : undefined,
        };
      } catch (error) {
        console.error("Error requesting memo word change OTP:", error);
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError("Failed to send OTP", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
  },
};

/**
 * Verify OTP for memo word change
 * Called internally by the updated setMemoWord mutation
 */
export function verifyMemoWordChangeOTP(
  userId: number,
  otpCode: string
): boolean {
  const storedOTP = otpStore.get(userId);

  if (!storedOTP) {
    return false;
  }

  // Check if OTP expired
  if (new Date() > storedOTP.expiresAt) {
    otpStore.delete(userId);
    return false;
  }

  // Verify OTP
  if (storedOTP.code !== otpCode) {
    return false;
  }

  // OTP is valid, remove it (one-time use)
  otpStore.delete(userId);
  return true;
}
