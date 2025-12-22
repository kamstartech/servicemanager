import { prisma } from "@/lib/db/prisma";
import { pubsub, EVENTS } from "@/lib/graphql/pubsub";

/**
 * Helper function to publish app structure updates via GraphQL subscription
 */
export async function publishAppStructureUpdate(): Promise<void> {
    try {
        const screens = await prisma.appScreen.findMany({
            include: {
                pages: {
                    orderBy: { order: "asc" },
                },
            },
            orderBy: [{ context: "asc" }, { order: "asc" }],
        });

        const payload = screens.map((screen) => ({
            ...screen,
            pages: screen.pages.map((page) => ({
                ...page,
                createdAt: page.createdAt.toISOString(),
                updatedAt: page.updatedAt.toISOString(),
            })),
            createdAt: screen.createdAt.toISOString(),
            updatedAt: screen.updatedAt.toISOString(),
        }));

        pubsub.publish(EVENTS.APP_STRUCTURE_UPDATED, payload);
    } catch (error) {
        console.error("Failed to publish app structure update:", error);
    }
}
