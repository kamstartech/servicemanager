import { WalletTier, MobileUserKYC } from '@prisma/client';

/**
 * Wallet Tier with user count
 */
export type WalletTierWithStats = WalletTier & {
  userCount: number;
};

/**
 * Mobile User KYC with tier
 */
export type MobileUserKYCWithTier = MobileUserKYC & {
  walletTier: WalletTier | null;
};

/**
 * Transaction summary for limit checking
 */
export interface TransactionSummary {
  dailyTotal: number;
  monthlyTotal: number;
  dailyCount: number;
  monthlyCount: number;
}

/**
 * Tier upgrade result
 */
export interface TierUpgradeResult {
  success: boolean;
  newTier?: WalletTier;
  error?: string;
  missingFields?: string[];
  failedRules?: Array<{ rule: string; reason: string }>;
}

/**
 * KYC completion status
 */
export interface KYCCompletionStatus {
  isComplete: boolean;
  completedFields: string[];
  missingFields: string[];
  completionPercentage: number;
}

/**
 * Tier comparison
 */
export interface TierComparison {
  currentTier: WalletTier | null;
  targetTier: WalletTier;
  improvements: {
    field: string;
    currentValue: string | number;
    newValue: string | number;
    increase: string;
  }[];
}

/**
 * Limit usage status
 */
export interface LimitUsageStatus {
  type: 'balance' | 'transaction' | 'count';
  used: number;
  limit: number;
  percentage: number;
  status: 'safe' | 'warning' | 'critical' | 'exceeded';
}
