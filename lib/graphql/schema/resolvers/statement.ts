/**
 * Statement Request GraphQL Resolver
 * 
 * Handles statement requests with PDF/Excel/CSV format support
 */

import { GraphQLError } from 'graphql';
import { prisma } from '@/lib/db/prisma';
import type { GraphQLContext } from '@/lib/graphql/context';
import { t24StatementService } from '@/lib/services/t24/statement';
import { generateEncryptedStatementPDF } from '@/lib/services/pdf/statement-generator';
import { generateStatementExcel } from '@/lib/services/excel/statement-generator';
import { generateStatementCSV } from '@/lib/services/csv/statement-generator';
import { emailService } from '@/lib/services/email';

export const statementResolvers = {
    Mutation: {
        requestStatement: async (
            _: any,
            args: {
                accountNumber: string;
                startDate: string;
                endDate: string;
                format: 'PDF' | 'EXCEL' | 'CSV';
            },
            context: GraphQLContext
        ) => {
            try {
                // 1. Verify user is authenticated
                if (!context.mobileUser) {
                    throw new GraphQLError('You must be logged in to request a statement', {
                        extensions: { code: 'UNAUTHENTICATED' },
                    });
                }

                // 2. Get user with profile data
                const user = await prisma.mobileUser.findUnique({
                    where: { id: context.mobileUser.id },
                    include: { profile: true },
                });

                if (!user || !user.profile) {
                    throw new GraphQLError('User profile not found', {
                        extensions: { code: 'NOT_FOUND' },
                    });
                }

                // 3. Verify user owns the account
                const accounts = await prisma.mobileUserAccount.findMany({
                    where: {
                        mobileUserId: user.id,
                        accountNumber: args.accountNumber,
                    },
                });

                if (accounts.length === 0) {
                    throw new GraphQLError('You do not own this account', {
                        extensions: { code: 'FORBIDDEN' },
                    });
                }

                // 4. Fetch statement from T24
                console.log('[StatementResolver] Fetching statement from T24...');
                const statementData = await t24StatementService.getAccountStatement({
                    accountNumber: args.accountNumber,
                    startDate: args.startDate,
                    endDate: args.endDate,
                });

                if (!statementData.success) {
                    let userFriendlyMessage = 'Unable to fetch your statement at this time. Please try again later.';

                    if (statementData.errorCode === '404') {
                        userFriendlyMessage = 'The statement service is currently unavailable for this account. Please verify your account details or contact support.';
                    } else if (statementData.message && !statementData.message.includes('Runtime Error')) {
                        userFriendlyMessage = statementData.message;
                    }

                    throw new GraphQLError(userFriendlyMessage, {
                        extensions: {
                            code: 'T24_ERROR',
                            errorCode: statementData.errorCode,
                            technicalMessage: statementData.message
                        },
                    });
                }

                // 5. Generate file based on format
                let fileBuffer: Buffer;
                let filename: string;
                let password: string | undefined;

                const baseFilename = `statement_${args.accountNumber}_${args.startDate}_${args.endDate}`;

                if (args.format === 'PDF') {
                    // Build PDF password from user data
                    password = `${user.profile.firstName}${user.profile.lastName}${user.username}`;

                    console.log('[StatementResolver] Generating encrypted PDF...');
                    fileBuffer = await generateEncryptedStatementPDF({
                        accountNumber: args.accountNumber,
                        accountName: `${user.profile.firstName} ${user.profile.lastName}`,
                        startDate: args.startDate,
                        endDate: args.endDate,
                        transactions: statementData.transactions,
                        openingBalance: statementData.openingBalance,
                        closingBalance: statementData.closingBalance,
                        currency: statementData.currency,
                        password,
                    });
                    filename = `${baseFilename}.pdf`;
                } else if (args.format === 'EXCEL') {
                    console.log('[StatementResolver] Generating Excel statement...');
                    fileBuffer = await generateStatementExcel({
                        accountNumber: args.accountNumber,
                        accountName: `${user.profile.firstName} ${user.profile.lastName}`,
                        startDate: args.startDate,
                        endDate: args.endDate,
                        transactions: statementData.transactions,
                        openingBalance: statementData.openingBalance,
                        closingBalance: statementData.closingBalance,
                        currency: statementData.currency,
                    });
                    filename = `${baseFilename}.xlsx`;
                } else {
                    // CSV
                    console.log('[StatementResolver] Generating CSV statement...');
                    fileBuffer = await generateStatementCSV({
                        accountNumber: args.accountNumber,
                        accountName: `${user.profile.firstName} ${user.profile.lastName}`,
                        startDate: args.startDate,
                        endDate: args.endDate,
                        transactions: statementData.transactions,
                        openingBalance: statementData.openingBalance,
                        closingBalance: statementData.closingBalance,
                        currency: statementData.currency,
                    });
                    filename = `${baseFilename}.csv`;
                }

                // 6. Send email with file attachment
                console.log('[StatementResolver] Sending statement email...');
                await emailService.sendStatementEmail(
                    user.profile.email!,
                    `${user.profile.firstName} ${user.profile.lastName}`,
                    args.accountNumber,
                    args.startDate,
                    args.endDate,
                    args.format,
                    fileBuffer,
                    filename,
                    password
                );

                console.log(
                    `[StatementResolver] ✅ Statement request completed successfully (${args.format} format)`
                );

                return {
                    success: true,
                    message: `Statement sent to ${user.profile.email} as ${args.format} format`,
                };
            } catch (error) {
                console.error('[StatementResolver] ❌ Statement request failed:', error);

                if (error instanceof GraphQLError) {
                    throw error;
                }

                throw new GraphQLError('Failed to process statement request', {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        originalError: error instanceof Error ? error.message : String(error),
                    },
                });
            }
        },
    },
};
