import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Replicate BillerType as const object since Enum is missing in DB introspection
const BillerType = {
    TNM_BUNDLES: "tnm_bundles",
    AIRTEL_VALIDATION: "airtel_validation"
} as const;

async function main() {
    console.log("Seeding billers...");

    console.log("Skipping Airtel/TNM airtime billers - airtime is service-only.");

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
