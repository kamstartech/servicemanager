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
import { Decimal } from "@prisma/client/runtime/library";
import { walletTransactionService } from "@/lib/services/wallet-transaction-service";
import { t24Service } from "@/lib/services/t24-service";

/**
 * Format T24 error responses into user-friendly messages
 */
function formatT24Error(t24Response: {
  message?: string;
  errorCode?: string;
}): string {
  const errorMap: Record<string, string> = {
    'INSUFFICIENT_FUNDS': 'Insufficient funds in the source account',
    'ACCOUNT_BLOCKED': 'The account is blocked. Please contact support',
    'DAILY_LIMIT_EXCEEDED': 'Daily transaction limit exceeded',
    'INVALID_ACCOUNT': 'Invalid destination account number',
    'ACCOUNT_NOT_FOUND': 'Destination account not found',
    'INVALID_AMOUNT': 'Invalid transaction amount',
    'T24_API_ERROR': 'Banking system is temporarily unavailable',
    'T24_ERROR': 'Banking system error occurred',
    'DUPLICATE_REFERENCE': 'This transaction has already been processed',
    'INVALID_CURRENCY': 'Invalid currency code',
    'SYSTEM_ERROR': 'System error. Please try again later',
  };

  if (t24Response.errorCode && errorMap[t24Response.errorCode]) {
    return errorMap[t24Response.errorCode];
  }

  // If we have a message from T24, use it (cleaning it up if necessary)
  if (t24Response.message && t24Response.message !== "T24 transfer failed") {
    return t24Response.message;
  }

  return 'Transfer failed. Please try again';
}

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
        // Check if user initiated the transaction
        const initiatedByUser = transaction.initiatedByUserId === context.mobileUser.id;

        // Check if user owns the source account
        let ownsSourceAccount = false;
        if (transaction.fromAccountNumber) {
          const sourceAccount = await prisma.mobileUserAccount.findFirst({
            where: {
              accountNumber: transaction.fromAccountNumber,
              mobileUserId: context.mobileUser.id,
            },
          });
          ownsSourceAccount = !!sourceAccount;
        }

        const hasAccess = initiatedByUser || ownsSourceAccount;

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
      if (!context.adminUser && !context.adminId && !context.mobileUser) {
        throw new GraphQLError("Unauthorized", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      let where: Prisma.FdhTransactionWhereInput = {};

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
          const account = await prisma.mobileUserAccount.findUnique({
            where: { id: filter.accountId },
          });
          if (account) {
            where.OR = [
              { fromAccountNumber: account.accountNumber },
              { toAccountNumber: account.accountNumber },
            ];
          } else {
            // Force empty result
            where.id = "0";
          }
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

      // Security: Mobile users can only see their own transactions
      if (context.mobileUser) {
        const userAccounts = await prisma.mobileUserAccount.findMany({
          where: { mobileUserId: context.mobileUser.id },
          select: { accountNumber: true },
        });

        const accountNumbers = userAccounts.map(acc => acc.accountNumber);

        const ownershipCondition: Prisma.FdhTransactionWhereInput = {
          OR: [
            { initiatedByUserId: context.mobileUser.id },
            { fromAccountNumber: { in: accountNumbers } },
            { toAccountNumber: { in: accountNumbers } },
          ],
        };

        // Combine with existing filters using AND. 
        // We create a new object to avoid circular references or issues, 
        // ensuring we wrap previous logic effectively.
        // Note: If where was empty, this is essentially just ownershipCondition.
        // But to be safe and simple:
        const existingWhere = { ...where };
        where = {
          AND: [existingWhere, ownershipCondition],
        };
      }

      const [transactions, totalCount] = await Promise.all([
        prisma.fdhTransaction.findMany({
          where,
          include: {
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

      const account = await prisma.mobileUserAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        throw new GraphQLError("Account not found", { extensions: { code: "NOT_FOUND" } });
      }

      // Verify account ownership for mobile users
      if (context.mobileUser && account.mobileUserId !== context.mobileUser.id) {
        throw new GraphQLError("Forbidden", { extensions: { code: "FORBIDDEN" } });
      }

      const where: Prisma.FdhTransactionWhereInput = {
        OR: [{ fromAccountNumber: account.accountNumber }, { toAccountNumber: account.accountNumber }],
      };

      const [transactions, totalCount] = await Promise.all([
        prisma.fdhTransaction.findMany({
          where,
          include: {
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
      if (context.mobileUser) {
        if (walletId !== context.mobileUser.id) {
          throw new GraphQLError("Forbidden", {
            extensions: { code: "FORBIDDEN" },
          });
        }
      }

      // Find the user's wallet account
      const walletAccount = await prisma.mobileUserAccount.findFirst({
        where: {
          mobileUserId: walletId,
          context: MobileUserContext.WALLET
        }
      });

      const where: Prisma.FdhTransactionWhereInput = {};

      if (walletAccount) {
        where.OR = [{ fromAccountNumber: walletAccount.accountNumber }, { toAccountNumber: walletAccount.accountNumber }];
      } else {
        // No wallet account found, return empty
        where.id = "0";
      }

      const [transactions, totalCount] = await Promise.all([
        prisma.fdhTransaction.findMany({
          where,
          include: {
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
          fromAccountNumber?: string | null;
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

        const fromAccountNumber = (input.fromAccountNumber || "").trim();
        if (!fromAccountNumber) {
          throw new Error("fromAccountNumber is required for account transfers");
        }

        const toAccountNumber = (input.toAccountNumber || "").trim();
        if (!toAccountNumber) {
          throw new Error("toAccountNumber is required for account transfers");
        }

        const currency = input.currency || "MWK";
        const description = input.description || "Transfer";

        // Look up the source account by account number
        const fromAccount = await prisma.mobileUserAccount.findFirst({
          where: {
            accountNumber: fromAccountNumber,
            mobileUserId: context.mobileUser.id, // Security: ensure account belongs to user
            context: input.context,
          },
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

        if (!fromAccount.isActive) {
          throw new GraphQLError("Source account is not active", {
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
            // Check if it's a transfer to OWN Wallet
            // This assumes toAccountNumber matches wallet identifier or we check input context
            // But input.context is Source Context.
            // If input.context is MOBILE_BANKING, and we want to transfer to WALLET.
            // Currently createTransfer assumes same context for source and dest if not specified?
            // The code above did: where: { context: input.context } for toAccount.
            // So createTransfer currently ONLY supports Same-Context transfers (Bank->Bank or Wallet->Wallet).

            // If we want Bank -> Wallet, we need to handle it.
            // The user request is "When a transaction from mobile_banking to fdh wallet".

            // Let's assume for SELF transfer, if destination account is not found in same context,
            // check if user has a wallet and dest number matches wallet number?
            // OR, we should rely on a specific TransferType or input flag.
            // But TransferType is enum { SELF, INTERNAL, EXTERNAL... }

            // If "toAccount" is not found in MOBILE_BANKING context, key "to_wallet" logic could be applied.
            // However, `toAccount` query filtered by `context: input.context`.

            // Let's add logic: If source is MOBILE_BANKING and SELF transfer, and we want to load Wallet.
            // We can check if `toAccountNumber` is the user's phone number (Wallet ID).

            const walletUser = await prisma.mobileUser.findFirst({
              where: {
                id: context.mobileUser.id,
                phoneNumber: toAccountNumber
              }
            });

            if (walletUser) {
              // Identified as Account -> Wallet Transfer
              const result = await walletTransactionService.processAccountToWalletTransfer(
                context.mobileUser.id,
                fromAccount.id,
                input.amount,
                currency,
                description
              );

              if (!result.success) {
                throw new Error(result.error);
              }

              return {
                success: true,
                transaction: result.transaction,
                message: "Wallet top-up successful",
                errors: []
              };
            }

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

        // currency and description are already defined above

        // All transfers: Execute synchronously ("T24 First")
        console.log(`[createTransfer] Executing ${input.type} transfer synchronously`);

        // Call T24 immediately (T24 generates the reference)
        const t24Response = await t24Service.transfer({
          fromAccount: fromAccount.accountNumber,
          toAccount: toAccountNumber,
          amount: amount.toString(),
          currency,
          reference: '', // T24 generates the reference
          description,
          transferType: input.type,
        });

        if (t24Response.success) {
          // Use T24 reference as the primary reference
          const reference = t24Response.t24Reference || `T24-${Date.now()}`;

          // Create COMPLETED transaction
          const transaction = await prisma.fdhTransaction.create({
            data: {
              type: TransactionType.TRANSFER,
              source:
                input.context === MobileUserContext.WALLET
                  ? TransactionSource.WALLET
                  : TransactionSource.MOBILE_BANKING,
              reference, // Use T24 reference
              status: TransactionStatus.COMPLETED,
              transferType: input.type,
              transferContext: input.context,
              amount,
              currency,
              description,
              fromAccountNumber: fromAccount.accountNumber,
              toAccountNumber,
              toBankCode: input.bankCode || null,
              toBankName: input.bankName || null,
              initiatedByUserId: context.mobileUser.id,
              t24Reference: t24Response.t24Reference,
              t24Response: t24Response as any,
              completedAt: new Date(),
              maxRetries: 0, // No retries for sync transfers
            },
            include: {
              initiatedBy: true,
              statusHistory: true,
            },
          });

          await prisma.fdhTransactionStatusHistory.create({
            data: {
              transactionId: transaction.id,
              fromStatus: TransactionStatus.PENDING,
              toStatus: TransactionStatus.COMPLETED,
              reason: "Transfer completed successfully (synchronous)",
            },
          });

          console.log(`[createTransfer] Transfer completed: ${reference}`);

          return {
            success: true,
            transaction,
            message: "Transfer completed successfully",
            errors: [],
          };
        } else {
          // Create FAILED transaction with formatted error
          const formattedError = formatT24Error(t24Response);
          const tempReference = `FAILED-${Date.now()}`;

          const transaction = await prisma.fdhTransaction.create({
            data: {
              type: TransactionType.TRANSFER,
              source:
                input.context === MobileUserContext.WALLET
                  ? TransactionSource.WALLET
                  : TransactionSource.MOBILE_BANKING,
              reference: tempReference, // Temporary reference for failed transfers
              status: TransactionStatus.FAILED_PERMANENT,
              transferType: input.type,
              transferContext: input.context,
              amount,
              currency,
              description,
              fromAccountNumber: fromAccount.accountNumber,
              toAccountNumber: toAccountNumber,
              errorMessage: formattedError,
              errorCode: t24Response.errorCode,
              t24Response: t24Response as any,
              maxRetries: 0, // No retries for sync transfers
              initiatedByUserId: context.mobileUser.id,
            },
            include: {
              initiatedBy: true,
              statusHistory: true,
            },
          });

          await prisma.fdhTransactionStatusHistory.create({
            data: {
              transactionId: transaction.id,
              fromStatus: TransactionStatus.PENDING,
              toStatus: TransactionStatus.FAILED_PERMANENT,
              reason: `Transfer failed: ${formattedError}`,
            },
          });

          console.log(`[createTransfer] Transfer failed: ${tempReference} - ${formattedError}`);

          return {
            success: false,
            transaction,
            message: formattedError,
            errors: [formattedError],
          };
        }

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

        // Use temporary reference, will be updated to T24 reference when processed
        const tempReference = `PENDING-${Date.now()}`;

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
            reference: tempReference, // Temporary, will be updated to T24 reference
            status: TransactionStatus.PENDING,
            transferType: input.transferType || null,
            transferContext: resolvedTransferContext,
            amount,
            currency: input.currency || "MWK",
            description: input.description,
            fromAccountNumber: resolvedFromAccountNumber,
            toAccountNumber: input.toAccountNumber,
            maxRetries: 0,
            initiatedByUserId: context.mobileUser?.id,
          },
          include: {
            initiatedBy: true,
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
      const reversalReference = `REVERSAL-${Date.now()}`;
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
          fromAccountNumber: originalTransaction.toAccountNumber,
          toAccountNumber: originalTransaction.fromAccountNumber,
          isReversal: true,
          originalTxnId: originalTransaction.id,
          reversalReason: reason,
          maxRetries: 0,
        },
        include: {
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
      if (!parent.fromAccountNumber) return null;
      return (
        parent.fromAccount ||
        (await prisma.mobileUserAccount.findFirst({
          where: { accountNumber: parent.fromAccountNumber },
        }))
      );
    },
    toAccount: async (parent: any) => {
      // Best effort resolution since toAccount is not a strict relation anymore
      if (!parent.toAccountNumber) return null;
      return await prisma.mobileUserAccount.findFirst({
        where: { accountNumber: parent.toAccountNumber }
      });
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
