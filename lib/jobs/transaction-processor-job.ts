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
  console.log("[TransactionProcessorJob] Job disabled (Global synchronous mode)");
  // Job disabled as all transactions are processed synchronously
}

export function stopTransactionProcessorJob() {
  // Cron jobs are automatically cleaned up when the process exits
  console.log("[TransactionProcessorJob] Transaction processor job stopped");
}
