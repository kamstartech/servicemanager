
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
        console.log('Applying partial unique index for WALLET users...');

        // Raw SQL to create conditional index
        await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_wallet_phone 
      ON fdh_mobile_users ("phoneNumber") 
      WHERE context = 'WALLET';
    `);

        console.log('✅ Partial unique index applied: unique_wallet_phone where context="WALLET"');

    } catch (error) {
        console.error('Error applying index:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
