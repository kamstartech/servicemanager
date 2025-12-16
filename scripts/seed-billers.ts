import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Replicate BillerType as const object since Enum is missing in DB introspection
const BillerType = {
    TNM_BUNDLES: "tnm_bundles",
    AIRTEL_VALIDATION: "airtel_validation"
} as const;

async function main() {
    console.log("Seeding billers...");

    // 1. TNM Bundles
    const tnm = await prisma.billerConfig.upsert({
        where: { billerType: BillerType.TNM_BUNDLES },
        update: {},
        create: {
            billerType: BillerType.TNM_BUNDLES,
            billerName: "TNM Bundles",
            displayName: "TNM Bundles",
            description: "Purchase TNM Data and Voice bundles",
            baseUrl: "https://fdh-esb.ngrok.dev",
            endpoints: {
                purchase: "/api/esb/topup/tnm/v1/ERSTopup",
                bundleDetails: "/api/internetbundles/{bundle_id}"
            },
            features: {
                isBundleBased: true,
                supportsValidation: false
            },
            validationRules: {
                minAmount: 1,
                maxAmount: 500000
            },
            inserted_at: new Date()
        }
    });
    console.log({ tnm });

    // 2. Airtel Validation / Topup
    const airtel = await prisma.billerConfig.upsert({
        where: { billerType: BillerType.AIRTEL_VALIDATION },
        update: {},
        create: {
            billerType: BillerType.AIRTEL_VALIDATION,
            billerName: "Airtel Money",
            displayName: "Airtel Money",
            description: "Airtel Money Services",
            baseUrl: "https://fdh-esb.ngrok.dev",
            endpoints: {
                validation: "/api/airtel-validation/accounts/{account_number}",
                purchase: "/api/esb/topup/airtel/v1/C2SReceiver"
            },
            features: {
                validationOnly: false,
                supportsValidation: true
            },
            validationRules: {
                minAmount: 1,
                maxAmount: 500000
            },
            inserted_at: new Date()
        }
    });
    console.log({ airtel });

    console.log("Seeding completed.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
