import { PrismaClient, BillerTransaction, BillerTransactionStatus, BillerType } from "@prisma/client";
import { nanoid } from "nanoid";
import { BillerServiceFactory } from "./factory";
import { t24Service } from "../t24-service";
import { ConfigurationService } from "../configuration-service";

const prisma = new PrismaClient();

export interface CreateTransactionData {
  billerConfigId?: string;
  billerType: string;
  billerName: string;
  accountNumber: string;
  amount?: number | string;
  currency: string;
  transactionType: string;
  initiatedBy?: string;
  accountType?: string;
  customerAccountName?: string;
  creditAccount?: string;
  creditAccountType?: string;
  debitAccount?: string;
  debitAccountType?: string;
  bundleId?: string;
  invoiceNumber?: string;
  meterNumber?: string;
  metadata?: any;
}

/**
 * Service for managing biller transactions
 */
export class BillerTransactionService {
  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    const timestamp = Date.now().toString(36);
    const random = nanoid(8);
    return `BT-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Create new transaction record
   */
  async createTransaction(
    data: CreateTransactionData
  ): Promise<BillerTransaction> {
    return await prisma.billerTransaction.create({
      data: {
        ...data,
        amount: data.amount
          ? (typeof data.amount === "string" ? parseFloat(data.amount) : data.amount)
          : undefined,
        status: BillerTransactionStatus.PENDING,
        ourTransactionId: this.generateTransactionId(),
      } as any,
    });
  }

  /**
   * Update transaction
   */
  async updateTransaction(
    id: string,
    updates: Partial<BillerTransaction>
  ): Promise<BillerTransaction> {
    return await prisma.billerTransaction.update({
      where: { id },
      data: {
        ...(updates as any),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Mark transaction as completed
   */
  async completeTransaction(
    id: string,
    response: any,
    externalTransactionId?: string
  ): Promise<BillerTransaction> {
    return await this.updateTransaction(id, {
      status: BillerTransactionStatus.COMPLETED,
      completedAt: new Date(),
      responsePayload: response,
      externalTransactionId,
    });
  }

  /**
   * Mark transaction as failed
   */
  async failTransaction(
    id: string,
    error: Error | string,
    errorCode?: string
  ): Promise<BillerTransaction> {
    return await this.updateTransaction(id, {
      status: BillerTransactionStatus.FAILED,
      errorMessage: typeof error === "string" ? error : error.message,
      errorCode,
    });
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(id: string): Promise<BillerTransaction | null> {
    return await prisma.billerTransaction.findUnique({
      where: { id },
      include: {
        billerConfig: true,
      },
    });
  }

  /**
   * Get transaction by our transaction ID
   */
  async getTransactionByOurId(ourTransactionId: string): Promise<BillerTransaction | null> {
    return await prisma.billerTransaction.findUnique({
      where: { ourTransactionId },
      include: {
        billerConfig: true,
      },
    });
  }

  /**
   * Get transactions with filters
   */
  async getTransactions(filters: {
    billerType?: string;
    status?: BillerTransactionStatus;
    accountNumber?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    pageSize?: number;
  }) {
    const {
      billerType,
      status,
      accountNumber,
      dateFrom,
      dateTo,
      page = 1,
      pageSize = 20,
    } = filters;

    const where: any = {};

    if (billerType) where.billerType = billerType;
    if (status) where.status = status;
    if (accountNumber) where.accountNumber = { contains: accountNumber };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [transactions, total] = await Promise.all([
      prisma.billerTransaction.findMany({
        where,
        include: {
          billerConfig: {
            select: {
              billerName: true,
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.billerTransaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get transaction statistics
   */
  async getStats(dateFrom?: Date, dateTo?: Date) {
    const where: any = {};

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [total, completed, failed, totalAmount] = await Promise.all([
      prisma.billerTransaction.count({ where }),
      prisma.billerTransaction.count({
        where: { ...where, status: BillerTransactionStatus.COMPLETED },
      }),
      prisma.billerTransaction.count({
        where: { ...where, status: BillerTransactionStatus.FAILED },
      }),
      prisma.billerTransaction.aggregate({
        where: { ...where, status: BillerTransactionStatus.COMPLETED },
        _sum: { amount: true },
      }),
    ]);

    const successRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      completed,
      failed,
      pending: total - completed - failed,
      successRate: Math.round(successRate * 100) / 100,
      totalAmount: totalAmount._sum.amount || 0,
    };
  }

  /**
   * Process account lookup
   */
  async processAccountLookup(
    billerType: BillerType,
    accountNumber: string,
    accountType?: string
  ) {
    // Get biller config
    const config = await prisma.billerConfig.findUnique({
      where: { billerType, isActive: true },
    });

    if (!config) {
      throw new Error("Biller configuration not found or inactive");
    }

    // Create transaction record
    const transaction = await this.createTransaction({
      billerConfigId: config.id,
      billerType,
      billerName: config.billerName,
      accountNumber,
      accountType,
      currency: config.defaultCurrency,
      transactionType: "ACCOUNT_DETAILS",
    });

    try {
      // Get biller service
      const billerService = BillerServiceFactory.create(config);

      // Update to processing
      await this.updateTransaction(transaction.id, {
        status: BillerTransactionStatus.PROCESSING,
      });

      // Perform lookup
      const accountDetails = await billerService.lookupAccount(
        accountNumber,
        accountType
      );

      // Complete transaction
      await this.completeTransaction(transaction.id, accountDetails);

      return {
        success: true,
        transaction: await this.getTransaction(transaction.id),
        accountDetails,
      };
    } catch (error: any) {
      // Fail transaction
      await this.failTransaction(transaction.id, error.message);

      return {
        success: false,
        transaction: await this.getTransaction(transaction.id),
        error: error.message,
      };
    }
  }

  /**
   * Process payment
   */
  async processPayment(
    billerType: BillerType,
    paymentData: {
      accountNumber: string;
      amount: number | string;
      currency?: string;
      accountType?: string;
      creditAccount?: string;
      creditAccountType?: string;
      debitAccount?: string;
      debitAccountType?: string;
      customerAccountNumber?: string;
      customerAccountName?: string;
      metadata?: any;
    }
  ) {
    // Get biller config
    const config = await prisma.billerConfig.findUnique({
      where: { billerType, isActive: true },
    });

    if (!config) {
      throw new Error("Biller configuration not found or inactive");
    }

    const amount = typeof paymentData.amount === "string"
      ? parseFloat(paymentData.amount)
      : paymentData.amount;

    // Create transaction record
    const transaction = await this.createTransaction({
      billerConfigId: config.id,
      billerType,
      billerName: config.billerName,
      accountNumber: paymentData.accountNumber,
      amount,
      currency: paymentData.currency || config.defaultCurrency,
      accountType: paymentData.accountType,
      creditAccount: paymentData.creditAccount,
      creditAccountType: paymentData.creditAccountType,
      debitAccount: paymentData.debitAccount,
      debitAccountType: paymentData.debitAccountType,
      customerAccountName: paymentData.customerAccountName,
      transactionType: "POST_TRANSACTION",
      metadata: paymentData.metadata,
    });

    try {
      // Get biller service
      const billerService = BillerServiceFactory.create(config);

      // Update to processing
      await this.updateTransaction(transaction.id, {
        status: BillerTransactionStatus.PROCESSING,
      });

      // 1. FUND RESERVATION: Move funds to Outbound Suspense Account
      // Only applicable if we have a debit account (source of funds)
      const debitAccount = paymentData.debitAccount || paymentData.accountNumber; // Fallback might need review dependent on context
      const outboundSuspense = await ConfigurationService.getOutboundSuspenseAccount();
      let reservationReference = null;

      if (debitAccount) {
        console.log(`[BillerTransaction] Reserving funds: ${debitAccount} -> Suspense ${outboundSuspense}`);
        const reservationResult = await t24Service.transfer({
          fromAccount: debitAccount,
          toAccount: outboundSuspense,
          amount: amount.toString(),
          currency: paymentData.currency || config.defaultCurrency,
          reference: `RES-${transaction.ourTransactionId}`,
          description: `Biller Reservation: ${config.billerName}`,
          transferType: "BILLER_RESERVATION" as any
        });

        if (!reservationResult.success) {
          throw new Error(`Fund reservation failed: ${reservationResult.message}`);
        }
        reservationReference = reservationResult.t24Reference;
      }

      // 2. PROCESS PAYMENT: Call Biller API
      let result;
      try {
        // Process payment
        result = await billerService.processPayment({
          accountNumber: paymentData.accountNumber,
          amount,
          currency: paymentData.currency || config.defaultCurrency,
          accountType: paymentData.accountType,
          metadata: {
            ourTransactionId: transaction.ourTransactionId,
            creditAccount: paymentData.creditAccount,
            creditAccountType: paymentData.creditAccountType,
            debitAccount: paymentData.debitAccount,
            debitAccountType: paymentData.debitAccountType,
            customerAccountNumber: paymentData.customerAccountNumber,
            customerAccountName: paymentData.customerAccountName,
            ...paymentData.metadata,
          },
        });
      } catch (billerError: any) {
        // 3. REVERSAL: If Biller API fails, reverse funds from Suspense
        if (debitAccount) {
          console.warn(`[BillerTransaction] Biller failed, reversing funds: Suspense ${outboundSuspense} -> ${debitAccount}`);
          try {
            await t24Service.transfer({
              fromAccount: outboundSuspense,
              toAccount: debitAccount,
              amount: amount.toString(),
              currency: paymentData.currency || config.defaultCurrency,
              reference: `REV-${transaction.ourTransactionId}`,
              description: `Reversal: ${config.billerName} Failed`,
              transferType: "BILLER_REVERSAL" as any
            });
          } catch (reversalError) {
            console.error(`[BillerTransaction] CRITICAL: Fund reversal failed!`, reversalError);
            // In a real system, we might flag this transaction for manual intervention
          }
        }
        throw billerError; // Re-throw to handle outer failure logic
      }

      if (!result.success && !result.error && result.message) {
        (result as any).error = result.message;
      }

      if (result.success) {
        await this.completeTransaction(transaction.id, result, (result as any).transactionReference);
      } else {
        // Should functionally fall into catch block if throw was used, but if result.success is false:
        // We might need reversal here too if the service didn't throw but returned success: false
        if (debitAccount) {
          console.warn(`[BillerTransaction] Biller result failed, reversing funds`);
          try {
            await t24Service.transfer({
              fromAccount: outboundSuspense,
              toAccount: debitAccount,
              amount: amount.toString(),
              currency: paymentData.currency || config.defaultCurrency,
              reference: `REV-${transaction.ourTransactionId}`,
              description: `Reversal: ${config.billerName} Failed`,
              transferType: "BILLER_REVERSAL" as any
            });
          } catch (reversalError) {
            console.error(`[BillerTransaction] CRITICAL: Fund reversal failed!`, reversalError);
          }
        }
        await this.failTransaction(transaction.id, result.error || "Payment failed");
      }

      return {
        success: result.success,
        transaction: await this.getTransaction(transaction.id),
        result,
      };
    } catch (error: any) {
      // Fail transaction
      await this.failTransaction(transaction.id, error.message);

      return {
        success: false,
        transaction: await this.getTransaction(transaction.id),
        error: error.message,
      };
    }
  }

  /**
   * Retry failed transaction
   */
  async retryTransaction(transactionId: string) {
    const transaction = await this.getTransaction(transactionId);

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    if (transaction.status !== BillerTransactionStatus.FAILED) {
      throw new Error("Only failed transactions can be retried");
    }

    // Reset transaction status
    await this.updateTransaction(transactionId, {
      status: BillerTransactionStatus.PENDING,
      errorMessage: null,
      errorCode: null,
    });

    // Re-process based on transaction type
    const config = await prisma.billerConfig.findUnique({
      where: { billerType: transaction.billerType as BillerType },
    });

    if (!config) {
      throw new Error("Biller configuration not found");
    }

    try {
      const billerService = BillerServiceFactory.create(config);

      await this.updateTransaction(transactionId, {
        status: BillerTransactionStatus.PROCESSING,
      });

      let result;

      switch (transaction.transactionType) {
        case "ACCOUNT_DETAILS":
          result = await billerService.lookupAccount(
            transaction.accountNumber,
            transaction.accountType || undefined
          );
          await this.completeTransaction(transactionId, result);
          break;

        case "POST_TRANSACTION":
          result = await billerService.processPayment({
            accountNumber: transaction.accountNumber,
            amount: transaction.amount!.toNumber(),
            currency: transaction.currency,
            accountType: transaction.accountType || undefined,
            metadata: transaction.metadata as any,
          });

          if (result.success) {
            await this.completeTransaction(transactionId, result);
          } else {
            await this.failTransaction(transactionId, result.error || "Payment failed");
          }
          break;

        default:
          throw new Error("Unsupported transaction type for retry");
      }

      return {
        success: true,
        transaction: await this.getTransaction(transactionId),
      };
    } catch (error: any) {
      await this.failTransaction(transactionId, error.message);

      return {
        success: false,
        transaction: await this.getTransaction(transactionId),
        error: error.message,
      };
    }
  }
}

export const billerTransactionService = new BillerTransactionService();
