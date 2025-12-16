import { PrismaClient, BillerTransaction, BillerTransactionStatus, BillerType } from "@prisma/client";
import { nanoid } from "nanoid";
import { BillerServiceFactory } from "./factory";

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

      // Process payment
      const result = await billerService.processPayment({
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

      if (result.success) {
        await this.completeTransaction(transaction.id, result);
      } else {
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
