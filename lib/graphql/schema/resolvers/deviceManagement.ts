import { prisma } from "@/lib/db/prisma";
import type { GraphQLContext } from "@/lib/graphql/context";
import crypto from "crypto";
import { ESBSMSService } from "@/lib/services/sms";
import { emailService } from "@/lib/services/email";

function maskContact(contact: string, type: "SMS" | "EMAIL"): string {
    if (type === "EMAIL") {
        const [username, domain] = contact.split("@");
        const maskedUsername =
            username.substring(0, 2) + "***" + username.substring(username.length - 1);
        return `${maskedUsername}@${domain}`;
    } else {
        // SMS
        return contact.substring(0, 3) + "***" + contact.substring(contact.length - 3);
    }
}

export const deviceManagementResolvers = {
    Mutation: {
        async requestPrimaryDeviceOtp(
            _: unknown,
            args: { deviceId: string },
            context: GraphQLContext
        ) {
            if (!context.userId) {
                throw new Error("Authentication required");
            }

            const { deviceId } = args;

            // Validate device belongs to user
            const device = await prisma.mobileDevice.findFirst({
                where: {
                    deviceId,
                    mobileUserId: context.userId,
                    isActive: true,
                },
            });

            if (!device) {
                throw new Error("Device not found or does not belong to you");
            }

            // Check if device is already primary
            if (device.isPrimary) {
                throw new Error("This device is already set as primary");
            }

            // Get user info for sending OTP
            const user = await prisma.mobileUser.findUnique({
                where: { id: context.userId },
                include: {
                    profile: true,
                },
            });

            if (!user) {
                throw new Error("User not found");
            }

            // Generate OTP
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
            const verificationToken = crypto.randomUUID();

            // Determine verification method
            const email = user.profile?.email;
            const sendSMS = !!(user.phoneNumber && user.smsNotifications);
            const sendEmail = !!(email && user.emailNotifications);

            if (!sendSMS && !sendEmail) {
                throw new Error(
                    "No phone number or email is enabled for verification on this account"
                );
            }

            const verificationMethod =
                sendSMS && sendEmail ? "SMS_EMAIL" : sendSMS ? "SMS" : "EMAIL";

            const maskedContacts: string[] = [];
            const sentToDetails: string[] = [];

            if (sendSMS) {
                maskedContacts.push(maskContact(user.phoneNumber!, "SMS"));
                sentToDetails.push(user.phoneNumber!);
            }
            if (sendEmail) {
                maskedContacts.push(maskContact(email!, "EMAIL"));
                sentToDetails.push(email!);
            }

            const maskedContact = maskedContacts.join(" and ");
            const sentTo = sentToDetails.join(", ");

            // Store OTP in DeviceLoginAttempt (reusing existing infrastructure)
            await prisma.deviceLoginAttempt.upsert({
                where: {
                    mobileUserId_deviceId: {
                        mobileUserId: context.userId,
                        deviceId,
                    },
                },
                create: {
                    mobileUserId: context.userId,
                    deviceId,
                    deviceName: device.name,
                    deviceModel: device.model,
                    deviceOs: device.os,
                    attemptType: "OTP_VERIFY",
                    status: "PENDING_VERIFICATION",
                    otpCode,
                    otpSentTo: sentTo,
                    otpSentAt: new Date(),
                    otpExpiresAt,
                    verificationToken,
                    otpAttempts: 0,
                },
                update: {
                    otpCode,
                    otpSentTo: sentTo,
                    otpSentAt: new Date(),
                    otpExpiresAt,
                    verificationToken,
                    otpAttempts: 0, // Reset attempts on new request
                    status: "PENDING_VERIFICATION",
                },
            });

            // Send OTP to enabled channels
            if (sendSMS) {
                const smsResult = await ESBSMSService.sendOTP(
                    user.phoneNumber!,
                    otpCode,
                    context.userId
                );
                if (!smsResult.success && !sendEmail) {
                    throw new Error(smsResult.error || "Failed to send OTP via SMS");
                }
            }

            if (sendEmail) {
                await emailService.sendOTP(email!, otpCode, user.username ?? "");
            }

            console.log(
                `Primary device OTP sent to user ${context.userId} for device ${deviceId}`
            );

            return {
                success: true,
                verificationToken,
                maskedContact,
                verificationMethod,
            };
        },

        async setPrimaryDevice(
            _: unknown,
            args: {
                deviceId: string;
                otpCode: string;
                verificationToken: string;
            },
            context: GraphQLContext
        ) {
            if (!context.userId) {
                throw new Error("Authentication required");
            }

            const { deviceId, otpCode, verificationToken } = args;

            // Find OTP attempt record
            const attempt = await prisma.deviceLoginAttempt.findFirst({
                where: {
                    mobileUserId: context.userId,
                    deviceId,
                    verificationToken,
                    attemptType: "OTP_VERIFY",
                },
            });

            if (!attempt) {
                throw new Error("Invalid verification session");
            }

            // Check expiry
            if (attempt.otpExpiresAt && new Date() > attempt.otpExpiresAt) {
                await prisma.deviceLoginAttempt.update({
                    where: { id: attempt.id },
                    data: { status: "EXPIRED" },
                });
                throw new Error("Verification code expired. Please request a new code.");
            }

            // Check max attempts
            if (attempt.otpAttempts >= 5) {
                throw new Error("Too many failed attempts. Please request a new code.");
            }

            // Verify OTP
            if (attempt.otpCode !== otpCode) {
                await prisma.deviceLoginAttempt.update({
                    where: { id: attempt.id },
                    data: {
                        otpAttempts: { increment: 1 },
                        status: "FAILED_OTP",
                    },
                });
                throw new Error("Invalid verification code");
            }

            // OTP verified - proceed with setting primary device
            const updatedDevice = await prisma.$transaction(async (tx) => {
                // Set all user's devices to non-primary
                await tx.mobileDevice.updateMany({
                    where: { mobileUserId: context.userId },
                    data: { isPrimary: false },
                });

                // Set the specified device as primary
                const updated = await tx.mobileDevice.updateMany({
                    where: {
                        mobileUserId: context.userId,
                        deviceId,
                    },
                    data: { isPrimary: true },
                });

                // Mark attempt as verified
                await tx.deviceLoginAttempt.update({
                    where: { id: attempt.id },
                    data: {
                        status: "VERIFIED",
                        otpVerifiedAt: new Date(),
                    },
                });

                return updated;
            });

            // Fetch and return the updated device
            const device = await prisma.mobileDevice.findFirst({
                where: {
                    mobileUserId: context.userId,
                    deviceId,
                },
            });

            console.log(
                `Primary device set to ${deviceId} for user ${context.userId}`
            );

            return device!;
        },
    },
};
