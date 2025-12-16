import { prisma } from "@/lib/db/prisma";
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { isoUint8Array } from "@simplewebauthn/server/helpers";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";

// Constants
const RP_ID = process.env.RP_ID || "service-manager.local";
const RP_NAME = "Service Manager Mobile";
const EXPECTED_ORIGIN = process.env.EXPECTED_ORIGIN || "android:apk-key-hash:..." || "http://localhost:3000";

const challengeStore = new Map<string, string>();

const JWT_SECRET: Secret =
    process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN: SignOptions["expiresIn"] =
    (process.env.JWT_EXPIRES_IN as SignOptions["expiresIn"]) || "24h";

// Helper to convert base64url string to Uint8Array
function base64UrlToUint8Array(base64: string): Uint8Array {
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const base64Standard = (base64 + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    return new Uint8Array(Buffer.from(base64Standard, 'base64'));
}

async function issueMobileUserSecret(mobileUserId: number): Promise<string> {
    const secret = crypto.randomBytes(32).toString("base64url");
    const secretHash = await bcrypt.hash(secret, 12);

    await prisma.mobileUser.update({
        where: { id: mobileUserId },
        data: { secretHash },
    });

    return secret;
}

export const passkeyResolvers = {
    Mutation: {
        // -------------------------------------------------------------------------
        // Registration
        // -------------------------------------------------------------------------
        async registerPasskeyStart(
            _parent: unknown,
            args: { username: string; context: string }
        ) {
            const { username, context } = args;

            const user = await prisma.mobileUser.findFirst({
                where: {
                    username,
                    context: context as any,
                    isActive: true,
                },
                include: { devices: true },
            });

            if (!user) throw new Error("User not found");

            const options = await generateRegistrationOptions({
                rpName: RP_NAME,
                rpID: RP_ID,
                userID: isoUint8Array.fromUTF8String(String(user.id)),
                userName: user.username || user.phoneNumber || `user-${user.id}`,
                // Don't exclude credentials here to keep it simple, 
                // but in prod you probably want to prevent re-registering same device
                attestationType: "none",
                authenticatorSelection: {
                    residentKey: "preferred",
                    userVerification: "preferred",
                    authenticatorAttachment: "platform",
                },
            });

            challengeStore.set(`reg-${user.id}`, options.challenge);

            return JSON.stringify(options);
        },

        async registerPasskeyComplete(
            _parent: unknown,
            args: {
                username: string;
                context: string;
                response: string;
                deviceInfo?: string;
            }
        ) {
            const { username, context, response } = args;
            const responseJson = JSON.parse(response);
            const deviceInfo = args.deviceInfo ? JSON.parse(args.deviceInfo) : {};

            const user = await prisma.mobileUser.findFirst({
                where: { username, context: context as any },
            });

            if (!user) throw new Error("User not found");

            const expectedChallenge = challengeStore.get(`reg-${user.id}`);
            if (!expectedChallenge) throw new Error("Registration session expired");

            let verification;
            try {
                verification = await verifyRegistrationResponse({
                    response: responseJson,
                    expectedChallenge,
                    expectedOrigin: EXPECTED_ORIGIN,
                    expectedRPID: RP_ID,
                });
            } catch (error) {
                console.error("Passkey verification failed:", error);
                throw new Error("Verification failed");
            }

            const { verified, registrationInfo } = verification;

            if (verified && registrationInfo) {
                // credential.id is a string (base64url)
                // credential.publicKey is Uint8Array
                const credentialID = registrationInfo.credential.id;
                const credentialPublicKey = Buffer.from(registrationInfo.credential.publicKey).toString("base64url");
                const counter = registrationInfo.credential.counter;

                // Ensure we save credentialId as base64url string
                const newDevice = await prisma.mobileDevice.create({
                    data: {
                        mobileUserId: user.id,
                        credentialId: credentialID,
                        publicKey: credentialPublicKey,
                        counter: BigInt(counter),
                        transports: responseJson.response.transports || ["internal"],
                        name: deviceInfo.name || "Mobile Device",
                        model: deviceInfo.model,
                        os: deviceInfo.os,
                        deviceId: deviceInfo.deviceId,
                    },
                });

                challengeStore.delete(`reg-${user.id}`);

                return {
                    success: true,
                    device: {
                        ...newDevice,
                        id: newDevice.id,
                        credentialId: newDevice.credentialId,
                        createdAt: newDevice.createdAt.toISOString(),
                        updatedAt: newDevice.updatedAt.toISOString(),
                        counter: newDevice.counter?.toString() || "0",
                    },
                };
            }

            throw new Error("Verification failed");
        },

        // -------------------------------------------------------------------------
        // Authentication
        // -------------------------------------------------------------------------
        async loginWithPasskeyStart(
            _parent: unknown,
            args: { username: string; context: string }
        ) {
            const { username, context } = args;

            const user = await prisma.mobileUser.findFirst({
                where: {
                    username,
                    context: context as any,
                    isActive: true,
                },
                include: { devices: { where: { isActive: true } } },
            });

            if (!user) throw new Error("User not found");

            const options = await generateAuthenticationOptions({
                rpID: RP_ID,
                allowCredentials: user.devices.map((device: any) => ({
                    id: device.credentialId, // base64url string
                    type: "public-key",
                    transports: device.transports as any[],
                })),
                userVerification: "preferred",
            });

            challengeStore.set(`auth-${user.id}`, options.challenge);

            return JSON.stringify(options);
        },

        async loginWithPasskeyComplete(
            _parent: unknown,
            args: { username: string; context: string; response: string }
        ) {
            const { username, context, response } = args;
            const responseJson = JSON.parse(response);

            const user = await prisma.mobileUser.findFirst({
                where: { username, context: context as any },
                include: { devices: true },
            });

            if (!user) throw new Error("User not found");

            const expectedChallenge = challengeStore.get(`auth-${user.id}`);
            if (!expectedChallenge) throw new Error("Login session expired");

            const credentialId = responseJson.id;
            const device = user.devices.find((d: any) => d.credentialId === credentialId && d.isActive);

            if (!device) throw new Error("Device not found or inactive");

            let verification;
            try {
                verification = await verifyAuthenticationResponse({
                    response: responseJson,
                    expectedChallenge,
                    expectedOrigin: EXPECTED_ORIGIN,
                    expectedRPID: RP_ID,
                    authenticator: {
                        // Need to reconstruct the authenticator matching the stored device
                        credentialID: device.credentialId, // base64url string
                        credentialPublicKey: base64UrlToUint8Array(device.publicKey || ""), // Uint8Array
                        counter: Number(device.counter), // number
                        transports: device.transports as any[],
                    },
                } as any);
            } catch (error) {
                console.error("Auth verification failed:", error);
                throw new Error("Verification failed");
            }

            const { verified, authenticationInfo } = verification;

            if (verified) {
                await prisma.mobileDevice.update({
                    where: { id: device.id },
                    data: {
                        counter: BigInt(authenticationInfo.newCounter),
                        lastUsedAt: new Date(),
                    },
                });

                challengeStore.delete(`auth-${user.id}`);

                // Generate session ID and JWT token
                const sessionId = crypto.randomUUID();
                const token = jwt.sign(
                    {
                        userId: user.id,
                        username: user.username,
                        context: user.context,
                        phoneNumber: user.phoneNumber,
                        deviceId: device.id,
                        sessionId,
                    },
                    JWT_SECRET,
                    {
                        expiresIn: JWT_EXPIRES_IN as any,
                        issuer: "service-manager-admin",
                        subject: String(user.id),
                    }
                );

                // Create device session
                const tokenHash = crypto
                    .createHash("sha256")
                    .update(token)
                    .digest("hex");

                await prisma.deviceSession.create({
                    data: {
                        deviceId: device.deviceId || device.id,
                        mobileUserId: user.id,
                        tokenHash,
                        sessionId,
                        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                        isActive: true,
                    },
                });

                const secret = await issueMobileUserSecret(user.id);

                // Fetch accounts and profile
                const accounts = await prisma.mobileUserAccount.findMany({
                    where: { mobileUserId: user.id },
                    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
                });

                const profile = await prisma.mobileUserProfile.findUnique({
                    where: { mobileUserId: user.id },
                });

                // Fetch app structure for user's context
                const appStructure = await prisma.appScreen.findMany({
                    where: {
                        context: user.context,
                        isActive: true,
                    },
                    include: {
                        pages: {
                            where: { isActive: true },
                            orderBy: { order: "asc" },
                        },
                    },
                    orderBy: { order: "asc" },
                });

                return {
                    success: true,
                    token,
                    secret,
                    message: "Login successful",
                    devicePending: false,
                    requiresVerification: false,
                    user: {
                        id: user.id,
                        context: user.context,
                        username: user.username,
                        phoneNumber: user.phoneNumber,
                        customerNumber: user.customerNumber,
                        accountNumber: user.accountNumber,
                        isActive: user.isActive,
                        accounts: accounts.map((acc: any) => ({
                            id: acc.id,
                            accountNumber: acc.accountNumber,
                            accountName: acc.accountName,
                            accountType: acc.accountType,
                            currency: acc.currency,
                            balance: acc.balance?.toString(),
                            isPrimary: acc.isPrimary,
                            isActive: acc.isActive,
                            createdAt: acc.createdAt.toISOString(),
                            updatedAt: acc.updatedAt.toISOString(),
                        })),
                        primaryAccount: accounts.find((acc: any) => acc.isPrimary)
                            ? {
                                id: accounts.find((acc: any) => acc.isPrimary)!.id,
                                accountNumber: accounts.find((acc: any) => acc.isPrimary)!.accountNumber,
                                accountName: accounts.find((acc: any) => acc.isPrimary)!.accountName,
                                accountType: accounts.find((acc: any) => acc.isPrimary)!.accountType,
                                currency: accounts.find((acc: any) => acc.isPrimary)!.currency,
                                balance: accounts.find((acc: any) => acc.isPrimary)!.balance?.toString(),
                                isPrimary: true,
                                isActive: accounts.find((acc: any) => acc.isPrimary)!.isActive,
                                createdAt: accounts.find((acc: any) => acc.isPrimary)!.createdAt.toISOString(),
                                updatedAt: accounts.find((acc: any) => acc.isPrimary)!.updatedAt.toISOString(),
                            }
                            : null,
                        profile: profile
                            ? {
                                id: profile.id,
                                mobileUserId: profile.mobileUserId,
                                firstName: profile.firstName,
                                lastName: profile.lastName,
                                email: profile.email,
                                phone: profile.phone,
                                address: profile.address,
                                city: profile.city,
                                country: profile.country,
                                zip: profile.zip,
                                createdAt: profile.createdAt.toISOString(),
                                updatedAt: profile.updatedAt.toISOString(),
                            }
                            : null,
                        createdAt: user.createdAt.toISOString(),
                        updatedAt: user.updatedAt.toISOString(),
                    },
                    appStructure: appStructure.map((screen: any) => ({
                        id: screen.id,
                        name: screen.name,
                        context: screen.context,
                        icon: screen.icon,
                        order: screen.order,
                        isActive: screen.isActive,
                        isTesting: screen.isTesting,
                        pages: screen.pages.map((page: any) => ({
                            id: page.id,
                            name: page.name,
                            icon: page.icon,
                            order: page.order,
                            isActive: page.isActive,
                            isTesting: page.isTesting,
                            screenId: page.screenId,
                            createdAt: page.createdAt.toISOString(),
                            updatedAt: page.updatedAt.toISOString(),
                        })),
                        createdAt: screen.createdAt.toISOString(),
                        updatedAt: screen.updatedAt.toISOString(),
                    })),
                };
            }

            throw new Error("Verification failed");
        },

        // -------------------------------------------------------------------------
        // Management
        // -------------------------------------------------------------------------
        async revokeDevice(_parent: unknown, args: { deviceId: string }) {
            await prisma.mobileDevice.update({
                where: { id: args.deviceId },
                data: { isActive: false },
            });
            return true;
        },

        async approveDevice(_parent: unknown, args: { deviceId: string }) {
            await prisma.mobileDevice.update({
                where: { id: args.deviceId },
                data: { isActive: true },
            });
            return true;
        },

        async deleteDevice(_parent: unknown, args: { deviceId: string }) {
            await prisma.mobileDevice.delete({
                where: { id: args.deviceId },
            });
            return true;
        },
    },

    Query: {
        async mobileUserDevices(_parent: unknown, args: { userId: string }) {
            try {
                const userId = parseInt(args.userId);
                if (isNaN(userId)) {
                    console.error(`Invalid userId for mobileUserDevices: ${args.userId}`);
                    return [];
                }

                const devices = await prisma.mobileDevice.findMany({
                    where: { mobileUserId: userId },
                    orderBy: { updatedAt: 'desc' }
                });

                return devices.map((d: any) => ({
                    ...d,
                    createdAt: d.createdAt.toISOString(),
                    updatedAt: d.updatedAt.toISOString(),
                    lastUsedAt: d.lastUsedAt?.toISOString() || null,
                    counter: d.counter?.toString() || "0",
                }));
            } catch (error) {
                console.error("Error fetching mobileUserDevices:", error);
                return [];
            }
        }
    }
};
