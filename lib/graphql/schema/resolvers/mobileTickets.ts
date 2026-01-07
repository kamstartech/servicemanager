import { GraphQLError } from "graphql";
import { prisma } from "@/lib/db/prisma";
import { TicketStatus, TicketPriority, MobileUserContext, MessageSenderType } from "@prisma/client";
import { GraphQLContext } from "@/lib/graphql/context";
import { pubsub, EVENTS } from "@/lib/graphql/pubsub";

export const mobileTicketsResolvers = {
    Query: {
        myTickets: async (_: any, args: any, context: GraphQLContext) => {
            if (!context.userId) {
                throw new GraphQLError("Unauthorized");
            }

            const userId = context.userId;
            const { page = 1, limit = 10 } = args;

            const where = { userId };

            const total = await prisma.supportTicket.count({ where });
            const tickets = await prisma.supportTicket.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { updatedAt: 'desc' }
            });

            const pages = Math.ceil(total / limit);

            return {
                tickets,
                total,
                page,
                pages
            };
        }
    },

    Mutation: {
        createTicket: async (_: any, args: any, context: GraphQLContext) => {
            if (!context.userId) {
                throw new GraphQLError("Unauthorized: Must be logged in to create ticket");
            }

            // Ensure we have user details for context
            let user = context.mobileUser || (context.user as any);
            if (!user) {
                user = await prisma.mobileUser.findUnique({ where: { id: context.userId } });
            }

            if (!user) {
                throw new GraphQLError("Unauthorized: User not found");
            }

            const { subject, category, priority, message } = args;
            const userId = context.userId;
            // Get context from user if available, fallback to MOBILE_BANKING
            const mobileContext = user.context || MobileUserContext.MOBILE_BANKING;

            const ticket = await prisma.supportTicket.create({
                data: {
                    subject,
                    category: category || "General",
                    priority: priority || TicketPriority.MEDIUM,
                    status: TicketStatus.OPEN,
                    context: mobileContext,
                    userId,
                    messages: {
                        create: {
                            message,
                            senderType: MessageSenderType.USER,
                            senderId: userId
                        }
                    }
                }
            });

            return ticket;
        },

        sendTicketMessage: async (_: any, { ticketId, message }: { ticketId: string, message: string }, context: GraphQLContext) => {
            if (!context.userId) throw new GraphQLError("Unauthorized");

            const id = parseInt(ticketId);
            const ticket = await prisma.supportTicket.findUnique({ where: { id } });
            if (!ticket) throw new GraphQLError("Ticket not found");

            if (ticket.userId !== context.userId) {
                throw new GraphQLError("Unauthorized access to ticket");
            }

            // Create message (USER)
            const newMessage = await prisma.$transaction(async (tx) => {
                const msg = await tx.ticketMessage.create({
                    data: {
                        ticketId: id,
                        message,
                        senderType: MessageSenderType.USER,
                        senderId: context.userId!
                    }
                });

                await tx.supportTicket.update({
                    where: { id },
                    data: {
                        updatedAt: new Date(),
                        status: ticket.status === TicketStatus.CLOSED ? TicketStatus.OPEN : undefined
                    }
                });

                return msg;
            });

            // Publish event for live chat
            pubsub.publish(EVENTS.TICKET_MESSAGE_ADDED, { ticketMessageAdded: newMessage });

            return newMessage;
        },
    }
};
