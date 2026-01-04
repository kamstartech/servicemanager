import { GraphQLError } from "graphql";
import { GraphQLContext } from "../../context";
import { prisma } from "@/lib/db/prisma";
import { workflowExecutor } from "@/lib/services/workflow/workflow-executor";

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

            const { provider, msisdn, amount, sourceAccountNumber, bundleId } = input;

            // Map provider to biller type
            const billerType = provider === "AIRTEL" ? "AIRTEL_AIRTIME" : "TNM_AIRTIME";

            // Execute via workflow executor to get standardized "Hold -> Process -> [Reverse]" logic
            const result = await workflowExecutor.handleAirtimeTransaction(
                billerType,
                {
                    amount: amount.toString(),
                    debitAccount: sourceAccountNumber,
                    phoneNumber: msisdn,
                    bundleId,
                },
                {
                    userId: String(context.userId),
                    sessionId: "DIRECT_PURCHASE",
                    transferContext: context.auth?.context, // Pass context from JWT
                    source: context.auth?.context === 'WALLET' ? 'WALLET' : 'MOBILE_BANKING',
                    variables: {},
                }
            );

            if (!result.success) {
                return {
                    success: false,
                    message: result.error || "Failed to purchase airtime",
                    status: "FAILED",
                };
            }

            // The workflow executor returns both transaction types in the output
            const output = result.output;

            return {
                success: true,
                message: "Airtime purchase successful",
                transactionId: output.transactionId,
                reference: output.externalReference || output.transactionId,
                status: "COMPLETED",
                transaction: output.billerTransaction, // Return BillerTransaction for auditing
            };
        },
    },
};
