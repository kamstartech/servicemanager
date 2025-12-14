import { prisma } from "@/lib/db/prisma";
import { billerTransactionService } from "@/lib/services/billers/transactions";
import { BillerType, BillerTransactionStatus } from "@prisma/client";
import type { GraphQLContext } from "../context";

export const billersResolvers = {
  Query: {
    /**
     * Get all available billers
     */
    availableBillers: async (_: unknown, __: unknown, context: GraphQLContext) => {
      // Check if user is authenticated
      if (!context.user) {
        throw new Error("Authentication required");
      }

      const billers = await prisma.billerConfig.findMany({
        where: { isActive: true },
        orderBy: { billerName: "asc" },
      });

      return billers.map((biller) => ({
        type: biller.billerType,
        name: biller.billerName,
        displayName: biller.displayName,
        description: biller.description,
        isActive: biller.isActive,
        features: biller.features,
        validationRules: biller.validationRules,
        supportedCurrencies: biller.supportedCurrencies,
        defaultCurrency: biller.defaultCurrency,
      }));
    },

    /**
     * Get specific biller info
     */
    billerInfo: async (
      _: unknown,
      { type }: { type: BillerType },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error("Authentication required");
      }

      const biller = await prisma.billerConfig.findUnique({
        where: { billerType: type, isActive: true },
      });

      if (!biller) {
        return null;
      }

      return {
        type: biller.billerType,
        name: biller.billerName,
        displayName: biller.displayName,
        description: biller.description,
        isActive: biller.isActive,
        features: biller.features,
        validationRules: biller.validationRules,
        supportedCurrencies: biller.supportedCurrencies,
        defaultCurrency: biller.defaultCurrency,
      };
    },

    /**
     * Lookup account before payment
     */
    billerAccountLookup: async (
      _: unknown,
      { input }: { input: { billerType: BillerType; accountNumber: string; accountType?: string } },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error("Authentication required");
      }

      const result = await billerTransactionService.processAccountLookup(
        input.billerType,
        input.accountNumber,
        input.accountType
      );

      if (!result.success) {
        throw new Error(result.error || "Account lookup failed");
      }

      return result.accountDetails;
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
        billerType?: BillerType;
        status?: BillerTransactionStatus;
        limit?: number;
        offset?: number;
      },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error("Authentication required");
      }

      // Build where clause
      const where: any = {
        initiatedBy: context.user.id?.toString(),
      };

      if (billerType) {
        where.billerType = billerType;
      }

      if (status) {
        where.status = status;
      }

      const [transactions, total] = await Promise.all([
        prisma.billerTransaction.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.billerTransaction.count({ where }),
      ]);

      return {
        transactions,
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
      if (!context.user) {
        throw new Error("Authentication required");
      }

      const transaction = await prisma.billerTransaction.findUnique({
        where: { id },
      });

      // Verify ownership
      if (transaction && transaction.initiatedBy !== context.user.id?.toString()) {
        throw new Error("Access denied");
      }

      return transaction;
    },
  },

  Mutation: {
    /**
     * Process biller payment
     */
    billerPayment: async (
      _: unknown,
      { input }: { input: any },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error("Authentication required");
      }

      const result = await billerTransactionService.processPayment(
        input.billerType,
        {
          accountNumber: input.accountNumber,
          amount: input.amount,
          currency: input.currency,
          accountType: input.accountType,
          creditAccount: input.creditAccount,
          creditAccountType: input.creditAccountType,
          debitAccount: input.debitAccount,
          debitAccountType: input.debitAccountType,
          customerAccountNumber: input.customerAccountNumber || context.user.username,
          customerAccountName: input.customerAccountName || context.user.username,
          metadata: {
            ...input.metadata,
            userId: context.user.id,
            username: context.user.username,
          },
        }
      );

      // Update transaction with user info
      if (result.transaction) {
        await prisma.billerTransaction.update({
          where: { id: result.transaction.id },
          data: { initiatedBy: context.user.id?.toString() },
        });
      }

      return {
        success: result.success,
        transactionId: result.transaction?.ourTransactionId,
        externalReference: result.result?.externalReference,
        message: result.result?.message || result.error,
        transaction: result.transaction,
      };
    },

    /**
     * Retry failed transaction
     */
    billerRetryTransaction: async (
      _: unknown,
      { transactionId }: { transactionId: string },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error("Authentication required");
      }

      // Verify ownership
      const transaction = await prisma.billerTransaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      if (transaction.initiatedBy !== context.user.id?.toString()) {
        throw new Error("Access denied");
      }

      const result = await billerTransactionService.retryTransaction(transactionId);

      return {
        success: result.success,
        transactionId: result.transaction?.ourTransactionId,
        message: result.success ? "Transaction retry initiated" : result.error,
        transaction: result.transaction,
      };
    },
  },
};
