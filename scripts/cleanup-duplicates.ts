
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
        console.log('--- Checking for duplicates in ALL contexts ---');

        // Fetch all users with phone numbers
        const allUsers = await prisma.mobileUser.findMany({
            where: {
                phoneNumber: { not: null }
            },
            select: {
                id: true,
                phoneNumber: true,
                context: true,
                createdAt: true,
                accounts: { select: { id: true } } // Check if they have accounts before deleting
            },
            orderBy: {
                createdAt: 'desc' // Newest first
            }
        });

        const map = new Map<string, typeof allUsers>();

        // Group by context + phone
        allUsers.forEach(user => {
            const key = `${user.context}-${user.phoneNumber}`;
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key)!.push(user);
        });

        const duplicates = new Map<string, typeof allUsers>();
        const nonWalletDuplicates: string[] = [];

        map.forEach((group, key) => {
            if (group.length > 1) {
                duplicates.set(key, group);
                const context = group[0].context;
                if (context !== 'WALLET') {
                    nonWalletDuplicates.push(key);
                }
            }
        });

        console.log(`Found ${duplicates.size} groups with duplicates.`);

        if (nonWalletDuplicates.length > 0) {
            console.warn('⚠️ WARNING: Found duplicates in non-WALLET contexts!');
            nonWalletDuplicates.forEach(k => console.log(`  - ${k} (${duplicates.get(k)!.length} records)`));
            console.warn('Cannot apply global unique constraint safely without fixing these first.');
        } else {
            console.log('✅ No duplicates found in non-WALLET contexts.');
        }

        // Process WALLET duplicates
        let deletedCount = 0;

        console.log('\n--- Processing WALLET duplicates ---');

        for (const [key, group] of duplicates) {
            const context = group[0].context;
            if (context !== 'WALLET') continue;

            // Keep the NEWEST one (index 0 because we ordered by desc) 
            // OR Keep the one with accounts?
            // User said "latest one".
            // Let's also prioritize ones with accounts if any (though we know there are none).

            const keepUser = group[0]; // Most recent
            const usersToDelete = group.slice(1); // The rest (older ones)

            console.log(`Resolving ${key}: Keeping ID ${keepUser.id} (Created: ${keepUser.createdAt.toISOString()})`);

            for (const user of usersToDelete) {
                if (user.accounts.length > 0) {
                    console.error(`❌ ABORT: User ${user.id} has linked accounts! Skipping deletion.`);
                    continue;
                }

                console.log(`  Deleting duplicate User ID ${user.id} (Created: ${user.createdAt.toISOString()})...`);
                await prisma.mobileUser.delete({
                    where: { id: user.id }
                });
                deletedCount++;
            }
        }

        console.log(`\nCleanup complete. Deleted ${deletedCount} duplicate wallet users.`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
