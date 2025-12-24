import { GraphQLError } from "graphql";
import { GraphQLContext } from "../../context";
import { prisma } from "@/lib/db/prisma";
import {
  TransactionSource,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";
import { generateTransactionReference } from "@/lib/utils/reference-generator";
import { billerEsbService } from "@/lib/services/billers/biller-esb-service";
import { Decimal } from "@prisma/client/runtime/library";
import { t24Service } from "@/lib/services/t24-service";
import { ConfigurationService } from "@/lib/services/configuration-service";

/**
 * Biller Resolvers
 * Following airtime pattern - calls T24 ESB directly
 */
export const billersResolvers = {
  Query: {
    /**
     * Get available billers
     * Returns static list of supported billers
     */
    availableBillers: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.userId) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      // Static list of available billers
      return [
        {
          type: "LWB_POSTPAID",
          name: "Lilongwe Water Board",
          displayName: "LWB Water Bill",
          description: "Lilongwe Water Board postpaid water bills",
          isActive: true,
          features: {
            supportsInvoice: false,
            supportsBalanceCheck: false,
            requiresTwoStep: false,
            supportsAccountLookup: true,
            isBundleBased: false,
            validationOnly: false,
            requiresAccountType: false,
          },
          validationRules: {
            accountNumberFormat: "^[0-9]{6,12}$",
            minAmount: 100,
            maxAmount: 1000000,
          },
          supportedCurrencies: ["MWK"],
          defaultCurrency: "MWK",
        },
        {
          type: "BWB_POSTPAID",
          name: "Blantyre Water Board",
          displayName: "BWB Water Bill",
          description: "Blantyre Water Board postpaid water bills",
          isActive: true,
          features: {
            supportsInvoice: false,
            supportsBalanceCheck: false,
            requiresTwoStep: false,
            supportsAccountLookup: true,
            isBundleBased: false,
            validationOnly: false,
            requiresAccountType: false,
          },
          validationRules: {
            accountNumberFormat: "^[0-9]{6,12}$",
            minAmount: 100,
            maxAmount: 1000000,
          },
          supportedCurrencies: ["MWK"],
          defaultCurrency: "MWK",
        },
        {
          type: "SRWB_POSTPAID",
          name: "Southern Region Water Board",
          displayName: "SRWB Water Bill",
          description: "Southern Region Water Board postpaid water bills",
          isActive: true,
          features: {
            supportsInvoice: false,
            supportsBalanceCheck: false,
            requiresTwoStep: false,
            supportsAccountLookup: true,
            isBundleBased: false,
            validationOnly: false,
            requiresAccountType: false,
          },
          validationRules: {
            accountNumberFormat: "^[0-9]{6,12}$",
            minAmount: 100,
            maxAmount: 1000000,
          },
          supportedCurrencies: ["MWK"],
          defaultCurrency: "MWK",
        },
        {
          type: "MASM",
          name: "MASM Electricity",
          displayName: "MASM Electricity",
          description: "Electricity bill payments and tokens",
          isActive: true,
          features: {
            supportsInvoice: false,
            supportsBalanceCheck: false,
            requiresTwoStep: false,
            supportsAccountLookup: true,
            isBundleBased: false,
            validationOnly: false,
            requiresAccountType: true,
          },
          validationRules: {
            accountNumberFormat: "^[0-9]{6,12}$",
            minAmount: 100,
            maxAmount: 1000000,
          },
          supportedCurrencies: ["MWK"],
          defaultCurrency: "MWK",
        },
      ];
    },

    /**
     * Get specific biller info
     */
    billerInfo: async (
      _: unknown,
      { type }: { type: string },
      context: GraphQLContext
    ) => {
      if (!context.userId) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const billers = await billersResolvers.Query.availableBillers(_, {}, context);
      return billers.find((b: any) => b.type === type) || null;
    },

    /**
     * Lookup account before payment
     * Calls T24 ESB directly
     */
    billerAccountLookup: async (
      _: unknown,
      { input }: { input: { billerType: string; accountNumber: string; accountType?: string } },
      context: GraphQLContext
    ) => {
      if (!context.userId) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const { billerType, accountNumber, accountType } = input;

      try {
        // Call ESB directly (like airtime)
        const result = await billerEsbService.lookupAccount(billerType, {
          accountNumber,
          accountType,
        });

        if (!result.ok) {
          throw new GraphQLError(result.error || "Account lookup failed", {
            extensions: { code: "ESB_ERROR" },
          });
        }

        // Parse and return account details
        return {
          accountNumber,
          customerName: result.data?.customerName || result.data?.name || "Unknown",
          balance: result.data?.balance || result.data?.amount || null,
          status: result.data?.status || "active",
          billerDetails: result.data,
        };
      } catch (error: any) {
        console.error("Biller account lookup error:", error);
        throw new GraphQLError(error.message || "Failed to lookup account", {
          extensions: { code: "ESB_ERROR" },
        });
      }
    },

    /**
     * Get user's biller transactions
     */
    myBillerTransactions: async (
      _: unknown,
      {
        billerType,
        status,
        limit = 50,
        offset = 0,
      }: {
        billerType?: string;
        status?: string;
        limit?: number;
        offset?: number;
      },
      context: GraphQLContext
    ) => {
      if (!context.userId) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      // Query FdhTransaction for bill payments
      const where: any = {
        initiatedByUserId: context.userId,
        type: TransactionType.BILL_PAYMENT,
      };

      if (status) {
        where.status = status;
      }

      const [transactions, total] = await Promise.all([
        prisma.fdhTransaction.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.fdhTransaction.count({ where }),
      ]);

      // Map to BillerTransaction format
      return {
        transactions: transactions.map((tx) => ({
          id: tx.id,
          ourTransactionId: tx.reference,
          billerType: extractBillerType(tx.description),
          billerName: extractBillerName(tx.description),
          accountNumber: tx.toAccountNumber || "",
          amount: tx.amount.toNumber(),
          currency: tx.currency,
          status: tx.status,
          transactionType: "POST_TRANSACTION",
          accountType: null,
          customerAccountName: null,
          errorMessage: tx.errorMessage,
          errorCode: tx.errorCode,
          requestPayload: null,
          responsePayload: tx.t24Response,
          completedAt: tx.completedAt?.toISOString(),
          createdAt: tx.createdAt.toISOString(),
          updatedAt: tx.updatedAt.toISOString(),
        })),
        total,
        hasMore: offset + transactions.length < total,
      };
    },

    /**
     * Get specific transaction
     */
    billerTransaction: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      if (!context.userId) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const transaction = await prisma.fdhTransaction.findUnique({
        where: { id },
      });

      if (!transaction || transaction.initiatedByUserId !== context.userId) {
        throw new GraphQLError("Transaction not found or access denied", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      return {
        id: transaction.id,
        ourTransactionId: transaction.reference,
        billerType: extractBillerType(transaction.description),
        billerName: extractBillerName(transaction.description),
        accountNumber: transaction.toAccountNumber || "",
        amount: transaction.amount.toNumber(),
        currency: transaction.currency,
        status: transaction.status,
        transactionType: "POST_TRANSACTION",
        accountType: null,
        customerAccountName: null,
        errorMessage: transaction.errorMessage,
        errorCode: transaction.errorCode,
        requestPayload: null,
        responsePayload: transaction.t24Response,
        completedAt: transaction.completedAt?.toISOString(),
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString(),
      };
    },
  },

  Mutation: {
    /**
     * Process biller payment
     * Following airtime pattern - calls ESB directly
     */
    billerPayment: async (
      _: unknown,
      { input }: { input: any },
      context: GraphQLContext
    ) => {
      if (!context.userId) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const {
        billerType,
        accountNumber,
        amount: amountInput,
        debitAccount,
        debitAccountType,
        currency = "MWK",
        accountType,
        creditAccount,
        creditAccountType,
        customerAccountNumber,
        customerAccountName,
      } = input;

      const amount = new Decimal(amountInput);

      if (amount.lte(0)) {
        throw new GraphQLError("Amount must be greater than zero", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      // Verify account ownership
      const sourceAccount = await prisma.mobileUserAccount.findFirst({
        where: {
          accountNumber: debitAccount,
          mobileUserId: context.userId,
        },
      });

      if (!sourceAccount) {
        throw new GraphQLError("Source account not found or unauthorized", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const reference = generateTransactionReference();

      // Create transaction record (like airtime)
      const transaction = await prisma.fdhTransaction.create({
        data: {
          type: TransactionType.BILL_PAYMENT,
          source: TransactionSource.MOBILE_BANKING,
          reference,
          status: TransactionStatus.PENDING,
          amount,
          currency: sourceAccount.currency,
          description: `Bill payment: ${billerType} - ${accountNumber}`,
          fromAccountNumber: sourceAccount.accountNumber,
          toAccountNumber: accountNumber,
          initiatedByUserId: context.userId,
        },
      });

      try {
        // 1. FUND RESERVATION: Move funds to Outbound Suspense Account
        const outboundSuspense = await ConfigurationService.getOutboundSuspenseAccount();
        console.log(`[BillerResolver] Reserving funds: ${sourceAccount.accountNumber} -> Suspense ${outboundSuspense}`);

        const reservationResult = await t24Service.transfer({
          fromAccount: sourceAccount.accountNumber,
          toAccount: outboundSuspense,
          amount: amount.toString(), // amount is Decimal
          currency: currency,
          reference: `RES-${reference}`,
          description: `Biller Reservation: ${billerType}`,
          transferType: "BILLER_RESERVATION" as any
        });

        if (!reservationResult.success) {
          // Return T24 error directly as requested
          const errorMessage = reservationResult.message || "Fund reservation failed";

          await prisma.fdhTransaction.update({
            where: { id: transaction.id },
            data: {
              status: TransactionStatus.FAILED,
              errorMessage,
              errorCode: reservationResult.errorCode
            }
          });

          return {
            success: false,
            message: errorMessage, // Sending T24 error to user
            transactionId: transaction.id,
            reference,
            status: "FAILED"
          };
        }

        // 2. EXECUTE BILLER PAYMENT
        // Call ESB directly (like airtime)
        let result;
        try {
          result = await billerEsbService.processPayment(billerType, {
            accountNumber,
            amount: amount.toNumber(),
            currency,
            debitAccount,
            debitAccountType,
            creditAccount,
            creditAccountType,
            customerAccountNumber,
            customerAccountName,
            externalTxnId: reference,
            accountType,
          });
        } catch (billerError: any) {
          // 3. REVERSAL ON EXCEPTION
          console.warn(`[BillerResolver] Biller threw error, reversing funds: Suspense ${outboundSuspense} -> ${sourceAccount.accountNumber}`);
          try {
            await t24Service.transfer({
              fromAccount: outboundSuspense,
              toAccount: sourceAccount.accountNumber,
              amount: amount.toString(),
              currency: currency,
              reference: `REV-${reference}`,
              description: `Reversal: ${billerType} Failed`,
              transferType: "BILLER_REVERSAL" as any
            });
          } catch (reversalError) {
            console.error(`[BillerResolver] CRITICAL: Fund reversal failed!`, reversalError);
          }
          throw billerError; // Let outer catch handle the transaction update
        }

        if (result.ok) {
          // Update transaction status
          await prisma.fdhTransaction.update({
            where: { id: transaction.id },
            data: {
              status: TransactionStatus.COMPLETED,
              t24Reference: reference,
              t24Response: result.data,
            },
          });

          return {
            success: true,
            message: "Bill payment successful",
            transactionId: transaction.id,
            reference,
            status: "COMPLETED",
            transaction: {
              id: transaction.id,
              ourTransactionId: reference,
              billerType,
              billerName: billerType.replace(/_/g, " "),
              accountNumber,
              amount: amount.toNumber(),
              currency: sourceAccount.currency,
              status: "COMPLETED",
              transactionType: "POST_TRANSACTION",
              accountType,
              customerAccountName,
              errorMessage: null,
              errorCode: null,
              requestPayload: null,
              responsePayload: result.data,
              completedAt: new Date().toISOString(),
              createdAt: transaction.createdAt.toISOString(),
              updatedAt: new Date().toISOString(),
            },
          };
        } else {
          // 3b. REVERSAL ON LOGICAL FAILURE
          console.warn(`[BillerResolver] Biller returned unsucessful result, reversing funds`);
          try {
            await t24Service.transfer({
              fromAccount: outboundSuspense,
              toAccount: sourceAccount.accountNumber,
              amount: amount.toString(),
              currency: currency,
              reference: `REV-${reference}`,
              description: `Reversal: ${billerType} Failed`,
              transferType: "BILLER_REVERSAL" as any
            });
          } catch (reversalError) {
            console.error(`[BillerResolver] CRITICAL: Fund reversal failed!`, reversalError);
          }

          const errorMessage = result.error || "Failed to process bill payment";

          await prisma.fdhTransaction.update({
            where: { id: transaction.id },
            data: {
              status: TransactionStatus.FAILED,
              errorMessage,
            },
          });

          return {
            success: false,
            message: errorMessage,
            transactionId: transaction.id,
            reference,
            status: "FAILED",
            transaction: {
              id: transaction.id,
              ourTransactionId: reference,
              billerType,
              billerName: billerType.replace(/_/g, " "),
              accountNumber,
              amount: amount.toNumber(),
              currency: sourceAccount.currency,
              status: "FAILED",
              transactionType: "POST_TRANSACTION",
              accountType,
              customerAccountName,
              errorMessage,
              errorCode: null,
              requestPayload: null,
              responsePayload: result.data,
              completedAt: null,
              createdAt: transaction.createdAt.toISOString(),
              updatedAt: new Date().toISOString(),
            },
          };
        }
      } catch (error: any) {
        console.error("Bill payment error:", error);

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

// Helper functions
function extractBillerType(description: string): string {
  const match = description.match(/Bill payment: (\w+)/);
  return match ? match[1] : "UNKNOWN";
}

function extractBillerName(description: string): string {
  const type = extractBillerType(description);
  return type.replace(/_/g, " ");
}
