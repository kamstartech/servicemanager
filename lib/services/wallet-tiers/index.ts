import { prisma } from '@/lib/db/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export interface TierLimitCheck {
  valid: boolean;
  reason?: string;
  limit?: string;
  field?: string;
}

export interface TierRequirementsCheck {
  meets: boolean;
  missingFields: string[];
  failedRules: Array<{ rule: string; reason: string }>;
}

export class WalletTierService {
  /**
   * Create or get wallet account for a mobile user
   * Wallet accounts use phoneNumber as accountNumber
   */
  static async getOrCreateWalletAccount(mobileUserId: number) {
    const mobileUser = await prisma.mobileUser.findUnique({
      where: { id: mobileUserId, context: 'WALLET' }
    });

    if (!mobileUser) {
      throw new Error('Mobile user not found or not a wallet user');
    }

    // Check if wallet account already exists
    let walletAccount = await prisma.mobileUserAccount.findFirst({
      where: {
        mobileUserId,
        context: 'WALLET'
      }
    });

    if (!walletAccount) {
      // Create wallet account using phoneNumber as accountNumber
      walletAccount = await prisma.mobileUserAccount.create({
        data: {
          mobileUserId,
          context: 'WALLET',
          accountNumber: mobileUser.phoneNumber || `WALLET_${mobileUserId}`,
          accountName: 'Wallet Account',
          accountType: 'WALLET',
          currency: 'MWK',
          balance: new Decimal(0),
          isPrimary: true,
          isActive: true
        }
      });
    }

    return walletAccount;
  }

  /**
   * Check if transaction amount is within tier limits
   */
  static async checkTransactionLimits(
    mobileUserId: number,
    amount: Decimal,
    dailyTotal: Decimal,
    monthlyTotal: Decimal,
    dailyCount: number,
    monthlyCount: number
  ): Promise<TierLimitCheck> {
    const mobileUser = await prisma.mobileUser.findUnique({
      where: { id: mobileUserId },
      include: {
        kyc: {
          include: { walletTier: true }
        }
      }
    });

    if (!mobileUser?.kyc?.walletTier) {
      return { valid: false, reason: 'No tier assigned', field: 'tier' };
    }

    const tier = mobileUser.kyc.walletTier;
    const amountNum = new Decimal(amount);
    const dailyTotalNum = new Decimal(dailyTotal);
    const monthlyTotalNum = new Decimal(monthlyTotal);

    // Check min amount
    if (amountNum.lessThan(tier.minTransactionAmount)) {
      return {
        valid: false,
        reason: 'Amount below minimum',
        limit: tier.minTransactionAmount.toString(),
        field: 'minTransactionAmount'
      };
    }

    // Check max amount
    if (amountNum.greaterThan(tier.maxTransactionAmount)) {
      return {
        valid: false,
        reason: 'Amount exceeds maximum',
        limit: tier.maxTransactionAmount.toString(),
        field: 'maxTransactionAmount'
      };
    }

    // Check daily limit
    if (dailyTotalNum.plus(amountNum).greaterThan(tier.dailyTransactionLimit)) {
      return {
        valid: false,
        reason: 'Daily limit exceeded',
        limit: tier.dailyTransactionLimit.toString(),
        field: 'dailyTransactionLimit'
      };
    }

    // Check monthly limit
    if (monthlyTotalNum.plus(amountNum).greaterThan(tier.monthlyTransactionLimit)) {
      return {
        valid: false,
        reason: 'Monthly limit exceeded',
        limit: tier.monthlyTransactionLimit.toString(),
        field: 'monthlyTransactionLimit'
      };
    }

    // Check daily count
    if (dailyCount >= tier.dailyTransactionCount) {
      return {
        valid: false,
        reason: 'Daily transaction count exceeded',
        limit: tier.dailyTransactionCount.toString(),
        field: 'dailyTransactionCount'
      };
    }

    // Check monthly count
    if (monthlyCount >= tier.monthlyTransactionCount) {
      return {
        valid: false,
        reason: 'Monthly transaction count exceeded',
        limit: tier.monthlyTransactionCount.toString(),
        field: 'monthlyTransactionCount'
      };
    }

    return { valid: true };
  }

  /**
   * Check if balance is within tier limits
   */
  static async checkBalanceLimits(
    mobileUserId: number,
    newBalance: Decimal
  ): Promise<TierLimitCheck> {
    const mobileUser = await prisma.mobileUser.findUnique({
      where: { id: mobileUserId },
      include: {
        kyc: {
          include: { walletTier: true }
        }
      }
    });

    if (!mobileUser?.kyc?.walletTier) {
      return { valid: false, reason: 'No tier assigned', field: 'tier' };
    }

    const tier = mobileUser.kyc.walletTier;
    const balanceNum = new Decimal(newBalance);

    if (balanceNum.lessThan(tier.minimumBalance)) {
      return {
        valid: false,
        reason: 'Balance below minimum',
        limit: tier.minimumBalance.toString(),
        field: 'minimumBalance'
      };
    }

    if (balanceNum.greaterThan(tier.maximumBalance)) {
      return {
        valid: false,
        reason: 'Balance exceeds maximum',
        limit: tier.maximumBalance.toString(),
        field: 'maximumBalance'
      };
    }

    return { valid: true };
  }

  /**
   * Get completed KYC fields for a wallet user
   */
  static getCompletedKycFields(kyc: any): string[] {
    const fields: string[] = [];

    if (kyc.dateOfBirth) fields.push('date_of_birth');
    if (kyc.occupation) fields.push('occupation');
    if (kyc.employerName) fields.push('employer_name');
    if (kyc.sourceOfFunds) fields.push('source_of_funds');
    if (kyc.idNumber) fields.push('id_number');
    if (kyc.idImage) fields.push('id_image');
    if (kyc.nrbValidation) fields.push('nrb_validation');

    return fields;
  }

  /**
   * Calculate age from date of birth
   */
  static calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Check if user meets tier requirements
   */
  static async meetsTierRequirements(
    mobileUserId: number,
    tierId: number
  ): Promise<TierRequirementsCheck> {
    const mobileUser = await prisma.mobileUser.findUnique({
      where: { id: mobileUserId },
      include: { kyc: true }
    });

    const tier = await prisma.walletTier.findUnique({
      where: { id: tierId }
    });

    if (!mobileUser || !tier) {
      return {
        meets: false,
        missingFields: [],
        failedRules: [{ rule: 'existence', reason: 'User or tier not found' }]
      };
    }

    const missingFields: string[] = [];
    const failedRules: Array<{ rule: string; reason: string }> = [];

    // Check required KYC fields
    if (mobileUser.kyc) {
      const completedFields = this.getCompletedKycFields(mobileUser.kyc);
      const requiredFields = tier.requiredKycFields || [];

      for (const field of requiredFields) {
        if (!completedFields.includes(field)) {
          missingFields.push(field);
        }
      }
    } else {
      // No KYC record at all
      const requiredFields = tier.requiredKycFields || [];
      missingFields.push(...requiredFields);
    }

    // Check KYC rules
    const rules = tier.kycRules as any;

    if (rules) {
      // Check minimum age
      if (rules.minimum_age && mobileUser.kyc?.dateOfBirth) {
        const age = this.calculateAge(mobileUser.kyc.dateOfBirth);
        if (age < rules.minimum_age) {
          failedRules.push({
            rule: 'minimum_age',
            reason: `User is ${age} years old, minimum required is ${rules.minimum_age}`
          });
        }
      } else if (rules.minimum_age && !mobileUser.kyc?.dateOfBirth) {
        failedRules.push({
          rule: 'minimum_age',
          reason: 'Date of birth not provided'
        });
      }

      // Check other boolean rules
      if (rules.id_required && !mobileUser.kyc?.idNumber) {
        failedRules.push({
          rule: 'id_required',
          reason: 'ID number is required'
        });
      }

      if (rules.employment_verification && !mobileUser.kyc?.employerName) {
        failedRules.push({
          rule: 'employment_verification',
          reason: 'Employment details required'
        });
      }

      if (rules.source_of_funds_required && !mobileUser.kyc?.sourceOfFunds) {
        failedRules.push({
          rule: 'source_of_funds_required',
          reason: 'Source of funds is required'
        });
      }

      if (rules.nrb_verification && !mobileUser.kyc?.nrbValidation) {
        failedRules.push({
          rule: 'nrb_verification',
          reason: 'NRB verification is required'
        });
      }
    }

    const meets = missingFields.length === 0 && failedRules.length === 0;

    return {
      meets,
      missingFields,
      failedRules
    };
  }

  /**
   * Get available upgrade tiers for a user
   */
  static async getAvailableUpgradeTiers(mobileUserId: number) {
    const mobileUser = await prisma.mobileUser.findUnique({
      where: { id: mobileUserId },
      include: {
        kyc: {
          include: { walletTier: true }
        }
      }
    });

    if (!mobileUser) return [];

    const currentPosition = mobileUser.kyc?.walletTier?.position || 0;

    // Get all tiers higher than current
    const tiers = await prisma.walletTier.findMany({
      where: {
        position: { gt: currentPosition }
      },
      orderBy: { position: 'asc' }
    });

    // Filter tiers user can upgrade to
    const available = [];
    for (const tier of tiers) {
      const check = await this.meetsTierRequirements(mobileUserId, tier.id);
      if (check.meets) {
        available.push(tier);
      }
    }

    return available;
  }

  /**
   * Get next eligible tier for a user
   */
  static async getNextEligibleTier(mobileUserId: number) {
    const availableTiers = await this.getAvailableUpgradeTiers(mobileUserId);
    return availableTiers.length > 0 ? availableTiers[0] : null;
  }

  /**
   * Assign default tier to a new wallet user
   */
  static async assignDefaultTier(mobileUserId: number) {
    const defaultTier = await prisma.walletTier.findFirst({
      where: { isDefault: true }
    });

    if (!defaultTier) {
      throw new Error('No default tier found');
    }

    // Check if user already has KYC record
    const existingKYC = await prisma.mobileUserKYC.findUnique({
      where: { mobileUserId }
    });

    if (existingKYC) {
      // Update existing
      return await prisma.mobileUserKYC.update({
        where: { mobileUserId },
        data: { walletTierId: defaultTier.id },
        include: { walletTier: true }
      });
    } else {
      // Create new
      return await prisma.mobileUserKYC.create({
        data: {
          mobileUserId,
          walletTierId: defaultTier.id
        },
        include: { walletTier: true }
      });
    }
  }

  /**
   * Get user's current tier
   */
  static async getUserTier(mobileUserId: number) {
    const kyc = await prisma.mobileUserKYC.findUnique({
      where: { mobileUserId },
      include: { walletTier: true }
    });

    return kyc?.walletTier || null;
  }

  /**
   * Check if user can be upgraded to specific tier
   */
  static async canUpgradeToTier(mobileUserId: number, newTierId: number): Promise<{
    canUpgrade: boolean;
    check: TierRequirementsCheck;
  }> {
    const check = await this.meetsTierRequirements(mobileUserId, newTierId);

    // Also verify the new tier is higher than current
    const currentTier = await this.getUserTier(mobileUserId);
    const newTier = await prisma.walletTier.findUnique({
      where: { id: newTierId }
    });

    const isHigherTier = !currentTier || (newTier && newTier.position > currentTier.position);

    return {
      canUpgrade: Boolean(check.meets && isHigherTier),
      check
    };
  }

  /**
   * Upgrade user to a new tier with validation
   */
  static async upgradeUserTier(mobileUserId: number, newTierId: number) {
    const { canUpgrade, check } = await this.canUpgradeToTier(mobileUserId, newTierId);

    if (!canUpgrade) {
      throw new Error(
        `Cannot upgrade to tier: ${check.missingFields.length > 0
          ? 'Missing fields: ' + check.missingFields.join(', ')
          : 'Requirements not met: ' + check.failedRules.map(r => r.reason).join(', ')
        }`
      );
    }

    const existingKYC = await prisma.mobileUserKYC.findUnique({
      where: { mobileUserId }
    });

    if (existingKYC) {
      return await prisma.mobileUserKYC.update({
        where: { mobileUserId },
        data: { walletTierId: newTierId },
        include: { walletTier: true }
      });
    } else {
      return await prisma.mobileUserKYC.create({
        data: {
          mobileUserId,
          walletTierId: newTierId
        },
        include: { walletTier: true }
      });
    }
  }

  /**
   * Get tier statistics
   */
  static async getTierStats(tierId: number) {
    const [tier, userCount] = await Promise.all([
      prisma.walletTier.findUnique({ where: { id: tierId } }),
      prisma.mobileUserKYC.count({ where: { walletTierId: tierId } })
    ]);

    return {
      tier,
      userCount
    };
  }

  /**
   * Get all tiers with user counts
   */
  static async getAllTiersWithStats() {
    const tiers = await prisma.walletTier.findMany({
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: { kycRecords: true }
        }
      }
    });

    return tiers.map(tier => ({
      ...tier,
      userCount: tier._count.kycRecords
    }));
  }
}
