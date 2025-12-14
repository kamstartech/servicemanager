import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedWalletTiers() {
  console.log('🌱 Seeding wallet tiers...');

  // Create default tiers
  const tiers = await prisma.walletTier.createMany({
    data: [
      {
        name: 'Basic',
        description: 'Entry level wallet tier for new users',
        position: 1,
        isDefault: true,
        minimumBalance: 0,
        maximumBalance: 50000,
        maximumCreditLimit: 0,
        maximumDebtLimit: 0,
        minTransactionAmount: 100,
        maxTransactionAmount: 10000,
        dailyTransactionLimit: 20000,
        monthlyTransactionLimit: 100000,
        dailyTransactionCount: 10,
        monthlyTransactionCount: 50,
        requiredKycFields: [],
        kycRules: {}
      },
      {
        name: 'Silver',
        description: 'Verified users with basic KYC',
        position: 2,
        isDefault: false,
        minimumBalance: 0,
        maximumBalance: 500000,
        maximumCreditLimit: 50000,
        maximumDebtLimit: 50000,
        minTransactionAmount: 100,
        maxTransactionAmount: 100000,
        dailyTransactionLimit: 200000,
        monthlyTransactionLimit: 1000000,
        dailyTransactionCount: 20,
        monthlyTransactionCount: 100,
        requiredKycFields: ['date_of_birth', 'occupation'],
        kycRules: { minimum_age: 18 }
      },
      {
        name: 'Gold',
        description: 'Fully verified users with complete KYC',
        position: 3,
        isDefault: false,
        minimumBalance: 0,
        maximumBalance: 5000000,
        maximumCreditLimit: 500000,
        maximumDebtLimit: 500000,
        minTransactionAmount: 100,
        maxTransactionAmount: 1000000,
        dailyTransactionLimit: 2000000,
        monthlyTransactionLimit: 10000000,
        dailyTransactionCount: 50,
        monthlyTransactionCount: 500,
        requiredKycFields: [
          'date_of_birth',
          'occupation',
          'source_of_funds',
          'id_number'
        ],
        kycRules: {
          minimum_age: 18,
          id_required: true,
          source_of_funds_required: true
        }
      }
    ],
    skipDuplicates: true
  });

  console.log(`✅ Created ${tiers.count} wallet tiers`);

  // Optional: Create sample wallet user with account
  try {
    const defaultTier = await prisma.walletTier.findFirst({
      where: { isDefault: true }
    });

    if (defaultTier) {
      // Check if sample user already exists
      const existingUser = await prisma.mobileUser.findFirst({
        where: {
          phoneNumber: '+265888123456',
          context: 'WALLET'
        }
      });

      if (!existingUser) {
        // Create a sample wallet user
        const sampleUser = await prisma.mobileUser.create({
          data: {
            context: 'WALLET',
            phoneNumber: '+265888123456',
            isActive: true
          }
        });

        // Create wallet account (using phoneNumber as accountNumber)
        await prisma.mobileUserAccount.create({
          data: {
            mobileUserId: sampleUser.id,
            context: 'WALLET',
            accountNumber: sampleUser.phoneNumber!,
            accountName: 'Wallet Account',
            accountType: 'WALLET',
            currency: 'MWK',
            balance: 0,
            isPrimary: true,
            isActive: true
          }
        });

        // Create KYC record with default tier
        await prisma.mobileUserKYC.create({
          data: {
            mobileUserId: sampleUser.id,
            walletTierId: defaultTier.id
          }
        });

        // Create profile
        await prisma.mobileUserProfile.create({
          data: {
            mobileUserId: sampleUser.id,
            firstName: 'Sample',
            lastName: 'User',
            phone: '+265888123456'
          }
        });

        console.log('✅ Sample wallet user created with phone: +265888123456');
      } else {
        console.log('ℹ️  Sample wallet user already exists');
      }
    }
  } catch (error) {
    console.log('⚠️  Could not create sample user:', error);
  }

  console.log('✅ Wallet tiers seeding completed');
}

// Run if executed directly
if (require.main === module) {
  seedWalletTiers()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
