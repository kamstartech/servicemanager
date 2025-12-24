
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
        console.log('Checking for duplicate WALLET users...');

        // Fetch all wallet users
        const users = await prisma.mobileUser.findMany({
            where: {
                context: 'WALLET',
                phoneNumber: { not: null } // Ensure phone is present
            },
            select: {
                id: true,
                phoneNumber: true,
                context: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        console.log(`Fetched ${users.length} wallet users.`);

        // Find duplicates in memory
        const map = new Map<string, typeof users>();

        users.forEach(user => {
            const key = `${user.context}-${user.phoneNumber}`;
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key)!.push(user);
        });

        let duplicatesFound = false;
        map.forEach((group, key) => {
            if (group.length > 1) {
                duplicatesFound = true;
                console.log(`Duplicate found for ${key}:`);
                group.forEach(u => {
                    console.log(`  - ID: ${u.id} | Created: ${u.createdAt}`);
                });
            }
        });

        if (!duplicatesFound) {
            console.log('No duplicates found. Safe to apply unique constraint.');
        } else {
            console.log('Duplicates exist! These must be resolved before applying unique constraint.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
