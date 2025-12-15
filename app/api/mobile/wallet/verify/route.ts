import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * POST /api/mobile/wallet/verify
 * Verify OTP code and complete device registration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { verificationToken, otpCode } = body;

    if (!verificationToken || !otpCode) {
      return NextResponse.json(
        { error: 'Verification token and OTP code are required' },
        { status: 400 }
      );
    }

    // Find attempt
    const attempt = await prisma.deviceLoginAttempt.findUnique({
      where: { verificationToken },
      include: { mobileUser: true },
    });

    if (!attempt) {
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 404 }
      );
    }

    // Check expiry
    if (attempt.otpExpiresAt && new Date() > attempt.otpExpiresAt) {
      await prisma.deviceLoginAttempt.update({
        where: { id: attempt.id },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.json(
        { error: 'Verification code expired. Please request a new code.' },
        { status: 400 }
      );
    }

    // Check max attempts
    if (attempt.otpAttempts >= 5) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Please request a new code.' },
        { status: 400 }
      );
    }

    // Verify OTP
    if (attempt.otpCode !== otpCode) {
      await prisma.deviceLoginAttempt.update({
        where: { id: attempt.id },
        data: {
          otpAttempts: { increment: 1 },
          status: 'FAILED_OTP',
        },
      });
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // ✅ OTP VERIFIED - Create device!
    const device = await prisma.mobileDevice.create({
      data: {
        mobileUserId: attempt.mobileUserId!,
        deviceId: attempt.deviceId!,
        name: attempt.deviceName || 'Mobile Device',
        model: attempt.deviceModel,
        os: attempt.deviceOs,
        verifiedVia: 'OTP_SMS',
        verificationIp: attempt.ipAddress,
        verificationLocation: attempt.location,
        isActive: true,
      },
    });

    // Update attempt status
    await prisma.deviceLoginAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'VERIFIED',
        otpVerifiedAt: new Date(),
      },
    });

    // Fetch user's accounts, profile, and tier
    const accounts = await prisma.mobileUserAccount.findMany({
      where: { mobileUserId: attempt.mobileUserId! },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    const profile = await prisma.mobileUserProfile.findUnique({
      where: { mobileUserId: attempt.mobileUserId! },
    });

    const kyc = await prisma.mobileUserKYC.findUnique({
      where: { mobileUserId: attempt.mobileUserId! },
      include: { walletTier: true },
    });

    // Fetch app structure for WALLET context
    const appStructure = await prisma.appScreen.findMany({
      where: {
        context: 'WALLET',
        isActive: true,
      },
      include: {
        pages: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Generate session ID and JWT token
    const sessionId = crypto.randomUUID();
    const token = jwt.sign(
      {
        userId: attempt.mobileUserId,
        username: attempt.mobileUser!.username,
        phoneNumber: attempt.mobileUser!.phoneNumber,
        context: attempt.context,
        deviceId: device.deviceId,
        sessionId,
      },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'service-manager-admin',
        subject: String(attempt.mobileUserId),
      } as jwt.SignOptions
    );

    // Create device session
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await prisma.deviceSession.create({
      data: {
        deviceId: device.deviceId,
        mobileUserId: attempt.mobileUserId!,
        tokenHash,
        sessionId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ipAddress: attempt.ipAddress,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      token,
      message: 'Device verified successfully',
      user: {
        id: attempt.mobileUser!.id,
        context: attempt.mobileUser!.context,
        username: attempt.mobileUser!.username,
        phoneNumber: attempt.mobileUser!.phoneNumber,
        isActive: attempt.mobileUser!.isActive,
        accounts: accounts.map((acc) => ({
          id: acc.id,
          accountNumber: acc.accountNumber,
          accountName: acc.accountName,
          accountType: acc.accountType,
          currency: acc.currency,
          balance: acc.balance?.toString(),
          isPrimary: acc.isPrimary,
          isActive: acc.isActive,
        })),
        primaryAccount: accounts.find((acc) => acc.isPrimary)
          ? {
              id: accounts.find((acc) => acc.isPrimary)!.id,
              accountNumber: accounts.find((acc) => acc.isPrimary)!.accountNumber,
              accountName: accounts.find((acc) => acc.isPrimary)!.accountName,
              balance: accounts.find((acc) => acc.isPrimary)!.balance?.toString(),
              currency: accounts.find((acc) => acc.isPrimary)!.currency,
            }
          : null,
        profile: profile
          ? {
              firstName: profile.firstName,
              lastName: profile.lastName,
              email: profile.email,
              phone: profile.phone,
            }
          : null,
        tier: kyc?.walletTier
          ? {
              id: kyc.walletTier.id,
              name: kyc.walletTier.name,
              position: kyc.walletTier.position,
              maximumBalance: kyc.walletTier.maximumBalance.toString(),
              maxTransactionAmount: kyc.walletTier.maxTransactionAmount.toString(),
              dailyTransactionLimit: kyc.walletTier.dailyTransactionLimit.toString(),
              monthlyTransactionLimit: kyc.walletTier.monthlyTransactionLimit.toString(),
              dailyTransactionCount: kyc.walletTier.dailyTransactionCount,
              monthlyTransactionCount: kyc.walletTier.monthlyTransactionCount,
            }
          : null,
      },
      device: {
        id: device.id,
        name: device.name,
        model: device.model,
        os: device.os,
        isActive: device.isActive,
      },
      appStructure: appStructure.map((screen) => ({
        id: screen.id,
        name: screen.name,
        context: screen.context,
        icon: screen.icon,
        order: screen.order,
        pages: screen.pages.map((page) => ({
          id: page.id,
          name: page.name,
          icon: page.icon,
          order: page.order,
        })),
      })),
    });
  } catch (error: any) {
    console.error('OTP verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Verification failed' },
      { status: 500 }
    );
  }
}
