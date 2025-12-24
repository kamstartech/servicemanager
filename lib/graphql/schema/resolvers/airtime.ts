import { GraphQLError } from "graphql";
import { GraphQLContext } from "../../context";
import { prisma } from "@/lib/db/prisma";
import {
    TransactionSource,
    TransactionStatus,
    TransactionType,
} from "@prisma/client";
import { generateTransactionReference } from "@/lib/utils/reference-generator";
import { airtimeService } from "@/lib/services/airtime/airtime-service";
import { Decimal } from "@prisma/client/runtime/library";

export const airtimeResolvers = {
    Mutation: {
        purchaseAirtime: async (
            _: unknown,
            { input }: { input: any },
            context: GraphQLContext
        ) => {
            if (!context.userId) {
                throw new GraphQLError("Authentication required", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            }

            const { provider, msisdn, amount: amountInput, sourceAccountNumber, bundleId } = input;
            const amount = new Decimal(amountInput);

            if (amount.lte(0)) {
                throw new GraphQLError("Amount must be greater than zero", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            }

            // Check account ownership
            const sourceAccount = await prisma.mobileUserAccount.findFirst({
                where: {
                    accountNumber: sourceAccountNumber,
                    mobileUserId: context.userId
                },
            });

            if (!sourceAccount) {
                throw new GraphQLError("Source account not found or unauthorized", {
                    extensions: { code: "NOT_FOUND" },
                });
            }

            const reference = generateTransactionReference();

            // Create transaction record
            const transaction = await prisma.fdhTransaction.create({
                data: {
                    type: TransactionType.AIRTIME,
                    source: TransactionSource.MOBILE_BANKING,
                    reference,
                    status: TransactionStatus.PENDING,
                    amount,
                    currency: sourceAccount.currency,
                    description: `Airtime purchase for ${msisdn} (${provider})`,
                    fromAccountNumber: sourceAccount.accountNumber,
                    toAccountNumber: msisdn,
                    initiatedByUserId: context.userId,
                },
            });

            try {
                let result;
                const params = {
                    msisdn,
                    amount: amount.toNumber(),
                    externalTxnId: reference,
                    bundleId,
                };

                if (provider === "AIRTEL") {
                    result = await airtimeService.airtelRecharge(params);
                } else {
                    result = await airtimeService.tnmRecharge(params);
                }

                if (result.ok) {
                    await prisma.fdhTransaction.update({
                        where: { id: transaction.id },
                        data: {
                            status: TransactionStatus.COMPLETED,
                            t24Reference: reference,
                        },
                    });

                    return {
                        success: true,
                        message: "Airtime purchase successful",
                        transactionId: transaction.id,
                        reference,
                        status: "COMPLETED",
                    };
                } else {
                    const errorMessage = result.error || result.statusText || "Failed to purchase airtime";

                    await prisma.fdhTransaction.update({
                        where: { id: transaction.id },
                        data: {
                            status: TransactionStatus.FAILED,
                            errorMessage: errorMessage,
                        },
                    });

                    return {
                        success: false,
                        message: errorMessage,
                        transactionId: transaction.id,
                        reference,
                        status: "FAILED",
                    };
                }
            } catch (error: any) {
                console.error("Airtime purchase error:", error);

                await prisma.fdhTransaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: TransactionStatus.FAILED,
                        errorMessage: error.message,
                    },
                });

                return {
                    success: false,
                    message: error.message || "An unexpected error occurred",
                    transactionId: transaction.id,
                    reference,
                    status: "FAILED",
                };
            }
        },
    },
};
