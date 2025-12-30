/**
 * Transaction Processor Service
 * 
 * Processes pending transactions by sending them to T24
 * and updating their status based on the response.
 */

import { prisma } from "@/lib/db/prisma";
import { TransactionStatus, TransactionType, TransferType } from "@prisma/client";
import { t24Service } from "./t24-service";
import { ConfigurationService } from "./configuration-service";

export async function processTransaction(transactionId: string): Promise<void> {
  const transaction = await prisma.fdhTransaction.findUnique({
    where: { id: transactionId },
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

    if (transaction.type === TransactionType.TRANSFER && transaction.transferType) {
      if (
        transaction.transferType === TransferType.FDH_WALLET ||
        transaction.transferType === TransferType.EXTERNAL_WALLET
      ) {
        t24Response = await processWalletTransfer(transaction);
      } else {
        t24Response = await processBankTransfer(transaction);
      }
    } else if (isAccountTransaction(transaction)) {
      // Fallback for non-transfer transaction types
      t24Response = await processBankTransfer(transaction);
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
async function processBankTransfer(transaction: any): Promise<any> {
  console.log(`[TransactionProcessor] Processing bank transfer ${transaction.id}`);

  const fromAccount = transaction.fromAccountNumber || transaction.fromAccount?.accountNumber;
  const toAccount = transaction.toAccountNumber || transaction.toAccount?.accountNumber;

  if (!fromAccount || !toAccount) {
    throw new Error("Missing account information");
  }

  // Create a modifiable toAccount
  let destinationAccount = toAccount;

  // Intercept EXTERNAL_BANK transfers and route to Outbound Suspense Account through T24
  if (transaction.transferType === TransferType.EXTERNAL_BANK) {
    console.log(`[TransactionProcessor] Routing EXTERNAL_BANK transfer to Outbound Suspense Account`);
    destinationAccount = await ConfigurationService.getOutboundSuspenseAccount();
  }

  // Call T24 API
  const t24Response = await t24Service.transfer({
    fromAccount,
    toAccount: destinationAccount,
    amount: transaction.amount.toString(),
    currency: transaction.currency,
    reference: transaction.reference,
    description: transaction.description,
    transferType: transaction.transferType,
  });

  return t24Response;
}

/**
 * Process wallet transfer (local ledger / wallet service)
 */
async function processWalletTransfer(transaction: any): Promise<any> {
  console.log(`[TransactionProcessor] Processing wallet transfer ${transaction.id}`);

  // Route FDH_WALLET and EXTERNAL_WALLET to Outbound Suspense Account
  if (
    transaction.transferType === TransferType.FDH_WALLET ||
    transaction.transferType === TransferType.EXTERNAL_WALLET
  ) {
    console.log(`[TransactionProcessor] Routing WALLET transfer (${transaction.transferType}) to Outbound Suspense Account`);

    const fromAccount = transaction.fromAccountNumber || transaction.fromAccount?.accountNumber;
    const outboundSuspense = await ConfigurationService.getOutboundSuspenseAccount();

    if (!fromAccount) {
      throw new Error("Missing source account information for wallet transfer");
    }

    // Perform T24 transfer to Suspense Account
    // Note: The actual wallet credit logic (e.g. calling a Wallet API) happens separately 
    // or is assumed to be triggered by the suspense movement + external system.
    // For this system's scope, we move money to suspense.
    const t24Response = await t24Service.transfer({
      fromAccount,
      toAccount: outboundSuspense,
      amount: transaction.amount.toString(),
      currency: transaction.currency,
      reference: transaction.reference,
      description: transaction.description || `Wallet Funding: ${transaction.transferType}`,
      transferType: transaction.transferType,
    });

    return t24Response;
  }

  // Fallback / standard wallet logic if any (currently simulated)
  return {
    success: true,
    t24Reference: `WALLET-${Date.now()}`,
    message: "Wallet transaction processed (simulated)",
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
    true
  );
}
