
import { PrismaClient } from '@prisma/client';

async function main() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('Please provide DATABASE_URL environment variable');
        process.exit(1);
    }

    console.log(`Connecting to database...`);

    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: databaseUrl,
            },
        },
    });

    try {
        console.log('Querying for WALLET users...');

        // Check for users first
        const walletUsers = await prisma.mobileUser.findMany({
            where: {
                context: 'WALLET',
            },
            include: {
                profile: {
                    select: {
                        firstName: true,
                        lastName: true,
                    }
                },
                accounts: true,
            }
        });

        console.log(`Found ${walletUsers.length} WALLET users.`);

        if (walletUsers.length > 0) {
            console.log('--- Wallet Users ---');
            walletUsers.forEach(user => {
                const name = user.profile
                    ? `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim()
                    : 'N/A';
                console.log(`User ID: ${user.id} | Name: ${name} | Phone: ${user.phoneNumber}`);

                if (user.accounts.length > 0) {
                    console.log(`  Accounts (${user.accounts.length}):`);
                    user.accounts.forEach(acc => {
                        console.log(`    - ID: ${acc.id} | Number: ${acc.accountNumber} | Context: ${acc.context} | Balance: ${acc.balance} | Active: ${acc.isActive}`);
                    });
                } else {
                    console.log('  No accounts.');
                }
                console.log('-------------------');
            });
        } else {
            console.log('No WALLET users found.');
        }

        // Also check for any accounts explicitly marked as WALLET (in case user context mismatch)
        const distinctWalletAccounts = await prisma.mobileUserAccount.count({
            where: { context: 'WALLET' }
        });
        console.log(`Total explicit WALLET context accounts in DB: ${distinctWalletAccounts}`);

    } catch (error) {
        console.error('Error querying database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
