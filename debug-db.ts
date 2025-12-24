
import { prisma } from "./lib/db/prisma";

async function main() {
    try {
        console.log("Checking for SystemConfiguration model...");
        const count = await prisma.systemConfiguration.count();
        console.log("SystemConfiguration count:", count);

        console.log("Attempting to upsert a test value...");
        const result = await prisma.systemConfiguration.upsert({
            where: { key: "debug_test" },
            update: { value: "test_value" },
            create: { key: "debug_test", value: "test_value" },
        });
        console.log("Upsert successful:", result);
    } catch (error) {
        console.error("Error verifying SystemConfiguration:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
