import { prisma } from "@/lib/db";
import { BillerType } from "@prisma/client";

/**
 * Seed form schemas for biller configurations
 * These can be attached to workflows
 */

const billerConfigForm = {
  name: "Biller Configuration Form",
  description: "Form for creating and editing biller configurations",
  category: "billers",
  schema: {
    title: "Biller Configuration",
    type: "object",
    required: [
      "billerType",
      "billerName",
      "displayName",
      "baseUrl",
      "endpoints",
      "defaultCurrency",
      "timeoutMs",
      "retryAttempts",
      "features",
      "validationRules",
    ],
    properties: {
      billerType: {
        type: "string",
        title: "Biller Type",
        enum: Object.values(BillerType),
        enumNames: [
          "Register General",
          "BWB Postpaid",
          "LWB Postpaid",
          "SRWB Postpaid",
          "SRWB Prepaid",
          "MASM",
          "Airtel Validation",
          "TNM Bundles",
        ],
        description: "Select the type of biller",
      },
      billerName: {
        type: "string",
        title: "Biller Name",
        description: "Full name of the biller",
      },
      displayName: {
        type: "string",
        title: "Display Name",
        description: "User-facing name for the biller",
      },
      description: {
        type: "string",
        title: "Description",
        description: "Brief description of the biller",
      },
      isActive: {
        type: "boolean",
        title: "Active",
        default: true,
        description: "Enable or disable this biller",
      },
      baseUrl: {
        type: "string",
        title: "Base URL",
        format: "uri",
        description: "API base URL",
        placeholder: "https://api.example.com",
      },
      endpoints: {
        type: "object",
        title: "API Endpoints",
        description: "Map of endpoint names to paths",
        properties: {
          accountDetails: {
            type: "string",
            title: "Account Details Endpoint",
          },
          payment: {
            type: "string",
            title: "Payment Endpoint",
          },
          invoice: {
            type: "string",
            title: "Invoice Endpoint",
          },
          confirmInvoice: {
            type: "string",
            title: "Confirm Invoice Endpoint",
          },
          bundleDetails: {
            type: "string",
            title: "Bundle Details Endpoint",
          },
          confirmBundle: {
            type: "string",
            title: "Confirm Bundle Endpoint",
          },
        },
      },
      authentication: {
        type: "object",
        title: "Authentication",
        description: "API authentication configuration",
        properties: {
          type: {
            type: "string",
            title: "Auth Type",
            enum: ["basic", "api_key", "bearer", "oauth2"],
            enumNames: ["Basic Auth", "API Key", "Bearer Token", "OAuth2"],
          },
          username: {
            type: "string",
            title: "Username",
          },
          password: {
            type: "string",
            title: "Password",
            format: "password",
          },
          apiKey: {
            type: "string",
            title: "API Key",
            format: "password",
          },
          token: {
            type: "string",
            title: "Bearer Token",
            format: "password",
          },
          clientId: {
            type: "string",
            title: "Client ID",
          },
          clientSecret: {
            type: "string",
            title: "Client Secret",
            format: "password",
          },
        },
        dependencies: {
          type: {
            oneOf: [
              {
                properties: {
                  type: { enum: ["basic"] },
                  username: { type: "string" },
                  password: { type: "string" },
                },
                required: ["username", "password"],
              },
              {
                properties: {
                  type: { enum: ["api_key"] },
                  apiKey: { type: "string" },
                },
                required: ["apiKey"],
              },
              {
                properties: {
                  type: { enum: ["bearer"] },
                  token: { type: "string" },
                },
                required: ["token"],
              },
              {
                properties: {
                  type: { enum: ["oauth2"] },
                  clientId: { type: "string" },
                  clientSecret: { type: "string" },
                },
                required: ["clientId", "clientSecret"],
              },
            ],
          },
        },
      },
      defaultCurrency: {
        type: "string",
        title: "Default Currency",
        default: "MWK",
        pattern: "^[A-Z]{3}$",
        description: "3-letter currency code",
      },
      supportedCurrencies: {
        type: "array",
        title: "Supported Currencies",
        items: {
          type: "string",
          pattern: "^[A-Z]{3}$",
        },
        default: ["MWK"],
        description: "List of supported currency codes",
      },
      timeoutMs: {
        type: "integer",
        title: "Timeout (milliseconds)",
        default: 30000,
        minimum: 5000,
        maximum: 120000,
        description: "Request timeout in milliseconds",
      },
      retryAttempts: {
        type: "integer",
        title: "Retry Attempts",
        default: 3,
        minimum: 0,
        maximum: 5,
        description: "Number of retry attempts on failure",
      },
      features: {
        type: "object",
        title: "Features",
        description: "Feature flags for this biller",
        properties: {
          supportsInvoice: {
            type: "boolean",
            title: "Supports Invoice",
            default: false,
          },
          supportsBalanceCheck: {
            type: "boolean",
            title: "Supports Balance Check",
            default: false,
          },
          requiresTwoStep: {
            type: "boolean",
            title: "Requires Two-Step",
            default: false,
          },
          supportsAccountLookup: {
            type: "boolean",
            title: "Supports Account Lookup",
            default: false,
          },
          requiresAccountType: {
            type: "boolean",
            title: "Requires Account Type",
            default: false,
          },
          isBundleBased: {
            type: "boolean",
            title: "Is Bundle Based",
            default: false,
          },
          validationOnly: {
            type: "boolean",
            title: "Validation Only",
            default: false,
          },
        },
      },
      validationRules: {
        type: "object",
        title: "Validation Rules",
        description: "Input validation rules",
        properties: {
          accountNumberFormat: {
            type: "string",
            title: "Account Number Format (Regex)",
            description: "Regular expression for account number validation",
            placeholder: "^[0-9]{6,10}$",
          },
          accountType: {
            type: "string",
            title: "Account Type",
            description: "Required account type (e.g., 'M' for MASM meters)",
          },
          minAmount: {
            type: "number",
            title: "Minimum Amount",
            default: 0,
            description: "Minimum transaction amount",
          },
          maxAmount: {
            type: "number",
            title: "Maximum Amount",
            description: "Maximum transaction amount",
          },
        },
      },
    },
  },
  isActive: true,
  isPublic: false,
  allowMultiple: true,
  requiresAuth: true,
};

async function seedBillerForms() {
  console.log("🌱 Seeding biller forms...");

  const form = await prisma.form.upsert({
    where: {
      // Find by name and category combo (you might need to adjust this)
      name: billerConfigForm.name,
    },
    update: billerConfigForm,
    create: {
      ...billerConfigForm,
      createdBy: 1, // System user
    },
  });

  console.log(`✓ Created/Updated form: ${form.name} (ID: ${form.id})`);
  console.log("✅ Biller forms seeded successfully!");
  
  return form;
}

// Run if executed directly
if (require.main === module) {
  seedBillerForms()
    .catch((e) => {
      console.error("❌ Error seeding forms:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedBillerForms, billerConfigForm };
