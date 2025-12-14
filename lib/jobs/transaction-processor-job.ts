/**
 * Transaction Processor Cron Job
 * 
 * Runs every 10 seconds to process pending and retryable transactions
 */

import cron from "node-cron";
import { prisma } from "@/lib/db/prisma";
import { TransactionStatus } from "@prisma/client";
import { processTransaction } from "@/lib/services/transaction-processor";

let isProcessing = false;

export function startTransactionProcessorJob() {
  console.log("[TransactionProcessorJob] Starting transaction processor job...");

  // Run every 10 seconds
  cron.schedule("*/10 * * * * *", async () => {
    // Prevent overlapping runs
    if (isProcessing) {
      console.log("[TransactionProcessorJob] Previous run still processing, skipping...");
      return;
    }

    isProcessing = true;

    try {
      const now = new Date();

      // Get pending transactions
      const pendingTransactions = await prisma.fdhTransaction.findMany({
        where: { status: TransactionStatus.PENDING },
        orderBy: { createdAt: "asc" },
        take: 10, // Process max 10 at a time
      });

      // Get retryable failed transactions
      const retryableTransactions = await prisma.fdhTransaction.findMany({
        where: {
          status: TransactionStatus.FAILED,
          retryCount: { lt: 3 },
          nextRetryAt: { lte: now },
        },
        orderBy: { nextRetryAt: "asc" },
        take: 10, // Process max 10 at a time
      });

      const allTransactions = [...pendingTransactions, ...retryableTransactions];

      if (allTransactions.length === 0) {
        return; // Nothing to process
      }

      console.log(
        `[TransactionProcessorJob] Processing ${allTransactions.length} transactions (${pendingTransactions.length} pending, ${retryableTransactions.length} retryable)`
      );

      // Process transactions in parallel (with Promise.allSettled to handle failures gracefully)
      const results = await Promise.allSettled(
        allTransactions.map((txn) => processTransaction(txn.id))
      );

      // Log results
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      console.log(
        `[TransactionProcessorJob] Completed: ${succeeded} succeeded, ${failed} failed`
      );

      // Log any failures
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(
            `[TransactionProcessorJob] Transaction ${allTransactions[index].id} processing error:`,
            result.reason
          );
        }
      });
    } catch (error) {
      console.error("[TransactionProcessorJob] Job error:", error);
    } finally {
      isProcessing = false;
    }
  });

  console.log("[TransactionProcessorJob] Transaction processor job started (runs every 10s)");
}

export function stopTransactionProcessorJob() {
  // Cron jobs are automatically cleaned up when the process exits
  console.log("[TransactionProcessorJob] Transaction processor job stopped");
}
