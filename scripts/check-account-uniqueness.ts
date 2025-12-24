
import { PrismaClient } from '@prisma/client';

async function main() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('Please provide DATABASE_URL environment variable');
        process.exit(1);
    }

    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: databaseUrl,
            },
        },
    });

    try {
        console.log('Checking for duplicate Account Numbers...');

        // Group by accountNumber
        const accounts = await prisma.mobileUserAccount.findMany({
            select: {
                accountNumber: true,
                context: true,
                id: true,
                mobileUserId: true
            }
        });

        const map = new Map<string, typeof accounts>();

        accounts.forEach(acc => {
            // Normalize account number? usually strict string match
            const key = acc.accountNumber;
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key)!.push(acc);
        });

        let duplicatesFound = false;
        map.forEach((group, key) => {
            if (group.length > 1) {
                duplicatesFound = true;
                console.log(`Duplicate found for AccountNumber '${key}':`);
                group.forEach(acc => {
                    console.log(`  - ID: ${acc.id} | UserID: ${acc.mobileUserId} | Context: ${acc.context}`);
                });
            }
        });

        if (!duplicatesFound) {
            console.log('✅ All account numbers are unique. Safe to add @unique constraint and use as FK.');
        } else {
            console.log('❌ Duplicates exist! Cannot use accountNumber as unique FK without cleanup.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
