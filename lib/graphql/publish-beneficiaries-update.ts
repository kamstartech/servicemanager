import { prisma } from "@/lib/db/prisma";
import { pubsub, EVENTS } from "@/lib/graphql/pubsub";

/**
 * Helper function to publish beneficiary updates via GraphQL subscription
 */
export async function publishBeneficiariesUpdate(userId: number): Promise<void> {
    try {
        const beneficiaries = await prisma.beneficiary.findMany({
            where: { userId },
            include: { user: true },
            orderBy: { createdAt: "desc" },
        });

        const payload = beneficiaries.map((b: any) => ({
            id: b.id.toString(),
            userId: b.userId,
            name: b.name,
            beneficiaryType: b.beneficiaryType,
            phoneNumber: b.phoneNumber,
            accountNumber: b.accountNumber,
            bankCode: b.bankCode,
            bankName: b.bankName,
            branch: b.branch,
            description: b.description,
            isActive: b.isActive,
            createdAt: b.createdAt.toISOString(),
            updatedAt: b.updatedAt.toISOString(),
            user: b.user ? {
                ...b.user,
                id: b.user.id.toString(),
                createdAt: b.user.createdAt.toISOString(),
                updatedAt: b.user.updatedAt.toISOString(),
            } : null,
        }));

        pubsub.publish(EVENTS.BENEFICIARIES_UPDATED, userId.toString(), payload);
    } catch (error) {
        console.error(`Failed to publish beneficiaries update for user ${userId}:`, error);
    }
}
