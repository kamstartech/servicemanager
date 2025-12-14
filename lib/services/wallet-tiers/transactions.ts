import { prisma } from '@/lib/db/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionSummary } from './types';

/**
 * Get transaction totals for a user within a date range
 */
export async function getTransactionTotals(
  mobileUserId: number,
  startDate: Date,
  endDate: Date
): Promise<{ total: Decimal; count: number }> {
  // This is a placeholder - you'll need to integrate with your actual transaction model
  // For now, returning mock data structure
  
  // TODO: Replace with actual transaction query when transaction model is available
  // Example:
  // const transactions = await prisma.transaction.aggregate({
  //   where: {
  //     mobileUserId,
  //     createdAt: { gte: startDate, lte: endDate },
  //     status: 'COMPLETED'
  //   },
  //   _sum: { amount: true },
  //   _count: true
  // });
  
  return {
    total: new Decimal(0),
    count: 0
  };
}

/**
 * Get daily transaction summary for a user
 */
export async function getDailyTransactionSummary(
  mobileUserId: number
): Promise<TransactionSummary> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const daily = await getTransactionTotals(mobileUserId, today, tomorrow);
  
  return {
    dailyTotal: daily.total.toNumber(),
    monthlyTotal: 0, // Will be calculated separately
    dailyCount: daily.count,
    monthlyCount: 0
  };
}

/**
 * Get monthly transaction summary for a user
 */
export async function getMonthlyTransactionSummary(
  mobileUserId: number
): Promise<TransactionSummary> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  const monthly = await getTransactionTotals(mobileUserId, startOfMonth, endOfMonth);
  
  return {
    dailyTotal: 0, // Will be calculated separately
    monthlyTotal: monthly.total.toNumber(),
    dailyCount: 0,
    monthlyCount: monthly.count
  };
}

/**
 * Get complete transaction summary (daily + monthly)
 */
export async function getCompleteTransactionSummary(
  mobileUserId: number
): Promise<TransactionSummary> {
  const [daily, monthly] = await Promise.all([
    getDailyTransactionSummary(mobileUserId),
    getMonthlyTransactionSummary(mobileUserId)
  ]);
  
  return {
    dailyTotal: daily.dailyTotal,
    monthlyTotal: monthly.monthlyTotal,
    dailyCount: daily.dailyCount,
    monthlyCount: monthly.monthlyCount
  };
}

/**
 * Check if transaction would exceed limits
 */
export async function wouldExceedLimits(
  mobileUserId: number,
  amount: Decimal
): Promise<{
  wouldExceed: boolean;
  reason?: string;
  limit?: string;
}> {
  const summary = await getCompleteTransactionSummary(mobileUserId);
  
  const mobileUser = await prisma.mobileUser.findUnique({
    where: { id: mobileUserId },
    include: {
      kyc: {
        include: { walletTier: true }
      }
    }
  });
  
  if (!mobileUser?.kyc?.walletTier) {
    return {
      wouldExceed: true,
      reason: 'No tier assigned'
    };
  }
  
  const tier = mobileUser.kyc.walletTier;
  const amountNum = amount.toNumber();
  
  // Check single transaction limit
  if (amount.greaterThan(tier.maxTransactionAmount)) {
    return {
      wouldExceed: true,
      reason: 'Exceeds maximum transaction amount',
      limit: tier.maxTransactionAmount.toString()
    };
  }
  
  // Check daily limit
  if (summary.dailyTotal + amountNum > tier.dailyTransactionLimit.toNumber()) {
    return {
      wouldExceed: true,
      reason: 'Would exceed daily transaction limit',
      limit: tier.dailyTransactionLimit.toString()
    };
  }
  
  // Check monthly limit
  if (summary.monthlyTotal + amountNum > tier.monthlyTransactionLimit.toNumber()) {
    return {
      wouldExceed: true,
      reason: 'Would exceed monthly transaction limit',
      limit: tier.monthlyTransactionLimit.toString()
    };
  }
  
  // Check daily count
  if (summary.dailyCount >= tier.dailyTransactionCount) {
    return {
      wouldExceed: true,
      reason: 'Daily transaction count limit reached',
      limit: tier.dailyTransactionCount.toString()
    };
  }
  
  // Check monthly count
  if (summary.monthlyCount >= tier.monthlyTransactionCount) {
    return {
      wouldExceed: true,
      reason: 'Monthly transaction count limit reached',
      limit: tier.monthlyTransactionCount.toString()
    };
  }
  
  return { wouldExceed: false };
}

/**
 * Get remaining limits for a user
 */
export async function getRemainingLimits(mobileUserId: number) {
  const summary = await getCompleteTransactionSummary(mobileUserId);
  
  const mobileUser = await prisma.mobileUser.findUnique({
    where: { id: mobileUserId },
    include: {
      kyc: {
        include: { walletTier: true }
      }
    }
  });
  
  if (!mobileUser?.kyc?.walletTier) {
    return null;
  }
  
  const tier = mobileUser.kyc.walletTier;
  
  return {
    dailyAmount: {
      used: summary.dailyTotal,
      limit: tier.dailyTransactionLimit.toNumber(),
      remaining: tier.dailyTransactionLimit.toNumber() - summary.dailyTotal,
      percentage: Math.round((summary.dailyTotal / tier.dailyTransactionLimit.toNumber()) * 100)
    },
    monthlyAmount: {
      used: summary.monthlyTotal,
      limit: tier.monthlyTransactionLimit.toNumber(),
      remaining: tier.monthlyTransactionLimit.toNumber() - summary.monthlyTotal,
      percentage: Math.round((summary.monthlyTotal / tier.monthlyTransactionLimit.toNumber()) * 100)
    },
    dailyCount: {
      used: summary.dailyCount,
      limit: tier.dailyTransactionCount,
      remaining: tier.dailyTransactionCount - summary.dailyCount,
      percentage: Math.round((summary.dailyCount / tier.dailyTransactionCount) * 100)
    },
    monthlyCount: {
      used: summary.monthlyCount,
      limit: tier.monthlyTransactionCount,
      remaining: tier.monthlyTransactionCount - summary.monthlyCount,
      percentage: Math.round((summary.monthlyCount / tier.monthlyTransactionCount) * 100)
    }
  };
}
