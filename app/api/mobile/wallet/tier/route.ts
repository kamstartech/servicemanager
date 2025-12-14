import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { WalletTierService } from '@/lib/services/wallet-tiers';
import { getRemainingLimits } from '@/lib/services/wallet-tiers/transactions';

/**
 * GET /api/mobile/wallet/tier?userId=123
 * Get current tier information and usage for a wallet user
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userIdStr = searchParams.get('userId');

    if (!userIdStr) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    const userId = parseInt(userIdStr);

    // Verify user exists and is a wallet user
    const user = await prisma.mobileUser.findFirst({
      where: {
        id: userId,
        context: 'WALLET',
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Wallet user not found' },
        { status: 404 }
      );
    }

    // Get user's tier
    const tier = await WalletTierService.getUserTier(userId);

    if (!tier) {
      return NextResponse.json(
        { error: 'No tier assigned to user' },
        { status: 404 }
      );
    }

    // Get KYC info
    const kyc = await prisma.mobileUserKYC.findUnique({
      where: { mobileUserId: userId },
    });

    // Get remaining limits
    const limits = await getRemainingLimits(userId);

    // Get available upgrade tiers
    const availableUpgrades = await WalletTierService.getAvailableUpgradeTiers(userId);

    return NextResponse.json({
      success: true,
      currentTier: {
        id: tier.id,
        name: tier.name,
        description: tier.description,
        position: tier.position,
        minimumBalance: tier.minimumBalance.toString(),
        maximumBalance: tier.maximumBalance.toString(),
        minTransactionAmount: tier.minTransactionAmount.toString(),
        maxTransactionAmount: tier.maxTransactionAmount.toString(),
        dailyTransactionLimit: tier.dailyTransactionLimit.toString(),
        monthlyTransactionLimit: tier.monthlyTransactionLimit.toString(),
        dailyTransactionCount: tier.dailyTransactionCount,
        monthlyTransactionCount: tier.monthlyTransactionCount,
        requiredKycFields: tier.requiredKycFields,
      },
      kyc: {
        kycComplete: kyc?.kycComplete || false,
        completedFields: WalletTierService.getCompletedKycFields(kyc),
        missingFields: tier.requiredKycFields.filter(
          (field) => !WalletTierService.getCompletedKycFields(kyc).includes(field)
        ),
      },
      limits: limits || {
        dailyAmount: { used: 0, limit: tier.dailyTransactionLimit.toNumber(), remaining: tier.dailyTransactionLimit.toNumber(), percentage: 0 },
        monthlyAmount: { used: 0, limit: tier.monthlyTransactionLimit.toNumber(), remaining: tier.monthlyTransactionLimit.toNumber(), percentage: 0 },
        dailyCount: { used: 0, limit: tier.dailyTransactionCount, remaining: tier.dailyTransactionCount, percentage: 0 },
        monthlyCount: { used: 0, limit: tier.monthlyTransactionCount, remaining: tier.monthlyTransactionCount, percentage: 0 },
      },
      availableUpgrades: availableUpgrades.map((t) => ({
        id: t.id,
        name: t.name,
        position: t.position,
        maximumBalance: t.maximumBalance.toString(),
        dailyTransactionLimit: t.dailyTransactionLimit.toString(),
      })),
    });
  } catch (error: any) {
    console.error('Error fetching tier info:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tier info' },
      { status: 500 }
    );
  }
}
