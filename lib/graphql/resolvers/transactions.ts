import { GraphQLError } from "graphql";
import { GraphQLContext } from "../context";
import { prisma } from "@/lib/db/prisma";
import {
  MobileUserContext,
  Prisma,
  TransferType,
  TransactionSource,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";
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
          transaction.initiatedByUserId === context.mobileUser.id ||
          transaction.fromAccount?.mobileUserId === context.mobileUser.id ||
          transaction.toAccount?.mobileUserId === context.mobileUser.id;

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
      if (!context.adminUser && !context.adminId) {
        throw new GraphQLError("Admin access required", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const where: Prisma.FdhTransactionWhereInput = {};

      if (filter) {
        if (filter.status) where.status = filter.status;
        if (filter.type) where.type = filter.type;
        if (filter.source) where.source = filter.source;
        if (filter.context) where.transferContext = filter.context;
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
          ];
        }
      }

      const [transactions, totalCount] = await Promise.all([
        prisma.fdhTransaction.findMany({
          where,
          include: {
            fromAccount: true,
            toAccount: true,
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
    createTransfer: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          type: TransferType;
          context: MobileUserContext;
          amount: string | number;
          currency?: string | null;
          description?: string | null;
          fromAccountId?: number | null;
          toAccountNumber?: string | null;
        };
      },
      context: GraphQLContext
    ) => {
      if (!context.mobileUser) {
        throw new GraphQLError("Unauthorized", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      try {
        const amount = new Decimal(input.amount);
        if (amount.lte(0)) {
          throw new Error("Amount must be greater than zero");
        }

        if (!input.fromAccountId) {
          throw new Error("fromAccountId is required for account transfers");
        }

        const toAccountNumber = (input.toAccountNumber || "").trim();
        if (!toAccountNumber) {
          throw new Error("toAccountNumber is required for account transfers");
        }

        const fromAccount = await prisma.mobileUserAccount.findUnique({
          where: { id: input.fromAccountId },
          select: {
            id: true,
            mobileUserId: true,
            context: true,
            accountNumber: true,
            isActive: true,
          },
        });

        if (!fromAccount) {
          throw new GraphQLError("Source account not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        if (fromAccount.mobileUserId !== context.mobileUser.id) {
          throw new GraphQLError("Forbidden", {
            extensions: { code: "FORBIDDEN" },
          });
        }

        if (!fromAccount.isActive) {
          throw new GraphQLError("Source account is not active", {
            extensions: { code: "BAD_REQUEST" },
          });
        }

        if (fromAccount.context !== input.context) {
          throw new GraphQLError("Source account context mismatch", {
            extensions: { code: "BAD_REQUEST" },
          });
        }

        if (fromAccount.accountNumber === toAccountNumber) {
          throw new GraphQLError("Cannot transfer to the same account", {
            extensions: { code: "BAD_REQUEST" },
          });
        }

        const toAccount = await prisma.mobileUserAccount.findFirst({
          where: {
            accountNumber: toAccountNumber,
            context: input.context,
            isActive: true,
          },
          select: {
            id: true,
            accountNumber: true,
            mobileUserId: true,
          },
        });

        if (input.type === TransferType.SELF) {
          if (!toAccount) {
            throw new GraphQLError("Destination account not found for SELF transfer", {
              extensions: { code: "NOT_FOUND" },
            });
          }

          if (toAccount.mobileUserId !== context.mobileUser.id) {
            throw new GraphQLError("SELF transfer destination must belong to the same user", {
              extensions: { code: "FORBIDDEN" },
            });
          }
        }

        const reference = generateTransactionReference();
        const currency = input.currency || "MWK";
        const description = input.description || "Transfer";

        const transaction = await prisma.fdhTransaction.create({
          data: {
            type: TransactionType.TRANSFER,
            source:
              input.context === MobileUserContext.WALLET
                ? TransactionSource.WALLET
                : TransactionSource.MOBILE_BANKING,
            reference,
            status: TransactionStatus.PENDING,
            transferType: input.type,
            transferContext: input.context,
            amount,
            currency,
            description,
            fromAccountId: fromAccount.id,
            fromAccountNumber: fromAccount.accountNumber,
            toAccountId: toAccount?.id,
            toAccountNumber: toAccount?.accountNumber || toAccountNumber,
            t24RequestBody: {
              type: input.type,
              context: input.context,
              fromAccount: fromAccount.accountNumber,
              toAccount: toAccount?.accountNumber || toAccountNumber,
              amount: amount.toString(),
              currency,
              reference,
              description,
            },
            maxRetries: 3,
            initiatedByUserId: context.mobileUser.id,
          },
          include: {
            fromAccount: true,
            toAccount: true,
            initiatedBy: true,
            statusHistory: true,
          },
        });

        await prisma.fdhTransactionStatusHistory.create({
          data: {
            transactionId: transaction.id,
            fromStatus: TransactionStatus.PENDING,
            toStatus: TransactionStatus.PENDING,
            reason: `Transfer created (type=${input.type})`,
          },
        });

        return {
          success: true,
          transaction,
          message: "Transfer created successfully",
          errors: [],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Create transfer error:", error);
        return {
          success: false,
          transaction: null,
          message: "Failed to create transfer",
          errors: [message],
        };
      }
    },

    createTransaction: async (
      _: any,
      { input }: { input: any },
      context: GraphQLContext
    ) => {
      try {
        if (!context.adminUser && !context.adminId && !context.mobileUser) {
          return {
            success: false,
            transaction: null,
            message: "Unauthorized",
            errors: ["Unauthorized"],
          };
        }

        // Generate unique reference
        const reference = generateTransactionReference();

        // Validate amount
        const amount = new Decimal(input.amount);
        if (amount.lte(0)) {
          throw new Error("Amount must be greater than zero");
        }

        if (input.type === TransactionType.TRANSFER && !input.transferType) {
          throw new Error("transferType is required when creating a TRANSFER transaction");
        }

        let resolvedFromAccountNumber: string | null = input.fromAccountNumber || null;
        let resolvedTransferContext = input.context || null;

        if (input.fromAccountId && !resolvedFromAccountNumber) {
          const fromAccount = await prisma.mobileUserAccount.findUnique({
            where: { id: input.fromAccountId },
            select: { accountNumber: true, context: true },
          });

          if (!fromAccount) {
            throw new Error("fromAccountId not found");
          }

          resolvedFromAccountNumber = fromAccount.accountNumber;

          if (!resolvedTransferContext) {
            resolvedTransferContext = fromAccount.context;
          }

          if (input.context && fromAccount.context !== input.context) {
            throw new Error("Source account context mismatch");
          }
        }

        // Create transaction
        const transaction = await prisma.fdhTransaction.create({
          data: {
            type: input.type,
            source: input.source || (context.adminId ? TransactionSource.ADMIN : TransactionSource.API),
            reference,
            status: TransactionStatus.PENDING,
            transferType: input.transferType || null,
            transferContext: resolvedTransferContext,
            amount,
            currency: input.currency || "MWK",
            description: input.description,
            fromAccountId: input.fromAccountId,
            fromAccountNumber: resolvedFromAccountNumber,
            toAccountId: input.toAccountId,
            toAccountNumber: input.toAccountNumber,
            maxRetries: input.maxRetries || 3,
            initiatedByUserId: context.mobileUser?.id,
          },
          include: {
            fromAccount: true,
            toAccount: true,
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
          isReversal: true,
          originalTxnId: originalTransaction.id,
          reversalReason: reason,
          maxRetries: 3,
        },
        include: {
          fromAccount: true,
          toAccount: true,
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
