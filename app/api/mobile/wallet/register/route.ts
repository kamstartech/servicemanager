import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { WalletTierService } from '@/lib/services/wallet-tiers';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

function maskContact(contact: string, method: string): string {
  if (method === 'SMS') {
    // Mask phone: 265991234567 -> ***1234567
    return contact.slice(0, 3) + '***' + contact.slice(-4);
  }
  // Mask email: user@example.com -> u***r@example.com
  const [local, domain] = contact.split('@');
  if (local.length <= 2) return contact;
  return local[0] + '***' + local[local.length - 1] + '@' + domain;
}

/**
 * POST /api/mobile/wallet/register
 * Register a new wallet user with automatic tier assignment
 * First device requires OTP verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      phoneNumber, 
      password, 
      username,
      deviceId,
      deviceName,
      deviceModel,
      deviceOs,
      ipAddress,
      location 
    } = body;

    // Validate required fields
    if (!phoneNumber || !password) {
      return NextResponse.json(
        { error: 'Phone number and password are required' },
        { status: 400 }
      );
    }

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required for first-time registration' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.mobileUser.findFirst({
      where: {
        phoneNumber,
        context: 'WALLET',
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this phone number already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.mobileUser.create({
      data: {
        context: 'WALLET',
        phoneNumber,
        username: username || phoneNumber,
        passwordHash,
        isActive: true,
      },
    });

    // Assign default tier
    const kyc = await WalletTierService.assignDefaultTier(user.id);

    // Create wallet account (phoneNumber as accountNumber)
    const walletAccount = await WalletTierService.getOrCreateWalletAccount(user.id);

    // Generate OTP for first device verification
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    const verificationToken = crypto.randomUUID();

    // Create device login attempt with OTP
    await prisma.deviceLoginAttempt.create({
      data: {
        mobileUserId: user.id,
        username: user.phoneNumber,
        context: 'WALLET',
        deviceId,
        deviceName: deviceName || 'Mobile Device',
        deviceModel,
        deviceOs,
        ipAddress,
        location,
        attemptType: 'PASSWORD_LOGIN',
        status: 'PENDING_VERIFICATION',
        otpCode,
        otpSentTo: phoneNumber,
        otpSentAt: new Date(),
        otpExpiresAt,
        verificationToken,
        attemptedAt: new Date(),
      },
    });

    // TODO: Send OTP via SMS service
    console.log(`📱 Wallet Registration OTP for ${phoneNumber}: ${otpCode}`);

    const maskedContact = maskContact(phoneNumber, 'SMS');

    // Return success with verification required
    return NextResponse.json(
      {
        success: true,
        requiresVerification: true,
        verificationMethod: 'SMS',
        verificationToken,
        maskedContact,
        message: `Verification code sent to ${maskedContact}`,
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          username: user.username,
          context: user.context,
          tier: {
            id: kyc.walletTier?.id,
            name: kyc.walletTier?.name,
            position: kyc.walletTier?.position,
            maximumBalance: kyc.walletTier?.maximumBalance.toString(),
            maxTransactionAmount: kyc.walletTier?.maxTransactionAmount.toString(),
            dailyTransactionLimit: kyc.walletTier?.dailyTransactionLimit.toString(),
            monthlyTransactionLimit: kyc.walletTier?.monthlyTransactionLimit.toString(),
          },
          account: {
            id: walletAccount.id,
            accountNumber: walletAccount.accountNumber,
            accountName: walletAccount.accountName,
            balance: (walletAccount.balance || 0).toString(),
            currency: walletAccount.currency,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Wallet registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mobile/wallet/register
 * Get registration requirements (default tier info)
 */
export async function GET() {
  try {
    const defaultTier = await prisma.walletTier.findFirst({
      where: { isDefault: true },
    });

    if (!defaultTier) {
      return NextResponse.json(
        { error: 'No default tier configured' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      defaultTier: {
        name: defaultTier.name,
        description: defaultTier.description,
        maximumBalance: defaultTier.maximumBalance.toString(),
        maxTransactionAmount: defaultTier.maxTransactionAmount.toString(),
        dailyTransactionLimit: defaultTier.dailyTransactionLimit.toString(),
        monthlyTransactionLimit: defaultTier.monthlyTransactionLimit.toString(),
        requiredKycFields: defaultTier.requiredKycFields,
      },
    });
  } catch (error: any) {
    console.error('Error fetching registration info:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch registration info' },
      { status: 500 }
    );
  }
}
