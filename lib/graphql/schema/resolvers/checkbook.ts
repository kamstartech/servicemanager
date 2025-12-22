/**
 * Checkbook Request GraphQL Resolver
 * 
 * Handles checkbook requests via GraphQL
 */

import { GraphQLError } from 'graphql';
import { prisma } from '@/lib/db/prisma';
import type { GraphQLContext } from '@/lib/graphql/context';

const CheckbookRequestStatus = {
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    READY_FOR_COLLECTION: "READY_FOR_COLLECTION",
    COLLECTED: "COLLECTED",
    CANCELLED: "CANCELLED",
    REJECTED: "REJECTED",
} as const;

export const checkbookResolvers = {
    Mutation: {
        requestCheckbook: async (
            _: any,
            args: {
                accountNumber: string;
                numberOfCheckbooks: number;
                collectionPoint: string;
                notes?: string;
            },
            context: GraphQLContext
        ) => {
            try {
                console.log('[CheckbookResolver] Processing checkbook request:', {
                    userId: context.userId,
                    accountNumber: args.accountNumber,
                    numberOfCheckbooks: args.numberOfCheckbooks,
                });

                // 1. Verify user is authenticated
                if (!context.userId && !context.mobileUser) {
                    throw new GraphQLError('You must be logged in to request a checkbook', {
                        extensions: { code: 'UNAUTHENTICATED' },
                    });
                }

                const authenticatedUserId = context.mobileUser?.id || context.userId;

                if (!authenticatedUserId) {
                    throw new GraphQLError('User authentication failed', {
                        extensions: { code: 'UNAUTHENTICATED' },
                    });
                }

                // 2. Validate inputs
                if (!args.accountNumber || !args.collectionPoint) {
                    throw new GraphQLError('Account number and collection point are required', {
                        extensions: { code: 'BAD_USER_INPUT' },
                    });
                }

                if (args.numberOfCheckbooks < 1 || args.numberOfCheckbooks > 10) {
                    throw new GraphQLError('Number of checkbooks must be between 1 and 10', {
                        extensions: { code: 'BAD_USER_INPUT' },
                    });
                }

                // 3. Verify user owns the account
                const account = await prisma.mobileUserAccount.findFirst({
                    where: {
                        mobileUserId: authenticatedUserId,
                        accountNumber: args.accountNumber,
                    },
                });

                if (!account) {
                    throw new GraphQLError('You do not own this account', {
                        extensions: { code: 'FORBIDDEN' },
                    });
                }

                // 4. Create checkbook request
                const checkbookRequest = await prisma.checkbookRequest.create({
                    data: {
                        mobileUserId: authenticatedUserId,
                        accountNumber: args.accountNumber,
                        numberOfCheckbooks: Math.max(1, args.numberOfCheckbooks),
                        collectionPoint: args.collectionPoint,
                        status: CheckbookRequestStatus.PENDING,
                        notes: args.notes ?? null,
                    },
                    include: {
                        mobileUser: {
                            select: {
                                id: true,
                                username: true,
                                phoneNumber: true,
                            },
                        },
                    },
                });

                console.log(
                    `[CheckbookResolver] ✅ Checkbook request created: ID ${checkbookRequest.id}`
                );

                return {
                    success: true,
                    message: `Checkbook request submitted successfully. You will be notified when ready for collection at ${args.collectionPoint}.`,
                    requestId: checkbookRequest.id.toString(),
                };
            } catch (error) {
                console.error('[CheckbookResolver] ❌ Checkbook request failed:', error);

                if (error instanceof GraphQLError) {
                    throw error;
                }

                throw new GraphQLError('Failed to process checkbook request', {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        originalError: error instanceof Error ? error.message : String(error),
                    },
                });
            }
        },
    },
};
