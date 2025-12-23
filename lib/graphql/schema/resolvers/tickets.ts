import { GraphQLError } from "graphql";
import { prisma } from "@/lib/db/prisma";
import { TicketStatus, TicketPriority, MobileUserContext, MessageSenderType } from "@prisma/client";
import { GraphQLContext } from "@/lib/graphql/context";

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

            return prisma.supportTicket.findUnique({
                where: { id: ticketId },
                include: { user: true }
            });
        },

        myTickets: async (_: any, args: any, context: GraphQLContext) => {
            if (!context.mobileUser) {
                // Return empty if not authenticated as mobile user
                // Or throw error
                throw new GraphQLError("Unauthorized");
            }

            const userId = context.mobileUser.id;
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
        replyToTicket: async (_: any, { ticketId, message }: { ticketId: string, message: string }, context: GraphQLContext) => {
            const id = parseInt(ticketId);

            // Allow admin or ticket owner
            if (!context.user) throw new GraphQLError("Unauthorized");

            const ticket = await prisma.supportTicket.findUnique({
                where: { id }
            });

            if (!ticket) throw new GraphQLError("Ticket not found");

            const isMobileUser = !!context.mobileUser;
            const senderType = isMobileUser ? MessageSenderType.USER : MessageSenderType.ADMIN;
            const senderId = context.user.id; // MobileUser ID or AdminWebUser ID

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

            return newMessage;
        },

        createTicket: async (_: any, args: any, context: GraphQLContext) => {
            if (!context.mobileUser) {
                // Fallback for dev - remove in production or handle gracefully
                // For now, throw
                throw new GraphQLError("Unauthorized: Must be logged in to create ticket");
            }

            const { subject, category, priority, message } = args;
            const userId = context.mobileUser.id;
            const mobileContext = context.mobileUser.context; // e.g. MOBILE_BANKING or WALLET

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
            // Alias for replyToTicket, but we can reuse logic or call specific
            // Here we just reuse logic but ensure user is mobile user owner
            if (!context.mobileUser) throw new GraphQLError("Unauthorized");

            const id = parseInt(ticketId);
            const ticket = await prisma.supportTicket.findUnique({ where: { id } });
            if (!ticket) throw new GraphQLError("Ticket not found");

            if (ticket.userId !== context.mobileUser.id) {
                throw new GraphQLError("Unauthorized access to ticket");
            }

            // Create message (USER)
            const newMessage = await prisma.$transaction(async (tx) => {
                const msg = await tx.ticketMessage.create({
                    data: {
                        ticketId: id,
                        message,
                        senderType: MessageSenderType.USER,
                        senderId: context.mobileUser!.id
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

            return newMessage;
        },

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
    }
};
