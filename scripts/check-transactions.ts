
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
        console.log('Checking FdhTransaction FK validity...');

        // We need to use raw SQL because the Prisma client might be out of sync with current schema state
        // or the previous schema didn't have the FKs yet.

        // Check validation for to_account_number
        // Find transactions where to_account_number is NOT NULL and NOT IN mobile_user_accounts
        const invalidTransactions = await prisma.$queryRawUnsafe(`
      SELECT t.id, t.to_account_number, t.from_account_number 
      FROM fdh_transactions t
      WHERE t.to_account_number IS NOT NULL 
      AND NOT EXISTS (
        SELECT 1 FROM fdh_mobile_user_accounts a 
        WHERE a.account_number = t.to_account_number
      )
    `);

        console.log(`Found ${(invalidTransactions as any[]).length} transactions with INVALID 'to_account_number' FKs.`);

        if ((invalidTransactions as any[]).length > 0) {
            console.table((invalidTransactions as any[]).slice(0, 20));
        }

        // Check validation for from_account_number
        const invalidFrom = await prisma.$queryRawUnsafe(`
      SELECT t.id, t.from_account_number, t.to_account_number
      FROM fdh_transactions t
      WHERE t.from_account_number IS NOT NULL 
      AND NOT EXISTS (
        SELECT 1 FROM fdh_mobile_user_accounts a 
        WHERE a.account_number = t.from_account_number
      )
    `);

        console.log(`Found ${(invalidFrom as any[]).length} transactions with INVALID 'from_account_number' FKs.`);
        if ((invalidFrom as any[]).length > 0) {
            console.table((invalidFrom as any[]).slice(0, 20));
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
