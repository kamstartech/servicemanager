import { PrismaClient, BillerTransaction, BillerTransactionStatus } from "@prisma/client";
import { nanoid } from "nanoid";

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
  ourTransactionId?: string;
  externalTransactionId?: string;
  status?: string;
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
        billerType: data.billerType as any,
        billerName: data.billerName,
        accountNumber: data.accountNumber,
        transactionType: data.transactionType as any,
        currency: data.currency,
        amount: data.amount
          ? (typeof data.amount === "string" ? parseFloat(data.amount) : data.amount)
          : undefined,
        status: BillerTransactionStatus.PENDING,
        ourTransactionId: data.ourTransactionId || this.generateTransactionId(),
        accountType: data.accountType,
        customerAccountName: data.customerAccountName,
        creditAccount: data.creditAccount,
        creditAccountType: data.creditAccountType,
        debitAccount: data.debitAccount,
        debitAccountType: data.debitAccountType,
        bundleId: data.bundleId,
        invoiceNumber: data.invoiceNumber,
        meterNumber: data.meterNumber,
        metadata: data.metadata,
        initiatedBy: data.initiatedBy
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
    });
  }

  /**
   * Get transaction by our transaction ID
   */
  async getTransactionByOurId(ourTransactionId: string): Promise<BillerTransaction | null> {
    return await prisma.billerTransaction.findUnique({
      where: { ourTransactionId },
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

}

export const billerTransactionService = new BillerTransactionService();
