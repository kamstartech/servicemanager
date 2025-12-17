import { MobileUserContext, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

// Generate a secure random password
function generatePassword(length = 16): string {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }

  return password;
}

// Seed admin user
async function seedAdminUser() {
  console.log("🌱 Seeding admin user...");

  const email = "jimmykamanga@gmail.com";
  const name = "Jimmy Kamanga";

  // Check if admin user already exists
  const existingUser = await prisma.adminWebUser.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log("   ⏭️  Admin user already exists, skipping");
    return;
  }

  // Generate a random secure password
  const generatedPassword = generatePassword(16);
  const passwordHash = await bcrypt.hash(generatedPassword, 10);

  // Create the admin user
  const adminUser = await prisma.adminWebUser.create({
    data: {
      email,
      name,
      passwordHash,
      isActive: true,
    },
  });

  console.log("   ✅ Admin user created:");
  console.log("      Email:", email);
  console.log("      Password:", generatedPassword);
  console.log("      ⚠️  SAVE THIS PASSWORD - it won't be shown again!");
}

// Seed wallet tiers
async function seedWalletTiers() {
  console.log("🌱 Seeding wallet tiers...");

  const existingTiers = await prisma.walletTier.count();
  if (existingTiers > 0) {
    console.log("   ⏭️  Wallet tiers already exist, skipping");
    return;
  }

  await prisma.walletTier.createMany({
    data: [
      {
        name: "Basic",
        description: "Entry level wallet tier for new users",
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
        kycRules: {},
      },
      {
        name: "Silver",
        description: "Verified users with basic KYC",
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
        requiredKycFields: ["date_of_birth", "occupation"],
        kycRules: { minimum_age: 18 },
      },
      {
        name: "Gold",
        description: "Fully verified users with complete KYC",
        position: 3,
        isDefault: false,
        minimumBalance: 0,
        maximumBalance: 5000000,
        maximumCreditLimit: 500000,
        maximumDebtLimit: 100000,
        minTransactionAmount: 100,
        maxTransactionAmount: 500000,
        dailyTransactionLimit: 1000000,
        monthlyTransactionLimit: 10000000,
        dailyTransactionCount: 50,
        monthlyTransactionCount: 200,
        requiredKycFields: ["date_of_birth", "occupation", "id_number"],
        kycRules: { minimum_age: 18, requires_id_verification: true },
      },
    ],
    skipDuplicates: true,
  });

  console.log("   ✅ Wallet tiers created");
}

async function seedMobileUsers() {
  console.log("🌱 Seeding mobile users...");

  const mobileBankingPhoneNumber = "+265991000001";
  const walletPhoneNumber = "+265991000002";
  const password = "Password123!";
  const passwordHash = await bcrypt.hash(password, 10);

  const existingMobileBankingUser = await prisma.mobileUser.findFirst({
    where: { phoneNumber: mobileBankingPhoneNumber },
    select: { id: true },
  });

  const mobileBankingUser =
    existingMobileBankingUser ||
    (await prisma.mobileUser.create({
      data: {
        context: MobileUserContext.MOBILE_BANKING,
        phoneNumber: mobileBankingPhoneNumber,
        username: "demo.mobile",
        customerNumber: "35042058",
        passwordHash,
        isActive: true,
      },
      select: { id: true },
    }));

  await prisma.mobileUserAccount.createMany({
    data: [
      {
        mobileUserId: mobileBankingUser.id,
        context: MobileUserContext.MOBILE_BANKING,
        accountNumber: "1520000114607",
        accountName: "Demo Mobile Banking",
        accountType: "CURRENT",
        currency: "MWK",
        isPrimary: true,
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });

  const existingWalletUser = await prisma.mobileUser.findFirst({
    where: { phoneNumber: walletPhoneNumber },
    select: { id: true },
  });

  const walletUser =
    existingWalletUser ||
    (await prisma.mobileUser.create({
      data: {
        context: MobileUserContext.WALLET,
        phoneNumber: walletPhoneNumber,
        username: "demo.wallet",
        passwordHash,
        isActive: true,
      },
      select: { id: true },
    }));

  await prisma.mobileUserAccount.createMany({
    data: [
      {
        mobileUserId: walletUser.id,
        context: MobileUserContext.WALLET,
        accountNumber: "265991000002",
        accountName: "Demo Wallet",
        accountType: "WALLET",
        currency: "MWK",
        isPrimary: true,
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });

  const defaultWalletTier = await prisma.walletTier.findFirst({
    where: { isDefault: true },
    select: { id: true },
  });

  if (defaultWalletTier) {
    await prisma.mobileUserKYC.upsert({
      where: { mobileUserId: walletUser.id },
      update: { walletTierId: defaultWalletTier.id },
      create: {
        mobileUserId: walletUser.id,
        walletTierId: defaultWalletTier.id,
      },
    });
  }

  console.log("   ✅ Mobile users seeded");
  console.log("      Demo MOBILE_BANKING phone:", mobileBankingPhoneNumber);
  console.log("      Demo WALLET phone:", walletPhoneNumber);
  console.log("      Demo password:", password);
}

// Seed biller configs
async function seedBillerConfigs() {
  console.log("🌱 Seeding biller configurations...");

  const existingBillers = await prisma.billerConfig.count();
  if (existingBillers > 0) {
    console.log("   ⏭️  Biller configs already exist, skipping");
    return;
  }

  const billers = [
    {
      billerType: "LWB_POSTPAID",
      billerName: "Lilongwe Water Board",
      displayName: "LWB Water Bill",
      description: "Lilongwe Water Board postpaid water bills",
      baseUrl: "https://lwb-api.example.com",
      endpoints: {
        accountDetails: "/soap/GetAccountDetails",
        payment: "/soap/PostPayment",
      },
      authentication: {
        type: "basic",
        username: "api_user",
        password: "change_me",
      },
      features: {
        supportsInvoice: false,
        supportsBalanceCheck: true,
      },
      validationRules: {
        accountNumberFormat: "^[0-9]{6,10}$",
        minAmount: 100,
        maxAmount: 1000000,
      },
    },
    {
      billerType: "BWB_POSTPAID",
      billerName: "Blantyre Water Board",
      displayName: "BWB Water Bill",
      description: "Blantyre Water Board postpaid water bills",
      baseUrl: "https://bwb-api.example.com",
      endpoints: {
        accountDetails: "/soap/GetAccountDetails",
        payment: "/soap/PostPayment",
      },
      authentication: {
        type: "basic",
        username: "api_user",
        password: "change_me",
      },
      features: {
        supportsInvoice: false,
        supportsBalanceCheck: true,
      },
      validationRules: {
        accountNumberFormat: "^[0-9]{6,10}$",
        minAmount: 100,
        maxAmount: 1000000,
      },
    },
  ];

  for (const biller of billers) {
    await prisma.billerConfig.upsert({
      where: { billerType: biller.billerType as any },
      update: {},
      create: biller as any,
    });
  }

  console.log(`   ✅ ${billers.length} biller configurations created`);
}

// Main seeder
async function main() {
  console.log("\n🚀 Starting database seeding...\n");

  try {
    await seedAdminUser();
    await seedWalletTiers();
    await seedMobileUsers();
    await seedBillerConfigs();

    console.log("\n✨ Database seeding completed successfully!\n");
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
