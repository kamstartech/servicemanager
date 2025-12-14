/**
 * Transaction Processor Service
 * 
 * Processes pending transactions by sending them to T24
 * and updating their status based on the response.
 */

import { prisma } from "@/lib/db/prisma";
import { TransactionStatus, TransactionType } from "@prisma/client";
import { t24Service } from "./t24-service";

export async function processTransaction(transactionId: string): Promise<void> {
  const transaction = await prisma.fdhTransaction.findUnique({
    where: { id: transactionId },
    include: {
      fromAccount: true,
      toAccount: true,
      fromWallet: true,
      toWallet: true,
    },
  });

  if (!transaction) {
    console.error(`[TransactionProcessor] Transaction ${transactionId} not found`);
    return;
  }

  if (transaction.status !== TransactionStatus.PENDING) {
    console.log(
      `[TransactionProcessor] Transaction ${transactionId} is not pending (status: ${transaction.status})`
    );
    return;
  }

  console.log(`[TransactionProcessor] Processing transaction ${transactionId}`);

  try {
    // Update status to PROCESSING
    await updateTransactionStatus(
      transactionId,
      TransactionStatus.PENDING,
      TransactionStatus.PROCESSING
    );

    // Determine transaction type and process accordingly
    let t24Response;

    if (isAccountTransaction(transaction)) {
      // Account-based transaction (send to T24)
      t24Response = await processAccountTransaction(transaction);
    } else if (isWalletTransaction(transaction)) {
      // Wallet transaction (handle locally or via wallet service)
      t24Response = await processWalletTransaction(transaction);
    } else if (isCrossPlatformTransaction(transaction)) {
      // Cross-platform (account ↔ wallet)
      t24Response = await processCrossPlatformTransaction(transaction);
    } else {
      throw new Error("Invalid transaction configuration");
    }

    // Check T24 response
    if (t24Response.success) {
      // Success: update to COMPLETED
      await prisma.fdhTransaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.COMPLETED,
          t24Reference: t24Response.t24Reference,
          t24Response: t24Response as any,
          completedAt: new Date(),
        },
      });

      await createStatusHistory(
        transactionId,
        TransactionStatus.PROCESSING,
        TransactionStatus.COMPLETED,
        "Transaction completed successfully"
      );

      console.log(`[TransactionProcessor] Transaction ${transactionId} completed`);
    } else {
      // Failed: handle retry logic
      await handleTransactionFailure(transactionId, transaction, t24Response.message, t24Response.errorCode);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[TransactionProcessor] Error processing transaction ${transactionId}:`, error);

    await handleTransactionFailure(transactionId, transaction, errorMessage);
  }
}

/**
 * Process account-to-account transaction (via T24)
 */
async function processAccountTransaction(transaction: any): Promise<any> {
  console.log(`[TransactionProcessor] Processing account transaction ${transaction.id}`);

  const fromAccount = transaction.fromAccountNumber || transaction.fromAccount?.accountNumber;
  const toAccount = transaction.toAccountNumber || transaction.toAccount?.accountNumber;

  if (!fromAccount || !toAccount) {
    throw new Error("Missing account information");
  }

  // Call T24 API
  const t24Response = await t24Service.transfer({
    fromAccount,
    toAccount,
    amount: transaction.amount.toString(),
    currency: transaction.currency,
    reference: transaction.reference,
    description: transaction.description,
  });

  return t24Response;
}

/**
 * Process wallet-to-wallet transaction (local or wallet service)
 */
async function processWalletTransaction(transaction: any): Promise<any> {
  console.log(`[TransactionProcessor] Processing wallet transaction ${transaction.id}`);

  // TODO: Implement wallet-specific logic
  // This could update local wallet balances or call a wallet service

  // For now, simulate success
  return {
    success: true,
    t24Reference: `WALLET-${Date.now()}`,
    message: "Wallet transaction processed",
  };
}

/**
 * Process cross-platform transaction (account ↔ wallet)
 */
async function processCrossPlatformTransaction(transaction: any): Promise<any> {
  console.log(`[TransactionProcessor] Processing cross-platform transaction ${transaction.id}`);

  // TODO: Implement cross-platform logic
  // This might involve both T24 API and local wallet updates

  // For now, simulate success
  return {
    success: true,
    t24Reference: `CROSS-${Date.now()}`,
    message: "Cross-platform transaction processed",
  };
}

/**
 * Handle transaction failure with retry logic
 */
async function handleTransactionFailure(
  transactionId: string,
  transaction: any,
  errorMessage: string,
  errorCode?: string
): Promise<void> {
  const retryCount = transaction.retryCount + 1;
  const shouldRetry = retryCount < transaction.maxRetries;

  const status = shouldRetry ? TransactionStatus.FAILED : TransactionStatus.FAILED_PERMANENT;

  // Calculate next retry time (exponential backoff: 2^retryCount * 2 minutes)
  const nextRetryAt = shouldRetry
    ? new Date(Date.now() + Math.pow(2, retryCount) * 2 * 60 * 1000)
    : null;

  await prisma.fdhTransaction.update({
    where: { id: transactionId },
    data: {
      status,
      retryCount,
      lastRetryAt: new Date(),
      nextRetryAt,
      errorMessage,
      errorCode,
    },
  });

  await createStatusHistory(
    transactionId,
    TransactionStatus.PROCESSING,
    status,
    errorMessage,
    retryCount
  );

  if (shouldRetry) {
    console.log(
      `[TransactionProcessor] Transaction ${transactionId} failed, will retry at ${nextRetryAt} (attempt ${retryCount}/${transaction.maxRetries})`
    );
  } else {
    console.log(
      `[TransactionProcessor] Transaction ${transactionId} permanently failed after ${retryCount} attempts`
    );
  }
}

/**
 * Update transaction status
 */
async function updateTransactionStatus(
  transactionId: string,
  fromStatus: TransactionStatus,
  toStatus: TransactionStatus
): Promise<void> {
  await prisma.fdhTransaction.update({
    where: { id: transactionId },
    data: { status: toStatus },
  });
}

/**
 * Create status history entry
 */
async function createStatusHistory(
  transactionId: string,
  fromStatus: TransactionStatus,
  toStatus: TransactionStatus,
  reason?: string,
  retryNumber?: number
): Promise<void> {
  await prisma.fdhTransactionStatusHistory.create({
    data: {
      transactionId,
      fromStatus,
      toStatus,
      reason,
      retryNumber,
    },
  });
}

/**
 * Check if transaction involves only accounts
 */
function isAccountTransaction(transaction: any): boolean {
  return (
    (transaction.fromAccountId || transaction.fromAccountNumber) &&
    (transaction.toAccountId || transaction.toAccountNumber) &&
    !transaction.fromWalletId &&
    !transaction.toWalletId
  );
}

/**
 * Check if transaction involves only wallets
 */
function isWalletTransaction(transaction: any): boolean {
  return (
    (transaction.fromWalletId || transaction.fromWalletNumber) &&
    (transaction.toWalletId || transaction.toWalletNumber) &&
    !transaction.fromAccountId &&
    !transaction.toAccountId
  );
}

/**
 * Check if transaction is cross-platform (account ↔ wallet)
 */
function isCrossPlatformTransaction(transaction: any): boolean {
  const hasAccount =
    transaction.fromAccountId || transaction.toAccountId ||
    transaction.fromAccountNumber || transaction.toAccountNumber;
  const hasWallet =
    transaction.fromWalletId || transaction.toWalletId ||
    transaction.fromWalletNumber || transaction.toWalletNumber;

  return hasAccount && hasWallet;
}
