
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
    const csvPath = path.join(process.cwd(), ".information", "banks_202512240908.csv");

    if (!fs.existsSync(csvPath)) {
        console.error(`CSV file not found at ${csvPath}`);
        process.exit(1);
    }

    const content = fs.readFileSync(csvPath, "utf-8");
    const lines = content.split("\n").filter(line => line.trim() !== "");

    // Skip header "id","bank_name","sort_code"
    const startLine = 1;

    console.log(`Found ${lines.length - startLine} banks (excluding header)`);
    let count = 0;

    for (let i = startLine; i < lines.length; i++) {
        const line = lines[i];
        // Simple CSV parse: assume "val","val","val"
        // Regex to match quoted strings
        const matches = line.match(/"([^"]*)"/g);

        if (!matches || matches.length < 3) {
            console.warn(`Skipping invalid line: ${line}`);
            continue;
        }

        // Remove quotes and trim
        const bankName = matches[1].replace(/"/g, "").trim();
        const sortCode = matches[2].replace(/"/g, "").trim();

        if (!bankName || !sortCode) {
            console.warn(`Skipping incomplete line: ${line}`);
            continue;
        }

        await prisma.externalBank.upsert({
            where: { code: sortCode },
            update: {
                name: bankName,
                isActive: true,
            },
            create: {
                name: bankName,
                code: sortCode,
                isActive: true,
            },
        });
        count++;
    }

    console.log(`Successfully seeded ${count} external banks.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
