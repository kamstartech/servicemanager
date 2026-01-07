
import { prisma } from "../lib/db/prisma";

async function main() {
    console.log("Checking SupportTicket dates...");
    const tickets = await prisma.supportTicket.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true, updatedAt: true }
    });
    console.table(tickets);

    console.log("\nChecking TicketMessage dates...");
    const messages = await prisma.ticketMessage.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true, readAt: true }
    });
    console.table(messages);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
