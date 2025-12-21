import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ESBSMSService } from "@/lib/services/sms";
import { emailService } from "@/lib/services/email";
import { GraphQLError } from "graphql";

// In-memory OTP storage for password change (use Redis in production)
const passwordChangeOtpStorage = new Map<
    number, // userId
    {
        otp: string;
        expiresAt: Date;
    }
>();

// Generate 6-digit OTP
function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export const changePasswordResolvers = {
    Mutation: {
        // Request OTP for password change
        requestPasswordChangeOtp: async (_: unknown, __: unknown, context: any) => {
            try {
                const userId = context.user?.userId;

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

                // Determine where to send OTP
                const sendSMS = !!(user.phoneNumber && user.smsNotifications);
                const email = user.profile?.email;
                const sendEmail = !!(email && user.emailNotifications);

                if (!sendSMS && !sendEmail) {
                    return {
                        success: false,
                        message:
                            "No phone number or email is enabled for verification on this account",
                    };
                }

                // Generate OTP
                const otp = generateOTP();

                // Store OTP (expires in 5 minutes)
                passwordChangeOtpStorage.set(userId, {
                    otp,
                    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
                });

                // Send OTP
                if (sendSMS) {
                    try {
                        await ESBSMSService.sendOTP(user.phoneNumber!, otp, user.id);
                    } catch (e) {
                        if (!sendEmail) {
                            passwordChangeOtpStorage.delete(userId);
                            throw e;
                        }
                    }
                }

                if (sendEmail) {
                    try {
                        await emailService.sendOTP(
                            email!,
                            otp,
                            user.username ?? `User ${userId}`
                        );
                    } catch (e) {
                        if (!sendSMS) {
                            passwordChangeOtpStorage.delete(userId);
                            throw e;
                        }
                    }
                }

                const channels: string[] = [];
                if (sendSMS) channels.push("SMS");
                if (sendEmail) channels.push("Email");

                return {
                    success: true,
                    message: `OTP sent via ${channels.join(" and ")}`,
                };
            } catch (error) {
                console.error("Error requesting password change OTP:", error);
                if (error instanceof GraphQLError) {
                    throw error;
                }
                return {
                    success: false,
                    message: "Failed to send OTP. Please try again.",
                };
            }
        },

        // Change password with OTP verification
        changePassword: async (
            _: unknown,
            {
                input,
            }: {
                input: {
                    oldPassword: string;
                    newPassword: string;
                    confirmPassword: string;
                    otp: string;
                };
            },
            context: any
        ) => {
            try {
                const userId = context.user?.userId;

                if (!userId) {
                    throw new GraphQLError("Authentication required", {
                        extensions: { code: "UNAUTHENTICATED" },
                    });
                }

                const { oldPassword, newPassword, confirmPassword, otp } = input;

                // Validate passwords match
                if (newPassword !== confirmPassword) {
                    return {
                        success: false,
                        message: "New passwords do not match",
                    };
                }

                // Validate password length
                if (newPassword.length < 8) {
                    return {
                        success: false,
                        message: "Password must be at least 8 characters long",
                    };
                }

                // Get user
                const user = await prisma.mobileUser.findUnique({
                    where: { id: userId },
                });

                if (!user || !user.passwordHash) {
                    throw new GraphQLError("User not found or password not set", {
                        extensions: { code: "NOT_FOUND" },
                    });
                }

                // Verify old password
                const oldPasswordMatch = await bcrypt.compare(
                    oldPassword,
                    user.passwordHash
                );
                if (!oldPasswordMatch) {
                    return {
                        success: false,
                        message: "Current password is incorrect",
                    };
                }

                // Verify OTP
                const stored = passwordChangeOtpStorage.get(userId);

                if (!stored) {
                    return {
                        success: false,
                        message: "OTP not found. Please request a new OTP.",
                    };
                }

                // Check expiration
                if (new Date() > stored.expiresAt) {
                    passwordChangeOtpStorage.delete(userId);
                    return {
                        success: false,
                        message: "OTP has expired. Please request a new OTP.",
                    };
                }

                // Verify OTP
                if (stored.otp !== otp) {
                    return {
                        success: false,
                        message: "Invalid OTP",
                    };
                }

                // Hash new password
                const hashedPassword = await bcrypt.hash(newPassword, 10);

                // Update password
                await prisma.mobileUser.update({
                    where: { id: userId },
                    data: { passwordHash: hashedPassword },
                });

                // Clean up OTP storage
                passwordChangeOtpStorage.delete(userId);

                // Optionally: Revoke all other sessions for security
                await prisma.deviceSession.updateMany({
                    where: {
                        mobileUserId: userId,
                        isActive: true,
                        sessionId: { not: context.user?.sessionId },
                    },
                    data: {
                        isActive: false,
                        revokedAt: new Date(),
                    },
                });

                return {
                    success: true,
                    message: "Password changed successfully",
                };
            } catch (error) {
                console.error("Error changing password:", error);
                if (error instanceof GraphQLError) {
                    throw error;
                }
                return {
                    success: false,
                    message: "Failed to change password. Please try again.",
                };
            }
        },
    },
};
