import { PrismaClient, BillerType } from "@prisma/client";

const prisma = new PrismaClient();

const billerConfigs = [
  {
    billerType: BillerType.LWB_POSTPAID,
    billerName: "Lilongwe Water Board",
    displayName: "LWB Water Bill",
    description: "Lilongwe Water Board postpaid water bills",
    isActive: true,
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
    defaultCurrency: "MWK",
    supportedCurrencies: ["MWK"],
    timeoutMs: 30000,
    retryAttempts: 3,
    features: {
      supportsInvoice: false,
      supportsBalanceCheck: true,
      requiresTwoStep: false,
      supportsAccountLookup: true,
    },
    validationRules: {
      accountNumberFormat: "^[0-9]{6,10}$",
      minAmount: 100,
      maxAmount: 1000000,
    },
  },
  {
    billerType: BillerType.BWB_POSTPAID,
    billerName: "Blantyre Water Board",
    displayName: "BWB Water Bill",
    description: "Blantyre Water Board postpaid water bills",
    isActive: true,
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
    defaultCurrency: "MWK",
    supportedCurrencies: ["MWK"],
    timeoutMs: 30000,
    retryAttempts: 3,
    features: {
      supportsInvoice: false,
      supportsBalanceCheck: true,
      requiresTwoStep: false,
      supportsAccountLookup: true,
    },
    validationRules: {
      accountNumberFormat: "^[0-9]{6,10}$",
      minAmount: 100,
      maxAmount: 1000000,
    },
  },
  {
    billerType: BillerType.SRWB_POSTPAID,
    billerName: "Southern Region Water Board",
    displayName: "SRWB Postpaid",
    description: "Southern Region Water Board postpaid water bills",
    isActive: true,
    baseUrl: "https://srwb-api.example.com",
    endpoints: {
      accountDetails: "/soap/GetAccountDetails",
      payment: "/soap/PostPayment",
    },
    authentication: {
      type: "basic",
      username: "api_user",
      password: "change_me",
    },
    defaultCurrency: "MWK",
    supportedCurrencies: ["MWK"],
    timeoutMs: 30000,
    retryAttempts: 3,
    features: {
      supportsInvoice: false,
      supportsBalanceCheck: true,
      requiresTwoStep: false,
      supportsAccountLookup: true,
    },
    validationRules: {
      accountNumberFormat: "^[0-9]{6,10}$",
      minAmount: 100,
      maxAmount: 1000000,
    },
  },
  {
    billerType: BillerType.SRWB_PREPAID,
    billerName: "Southern Region Water Board",
    displayName: "SRWB Prepaid",
    description: "Southern Region Water Board prepaid water tokens",
    isActive: true,
    baseUrl: "https://srwb-api.example.com",
    endpoints: {
      invoice: "/api/GetInvoice",
      confirmInvoice: "/api/ConfirmInvoice",
    },
    authentication: {
      type: "api_key",
      apiKey: "change_me",
    },
    defaultCurrency: "MWK",
    supportedCurrencies: ["MWK"],
    timeoutMs: 30000,
    retryAttempts: 3,
    features: {
      supportsInvoice: true,
      supportsBalanceCheck: false,
      requiresTwoStep: true,
      supportsAccountLookup: false,
    },
    validationRules: {
      accountNumberFormat: "^[0-9]{6,10}$",
      minAmount: 500,
      maxAmount: 500000,
    },
  },
  {
    billerType: BillerType.MASM,
    billerName: "MASM",
    displayName: "MASM Electricity",
    description: "MASM electricity bills and prepaid tokens",
    isActive: true,
    baseUrl: "https://masm-api.example.com",
    endpoints: {
      accountDetails: "/soap/GetMeterDetails",
      payment: "/soap/PostPayment",
    },
    authentication: {
      type: "basic",
      username: "api_user",
      password: "change_me",
    },
    defaultCurrency: "MWK",
    supportedCurrencies: ["MWK"],
    timeoutMs: 30000,
    retryAttempts: 3,
    features: {
      supportsInvoice: false,
      supportsBalanceCheck: true,
      requiresTwoStep: false,
      supportsAccountLookup: true,
      requiresAccountType: true,
    },
    validationRules: {
      accountNumberFormat: "^[0-9]{6,12}$",
      accountType: "M",
      minAmount: 500,
      maxAmount: 2000000,
    },
  },
  {
    billerType: BillerType.REGISTER_GENERAL,
    billerName: "Register General",
    displayName: "Government Payments",
    description: "Government services, taxes, and licenses",
    isActive: true,
    baseUrl: "https://registrar-api.gov.mw",
    endpoints: {
      invoice: "/api/GetInvoice",
      confirmInvoice: "/api/ConfirmInvoice",
    },
    authentication: {
      type: "oauth2",
      clientId: "change_me",
      clientSecret: "change_me",
    },
    defaultCurrency: "MWK",
    supportedCurrencies: ["MWK"],
    timeoutMs: 45000,
    retryAttempts: 2,
    features: {
      supportsInvoice: true,
      supportsBalanceCheck: false,
      requiresTwoStep: true,
      supportsAccountLookup: false,
    },
    validationRules: {
      accountNumberFormat: "^[A-Z0-9]{8,20}$",
      minAmount: 1000,
      maxAmount: 10000000,
    },
  },
  {
    billerType: BillerType.TNM_BUNDLES,
    billerName: "TNM",
    displayName: "TNM Bundles",
    description: "TNM mobile data bundles",
    isActive: true,
    baseUrl: "https://tnm-api.example.com",
    endpoints: {
      bundleDetails: "/api/GetBundles",
      confirmBundle: "/api/PurchaseBundle",
    },
    authentication: {
      type: "api_key",
      apiKey: "change_me",
    },
    defaultCurrency: "MWK",
    supportedCurrencies: ["MWK"],
    timeoutMs: 20000,
    retryAttempts: 3,
    features: {
      supportsInvoice: false,
      supportsBalanceCheck: false,
      requiresTwoStep: true,
      supportsAccountLookup: false,
      isBundleBased: true,
    },
    validationRules: {
      accountNumberFormat: "^(088|099)[0-9]{7}$",
      minAmount: 100,
      maxAmount: 50000,
    },
  },
  {
    billerType: BillerType.AIRTEL_VALIDATION,
    billerName: "Airtel",
    displayName: "Airtel Validation",
    description: "Airtel mobile number validation",
    isActive: true,
    baseUrl: "https://airtel-api.example.com",
    endpoints: {
      accountDetails: "/api/ValidateNumber",
    },
    authentication: {
      type: "api_key",
      apiKey: "change_me",
    },
    defaultCurrency: "MWK",
    supportedCurrencies: ["MWK"],
    timeoutMs: 15000,
    retryAttempts: 2,
    features: {
      supportsInvoice: false,
      supportsBalanceCheck: false,
      requiresTwoStep: false,
      supportsAccountLookup: true,
      validationOnly: true,
    },
    validationRules: {
      accountNumberFormat: "^(088|099)[0-9]{7}$",
      minAmount: 0,
      maxAmount: 0,
    },
  },
];

async function seedBillers() {
  console.log("🌱 Seeding billers...");

  for (const config of billerConfigs) {
    await prisma.billerConfig.upsert({
      where: { billerType: config.billerType },
      update: config,
      create: config,
    });
    console.log(`✓ Seeded ${config.billerName}`);
  }

  console.log("✅ Billers seeded successfully!");
}

seedBillers()
  .catch((e) => {
    console.error("❌ Error seeding billers:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
