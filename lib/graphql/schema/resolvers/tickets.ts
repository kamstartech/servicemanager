import { GraphQLError } from "graphql";
import { prisma } from "@/lib/db/prisma";
import { TicketStatus, TicketPriority, MobileUserContext, MessageSenderType } from "@prisma/client";
import { GraphQLContext } from "@/lib/graphql/context";
import { PushNotificationService } from "@/lib/services/push-notification";
import { pubsub, EVENTS } from "@/lib/graphql/pubsub";
import { withFilter } from "graphql-subscriptions";

export const ticketsResolvers = {
    Query: {
        tickets: async (_: any, args: any, context: GraphQLContext) => {
            const { status, context: ticketContext, search, page = 1, limit = 10 } = args;

            const where: any = {};

            if (status) {
                where.status = status;
            }

            if (ticketContext) {
                where.context = ticketContext;
            }

            if (search) {
                const term = search.toLowerCase();
                const idSearch = parseInt(term);

                where.OR = [
                    { subject: { contains: term, mode: 'insensitive' } },
                    {
                        user: {
                            username: { contains: term, mode: 'insensitive' }
                        }
                    }
                ];

                if (!isNaN(idSearch)) {
                    where.OR.push({ id: idSearch });
                }
            }

            const total = await prisma.supportTicket.count({ where });
            const tickets = await prisma.supportTicket.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { updatedAt: 'desc' },
                include: {
                    user: true // Eager load user
                }
            });

            const pages = Math.ceil(total / limit);

            return {
                tickets,
                total,
                page,
                pages
            };
        },

        ticket: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
            const ticketId = parseInt(id);
            if (isNaN(ticketId)) return null;

            const ticket = await prisma.supportTicket.findUnique({
                where: { id: ticketId },
                include: { user: true }
            });

            if (!ticket) return null;

            const userId = context.userId;

            // If authenticated as mobile user (has userId but no adminUser)
            if (userId && !context.adminUser) {
                if (ticket.userId !== userId) {
                    throw new GraphQLError("Unauthorized access to ticket");
                }
                return ticket;
            }

            // If admin
            if (context.adminUser) {
                return ticket;
            }

            // Not authenticated
            throw new GraphQLError("Unauthorized");
        },

        // myTickets moved to mobileTickets.ts
    },

    Mutation: {
        replyToTicket: async (_: any, { ticketId, message }: { ticketId: string, message: string }, context: GraphQLContext) => {
            const id = parseInt(ticketId);

            // Allow admin or ticket owner
            if (!context.userId && !context.adminUser) throw new GraphQLError("Unauthorized");

            const ticket = await prisma.supportTicket.findUnique({
                where: { id }
            });

            if (!ticket) throw new GraphQLError("Ticket not found");

            const isMobileUser = !!context.userId && !context.adminUser;
            const senderType = isMobileUser ? MessageSenderType.USER : MessageSenderType.ADMIN;

            // Use userId or adminUser.id explicitly
            const senderId = isMobileUser ? context.userId! : context.adminUser!.id;

            // Transaction: Create message and update ticket timestamp
            const newMessage = await prisma.$transaction(async (tx) => {
                const msg = await tx.ticketMessage.create({
                    data: {
                        ticketId: id,
                        message,
                        senderType,
                        senderId
                    }
                });

                await tx.supportTicket.update({
                    where: { id },
                    data: {
                        updatedAt: new Date(),
                        // Auto re-open if closed and user replies?
                        ...(senderType === MessageSenderType.USER && ticket.status === TicketStatus.CLOSED
                            ? { status: TicketStatus.OPEN }
                            : {})
                    }
                });

                return msg;
            });

            // Publish event for live chat
            console.log(`[PubSub] 📢 Publishing TICKET_MESSAGE_ADDED for ticket ${ticketId}`, {
                messageId: newMessage.id,
                ticketId: newMessage.ticketId,
            });
            pubsub.publish(EVENTS.TICKET_MESSAGE_ADDED, { ticketMessageAdded: newMessage });
            console.log(`[PubSub] ✅ Published TICKET_MESSAGE_ADDED event`);

            // If ADMIN replied to a User's ticket, send push notification
            if (!isMobileUser && ticket.userId) {
                try {
                    await PushNotificationService.send({
                        userId: ticket.userId,
                        type: 'TICKET_REPLY',
                        priority: 'HIGH',
                        title: `New Reply on Ticket #${ticket.id}`,
                        body: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
                        actionUrl: `/customer-care/tickets/${ticket.id}`,
                        actionData: { ticketId: ticket.id },
                        skipPersistence: true
                    });
                } catch (error) {
                    console.error("Failed to send ticket reply push notification:", error);
                }
            }

            return newMessage;
        },

        // createTicket moved to mobileTickets.ts
        // sendTicketMessage moved to mobileTickets.ts

        updateTicketStatus: async (_: any, { ticketId, status }: { ticketId: string, status: TicketStatus }, context: GraphQLContext) => {
            if (!context.adminUser) throw new GraphQLError("Unauthorized: Admin only");

            const id = parseInt(ticketId);
            const ticket = await prisma.supportTicket.update({
                where: { id },
                data: { status }
            });

            return ticket;
        }
    },

    SupportTicket: {
        user: async (parent: any, _: any, context: GraphQLContext) => {
            if (parent.user) return parent.user; // Eager loaded
            if (!parent.userId) return null;
            return prisma.mobileUser.findUnique({
                where: { id: parent.userId }
            });
        },
        messages: async (parent: any) => {
            return prisma.ticketMessage.findMany({
                where: { ticketId: parent.id },
                orderBy: { createdAt: 'asc' }
            });
        },
        lastMessage: async (parent: any, _: any, context: GraphQLContext) => {
            const lastMsg = await prisma.ticketMessage.findFirst({
                where: { ticketId: parent.id },
                orderBy: { createdAt: 'desc' }
            });
            return lastMsg ? lastMsg.message : null;
        },
        unreadCount: async (parent: any) => {
            // Simplified: Returns count of messages from 'other' side that are unread
            // Since we don't have 'viewer' context in field resolver easily without user,
            // we'll assume Admin view counts User UNREAD messages? 
            // The schema has `readAt`.
            // For now return 0 or implement precise logic later
            return 0;
        }
    },

    Subscription: {
        ticketMessageAdded: {
            subscribe: withFilter(
                () => {
                    console.log("[Subscription] 🎧 ticketMessageAdded: Client connected, starting asyncIterator");
                    return pubsub.asyncIterator(EVENTS.TICKET_MESSAGE_ADDED);
                },
                (payload, variables) => {
                    const matches = payload.ticketMessageAdded.ticketId === parseInt(variables.ticketId);
                    console.log("[Subscription] 🔍 Filter check:", {
                        payloadTicketId: payload.ticketMessageAdded.ticketId,
                        requestedTicketId: variables.ticketId,
                        matches: matches ? "✅ MATCH" : "❌ NO MATCH"
                    });
                    return matches;
                }
            )
        }
    }
};
