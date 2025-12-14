import { GraphQLError } from "graphql";
import { GraphQLContext } from "../context";
import { prisma } from "@/lib/db/prisma";
import { Prisma, TransactionStatus, TransactionType } from "@prisma/client";
import { generateTransactionReference } from "@/lib/utils/reference-generator";
import { Decimal } from "@prisma/client/runtime/library";

export const transactionResolvers = {
  Query: {
    transaction: async (
      _: any,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      if (!context.adminUser && !context.mobileUser) {
        throw new GraphQLError("Unauthorized", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const transaction = await prisma.fdhTransaction.findUnique({
        where: { id },
        include: {
          fromAccount: true,
          toAccount: true,
          fromWallet: true,
          toWallet: true,
          initiatedBy: true,
          statusHistory: true,
        },
      });

      if (!transaction) {
        throw new GraphQLError("Transaction not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      // Authorization: mobile users can only see their own transactions
      if (context.mobileUser) {
        const hasAccess =
          transaction.fromWalletId === context.mobileUser.id ||
          transaction.toWalletId === context.mobileUser.id ||
          transaction.initiatedByUserId === context.mobileUser.id;

        if (!hasAccess) {
          throw new GraphQLError("Forbidden", {
            extensions: { code: "FORBIDDEN" },
          });
        }
      }

      return transaction;
    },

    transactionByReference: async (
      _: any,
      { reference }: { reference: string },
      context: GraphQLContext
    ) => {
      if (!context.adminUser && !context.mobileUser) {
        throw new GraphQLError("Unauthorized", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      return await prisma.fdhTransaction.findUnique({
        where: { reference },
        include: {
          fromAccount: true,
          toAccount: true,
          fromWallet: true,
          toWallet: true,
          initiatedBy: true,
          statusHistory: true,
        },
      });
    },

    transactions: async (
      _: any,
      {
        filter,
        page = 1,
        limit = 20,
      }: {
        filter?: any;
        page?: number;
        limit?: number;
      },
      context: GraphQLContext
    ) => {
      if (!context.adminUser) {
        throw new GraphQLError("Admin access required", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const where: Prisma.FdhTransactionWhereInput = {};

      if (filter) {
        if (filter.status) where.status = filter.status;
        if (filter.type) where.type = filter.type;
        if (filter.source) where.source = filter.source;
        if (filter.dateFrom || filter.dateTo) {
          where.createdAt = {};
          if (filter.dateFrom) where.createdAt.gte = new Date(filter.dateFrom);
          if (filter.dateTo) where.createdAt.lte = new Date(filter.dateTo);
        }
        if (filter.minAmount || filter.maxAmount) {
          where.amount = {};
          if (filter.minAmount)
            where.amount.gte = new Decimal(filter.minAmount);
          if (filter.maxAmount)
            where.amount.lte = new Decimal(filter.maxAmount);
        }
        if (filter.accountId) {
          where.OR = [
            { fromAccountId: filter.accountId },
            { toAccountId: filter.accountId },
          ];
        }
        if (filter.walletId) {
          where.OR = [
            { fromWalletId: filter.walletId },
            { toWalletId: filter.walletId },
          ];
        }
        if (filter.search) {
          where.OR = [
            { reference: { contains: filter.search, mode: "insensitive" } },
            { description: { contains: filter.search, mode: "insensitive" } },
            {
              fromAccountNumber: {
                contains: filter.search,
                mode: "insensitive",
              },
            },
            {
              toAccountNumber: { contains: filter.search, mode: "insensitive" },
            },
            {
              fromWalletNumber: {
                contains: filter.search,
                mode: "insensitive",
              },
            },
            {
              toWalletNumber: { contains: filter.search, mode: "insensitive" },
            },
          ];
        }
      }

      const [transactions, totalCount] = await Promise.all([
        prisma.fdhTransaction.findMany({
          where,
          include: {
            fromAccount: true,
            toAccount: true,
            fromWallet: true,
            toWallet: true,
            statusHistory: true,
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.fdhTransaction.count({ where }),
      ]);

      return {
        transactions,
        totalCount,
        pageInfo: {
          hasNextPage: page * limit < totalCount,
          hasPreviousPage: page > 1,
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    },

    accountTransactions: async (
      _: any,
      {
        accountId,
        page = 1,
        limit = 20,
      }: { accountId: number; page?: number; limit?: number },
      context: GraphQLContext
    ) => {
      if (!context.adminUser && !context.mobileUser) {
        throw new GraphQLError("Unauthorized", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      // Verify account ownership for mobile users
      if (context.mobileUser) {
        const account = await prisma.mobileUserAccount.findUnique({
          where: { id: accountId },
        });

        if (account?.mobileUserId !== context.mobileUser.id) {
          throw new GraphQLError("Forbidden", {
            extensions: { code: "FORBIDDEN" },
          });
        }
      }

      const where: Prisma.FdhTransactionWhereInput = {
        OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
      };

      const [transactions, totalCount] = await Promise.all([
        prisma.fdhTransaction.findMany({
          where,
          include: {
            fromAccount: true,
            toAccount: true,
            fromWallet: true,
            toWallet: true,
            statusHistory: true,
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.fdhTransaction.count({ where }),
      ]);

      return {
        transactions,
        totalCount,
        pageInfo: {
          hasNextPage: page * limit < totalCount,
          hasPreviousPage: page > 1,
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    },

    walletTransactions: async (
      _: any,
      {
        walletId,
        page = 1,
        limit = 20,
      }: { walletId: number; page?: number; limit?: number },
      context: GraphQLContext
    ) => {
      if (!context.adminUser && !context.mobileUser) {
        throw new GraphQLError("Unauthorized", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      // Verify wallet ownership for mobile users
      if (context.mobileUser && context.mobileUser.id !== walletId) {
        throw new GraphQLError("Forbidden", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const where: Prisma.FdhTransactionWhereInput = {
        OR: [{ fromWalletId: walletId }, { toWalletId: walletId }],
      };

      const [transactions, totalCount] = await Promise.all([
        prisma.fdhTransaction.findMany({
          where,
          include: {
            fromAccount: true,
            toAccount: true,
            fromWallet: true,
            toWallet: true,
            statusHistory: true,
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.fdhTransaction.count({ where }),
      ]);

      return {
        transactions,
        totalCount,
        pageInfo: {
          hasNextPage: page * limit < totalCount,
          hasPreviousPage: page > 1,
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    },

    retryableTransactions: async (
      _: any,
      { limit = 100 }: { limit?: number },
      context: GraphQLContext
    ) => {
      if (!context.adminUser) {
        throw new GraphQLError("Admin access required", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const now = new Date();

      return await prisma.fdhTransaction.findMany({
        where: {
          status: TransactionStatus.FAILED,
          retryCount: { lt: 3 },
          nextRetryAt: { lte: now },
        },
        orderBy: { nextRetryAt: "asc" },
        take: limit,
        include: {
          fromAccount: true,
          toAccount: true,
          fromWallet: true,
          toWallet: true,
          statusHistory: true,
        },
      });
    },

    transactionRetryStats: async (
      _: any,
      __: any,
      context: GraphQLContext
    ) => {
      if (!context.adminUser) {
        throw new GraphQLError("Admin access required", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const now = new Date();

      const [totalRetryable, totalFailed, totalPending, nextRetryTxn] =
        await Promise.all([
          prisma.fdhTransaction.count({
            where: {
              status: TransactionStatus.FAILED,
              retryCount: { lt: 3 },
              nextRetryAt: { lte: now },
            },
          }),
          prisma.fdhTransaction.count({
            where: { status: TransactionStatus.FAILED_PERMANENT },
          }),
          prisma.fdhTransaction.count({
            where: { status: TransactionStatus.PENDING },
          }),
          prisma.fdhTransaction.findFirst({
            where: {
              status: TransactionStatus.FAILED,
              nextRetryAt: { gte: now },
            },
            orderBy: { nextRetryAt: "asc" },
            select: { nextRetryAt: true },
          }),
        ]);

      return {
        totalRetryable,
        totalFailed,
        totalPending,
        nextRetryTime: nextRetryTxn?.nextRetryAt,
      };
    },
  },

  Mutation: {
    createTransaction: async (
      _: any,
      { input }: { input: any },
      context: GraphQLContext
    ) => {
      if (!context.adminUser && !context.mobileUser) {
        throw new GraphQLError("Unauthorized", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      try {
        // Generate unique reference
        const reference = generateTransactionReference();

        // Validate amount
        const amount = new Decimal(input.amount);
        if (amount.lte(0)) {
          throw new Error("Amount must be greater than zero");
        }

        // Create transaction
        const transaction = await prisma.fdhTransaction.create({
          data: {
            type: input.type,
            source: input.source || "API",
            reference,
            status: TransactionStatus.PENDING,
            amount,
            currency: input.currency || "MWK",
            description: input.description,
            fromAccountId: input.fromAccountId,
            fromAccountNumber: input.fromAccountNumber,
            fromWalletId: input.fromWalletId,
            fromWalletNumber: input.fromWalletNumber,
            toAccountId: input.toAccountId,
            toAccountNumber: input.toAccountNumber,
            toWalletId: input.toWalletId,
            toWalletNumber: input.toWalletNumber,
            maxRetries: input.maxRetries || 3,
            initiatedByUserId: context.mobileUser?.id,
          },
          include: {
            fromAccount: true,
            toAccount: true,
            fromWallet: true,
            toWallet: true,
            statusHistory: true,
          },
        });

        // Create status history
        await prisma.fdhTransactionStatusHistory.create({
          data: {
            transactionId: transaction.id,
            fromStatus: TransactionStatus.PENDING,
            toStatus: TransactionStatus.PENDING,
            reason: "Transaction created",
          },
        });

        return {
          success: true,
          transaction,
          message: "Transaction created successfully",
          errors: [],
        };
      } catch (error) {
        console.error("Create transaction error:", error);
        return {
          success: false,
          transaction: null,
          message: "Failed to create transaction",
          errors: [error instanceof Error ? error.message : "Unknown error"],
        };
      }
    },

    retryTransaction: async (
      _: any,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      if (!context.adminUser) {
        throw new GraphQLError("Admin access required", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const transaction = await prisma.fdhTransaction.findUnique({
        where: { id },
      });

      if (!transaction) {
        throw new GraphQLError("Transaction not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      if (transaction.status !== TransactionStatus.FAILED) {
        throw new GraphQLError("Only failed transactions can be retried", {
          extensions: { code: "BAD_REQUEST" },
        });
      }

      if (transaction.retryCount >= transaction.maxRetries) {
        throw new GraphQLError("Maximum retries exceeded", {
          extensions: { code: "BAD_REQUEST" },
        });
      }

      // Reset to pending
      const updatedTransaction = await prisma.fdhTransaction.update({
        where: { id },
        data: {
          status: TransactionStatus.PENDING,
          errorMessage: null,
          errorCode: null,
          nextRetryAt: new Date(), // Process immediately
        },
        include: {
          fromAccount: true,
          toAccount: true,
          fromWallet: true,
          toWallet: true,
          statusHistory: true,
        },
      });

      // Create status history
      await prisma.fdhTransactionStatusHistory.create({
        data: {
          transactionId: id,
          fromStatus: TransactionStatus.FAILED,
          toStatus: TransactionStatus.PENDING,
          reason: "Manual retry by admin",
          retryNumber: transaction.retryCount + 1,
        },
      });

      return {
        success: true,
        transaction: updatedTransaction,
        message: "Transaction queued for retry",
        errors: [],
      };
    },

    reverseTransaction: async (
      _: any,
      { id, reason }: { id: string; reason: string },
      context: GraphQLContext
    ) => {
      if (!context.adminUser) {
        throw new GraphQLError("Admin access required", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const originalTransaction = await prisma.fdhTransaction.findUnique({
        where: { id },
        include: {
          fromAccount: true,
          toAccount: true,
          fromWallet: true,
          toWallet: true,
        },
      });

      if (!originalTransaction) {
        throw new GraphQLError("Transaction not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      if (originalTransaction.status !== TransactionStatus.COMPLETED) {
        throw new GraphQLError("Only completed transactions can be reversed", {
          extensions: { code: "BAD_REQUEST" },
        });
      }

      if (originalTransaction.isReversal) {
        throw new GraphQLError("Cannot reverse a reversal transaction", {
          extensions: { code: "BAD_REQUEST" },
        });
      }

      // Create reversal transaction (swap from/to)
      const reversalReference = generateTransactionReference();
      const reversalTransaction = await prisma.fdhTransaction.create({
        data: {
          type: originalTransaction.type,
          source: originalTransaction.source,
          reference: reversalReference,
          status: TransactionStatus.PENDING,
          amount: originalTransaction.amount,
          currency: originalTransaction.currency,
          description: `Reversal: ${reason}`,
          // Swap accounts
          fromAccountId: originalTransaction.toAccountId,
          fromAccountNumber: originalTransaction.toAccountNumber,
          toAccountId: originalTransaction.fromAccountId,
          toAccountNumber: originalTransaction.fromAccountNumber,
          // Swap wallets
          fromWalletId: originalTransaction.toWalletId,
          fromWalletNumber: originalTransaction.toWalletNumber,
          toWalletId: originalTransaction.fromWalletId,
          toWalletNumber: originalTransaction.fromWalletNumber,
          isReversal: true,
          originalTxnId: originalTransaction.id,
          reversalReason: reason,
          maxRetries: 3,
        },
        include: {
          fromAccount: true,
          toAccount: true,
          fromWallet: true,
          toWallet: true,
          statusHistory: true,
        },
      });

      // Update original transaction status
      await prisma.fdhTransaction.update({
        where: { id },
        data: { status: TransactionStatus.REVERSED },
      });

      // Create status history for reversal
      await prisma.fdhTransactionStatusHistory.create({
        data: {
          transactionId: reversalTransaction.id,
          fromStatus: TransactionStatus.PENDING,
          toStatus: TransactionStatus.PENDING,
          reason: `Reversal created for transaction ${originalTransaction.reference}`,
        },
      });

      return {
        success: true,
        transaction: reversalTransaction,
        message: "Reversal transaction created",
        errors: [],
      };
    },
  },

  Transaction: {
    fromAccount: async (parent: any) => {
      if (!parent.fromAccountId) return null;
      return (
        parent.fromAccount ||
        (await prisma.mobileUserAccount.findUnique({
          where: { id: parent.fromAccountId },
        }))
      );
    },
    toAccount: async (parent: any) => {
      if (!parent.toAccountId) return null;
      return (
        parent.toAccount ||
        (await prisma.mobileUserAccount.findUnique({
          where: { id: parent.toAccountId },
        }))
      );
    },
    fromWallet: async (parent: any) => {
      if (!parent.fromWalletId) return null;
      return (
        parent.fromWallet ||
        (await prisma.mobileUser.findUnique({
          where: { id: parent.fromWalletId },
        }))
      );
    },
    toWallet: async (parent: any) => {
      if (!parent.toWalletId) return null;
      return (
        parent.toWallet ||
        (await prisma.mobileUser.findUnique({
          where: { id: parent.toWalletId },
        }))
      );
    },
    initiatedBy: async (parent: any) => {
      if (!parent.initiatedByUserId) return null;
      return (
        parent.initiatedBy ||
        (await prisma.mobileUser.findUnique({
          where: { id: parent.initiatedByUserId },
        }))
      );
    },
    statusHistory: async (parent: any) => {
      return (
        parent.statusHistory ||
        (await prisma.fdhTransactionStatusHistory.findMany({
          where: { transactionId: parent.id },
          orderBy: { createdAt: "asc" },
        }))
      );
    },
  },
};
