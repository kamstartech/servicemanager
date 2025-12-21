import { prisma } from "@/lib/db/prisma";
import { pubsub, EVENTS } from "@/lib/graphql/pubsub";

/**
 * Helper function to publish account updates via GraphQL subscription
 * This notifies subscribed clients (admin UI) that accounts have changed
 */
export async function publishAccountsUpdate(userId: number): Promise<void> {
    try {
        const accounts = await prisma.mobileUserAccount.findMany({
            where: { mobileUserId: userId },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        });

        pubsub.publish(EVENTS.ACCOUNTS_UPDATED, userId.toString(), {
            userId: userId.toString(),
            accounts: accounts.map(account => ({
                id: account.id.toString(),
                context: account.context,
                accountNumber: account.accountNumber,
                accountName: account.accountName,
                accountType: account.accountType,
                currency: account.currency,
                categoryName: account.categoryName,
                nickName: account.nickName,
                balance: account.balance?.toString() || null,
                frozen: account.frozen,
                isHidden: account.isHidden,
                isPrimary: account.isPrimary,
                isActive: account.isActive,
                createdAt: account.createdAt.toISOString(),
                updatedAt: account.updatedAt.toISOString(),
            })),
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error(`Failed to publish accounts update for user ${userId}:`, error);
    }
}
