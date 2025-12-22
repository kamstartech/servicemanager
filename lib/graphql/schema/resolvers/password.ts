import { GraphQLError } from 'graphql';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';
import type { GraphQLContext } from '@/lib/graphql/context';

/**
 * Password Verification Resolver
 * 
 * Verifies a user's password without creating a new session
 */
export const passwordResolvers = {
    Mutation: {
        async verifyPassword(
            _parent: unknown,
            args: { password: string },
            context: GraphQLContext
        ): Promise<{ success: boolean; message: string }> {
            const userId = context.userId || context.mobileUser?.id;

            if (!userId) {
                throw new GraphQLError('Authentication required', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }

            try {
                // Get user from database
                const user = await prisma.mobileUser.findUnique({
                    where: { id: userId },
                    select: { passwordHash: true },
                });

                if (!user || !user.passwordHash) {
                    throw new GraphQLError('User not found', {
                        extensions: { code: 'NOT_FOUND' },
                    });
                }

                // Verify password
                const isValid = await bcrypt.compare(args.password, user.passwordHash);

                if (!isValid) {
                    return {
                        success: false,
                        message: 'Incorrect password',
                    };
                }

                return {
                    success: true,
                    message: 'Password verified successfully',
                };
            } catch (error) {
                if (error instanceof GraphQLError) {
                    throw error;
                }

                console.error('[VerifyPassword] Error:', error);
                throw new GraphQLError('Failed to verify password', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }
        },
    },
};
