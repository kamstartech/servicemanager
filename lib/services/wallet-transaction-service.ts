import { PrismaClient, TransactionStatus, TransactionType, TransactionSource, MobileUserContext, TransferType } from "@prisma/client";
import { t24Service } from "./t24-service";
import { ConfigurationService } from "./configuration-service";
import { generateTransactionReference } from "@/lib/utils/reference-generator";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

export class WalletTransactionService {
    /**
     * Process a transfer from Mobile Banking Account to Wallet
     * Implements the 3-step settlement flow:
     * 1. Debit User Account -> Credit Outbound Suspense (T24)
     * 2. Debit Outbound Suspense -> Credit Inbound Suspense (T24)
     * 3. Credit Wallet Ledger (Internal DB)
     */
    async processAccountToWalletTransfer(
        mobileUserId: number,
        fromAccountId: number,
        amount: number | string,
        currency: string = "MWK",
        description: string = "Wallet Top-up"
    ) {
        const amountDecimal = new Decimal(amount);

        // 1. Get Accounts & Configuration
        const fromAccount = await prisma.mobileUserAccount.findUnique({
            where: { id: fromAccountId },
        });

        if (!fromAccount || fromAccount.mobileUserId !== mobileUserId) {
            throw new Error("Invalid source account");
        }

        const walletUser = await prisma.mobileUser.findUnique({
            where: { id: mobileUserId },
            include: {
                accounts: {
                    where: { context: MobileUserContext.WALLET }
                }
            }
        });

        if (!walletUser) {
            throw new Error("User not found");
        }

        // Get or create wallet account
        let walletAccount = walletUser.accounts[0];
        if (!walletAccount) {
            // Find existing or create (logic might be needed here, assuming exists for now or handled by registration)
            // Checks if we should create one?
            // For now, fail if no wallet account
            // Actually, let's create one if missing to be robust, similar to registration logic
            walletAccount = await prisma.mobileUserAccount.create({
                data: {
                    mobileUserId,
                    context: MobileUserContext.WALLET,
                    accountNumber: walletUser.phoneNumber || "WALLET-" + mobileUserId,
                    accountName: "Wallet Account",
                    currency,
                    balance: 0,
                    availableBalance: 0,
                    isActive: true
                }
            });
        }

        const outboundSuspense = await ConfigurationService.getOutboundSuspenseAccount();
        const inboundSuspense = await ConfigurationService.getInboundSuspenseAccount();

        // 2. Create Transaction Record (PENDING)
        const reference = generateTransactionReference();
        const transaction = await prisma.fdhTransaction.create({
            data: {
                type: TransactionType.ACCOUNT_TO_WALLET,
                source: TransactionSource.MOBILE_BANKING,
                reference,
                status: TransactionStatus.PROCESSING,
                amount: amountDecimal,
                currency,
                description,
                fromAccountNumber: fromAccount.accountNumber,
                toAccountNumber: walletUser.phoneNumber,
                initiatedByUserId: mobileUserId,
                transferType: TransferType.SELF, // Usually self top-up
                transferContext: MobileUserContext.WALLET
            }
        });

        try {
            // 3. Step 1: Fund Reservation (User -> Outbound)
            console.log(`[WalletTx] Step 1: Reserve Funds ${fromAccount.accountNumber} -> ${outboundSuspense}`);
            const reservationResult = await t24Service.transfer({
                fromAccount: fromAccount.accountNumber,
                toAccount: outboundSuspense,
                amount: amount.toString(),
                currency,
                reference: `RES-${reference}`,
                description: `Wallet Res: ${reference}`,
                transferType: TransferType.SELF // Internal reservation
            });

            if (!reservationResult.success) {
                throw new Error(`Fund reservation failed: ${reservationResult.message}`);
            }

            // Update T24 ref
            await prisma.fdhTransaction.update({
                where: { id: transaction.id },
                data: { t24Reference: reservationResult.t24Reference }
            });

            // 4. Step 2: Settlement (Outbound -> Inbound)
            console.log(`[WalletTx] Step 2: Settle Funds ${outboundSuspense} -> ${inboundSuspense}`);
            const settlementResult = await t24Service.transfer({
                fromAccount: outboundSuspense,
                toAccount: inboundSuspense,
                amount: amount.toString(),
                currency,
                reference: `SET-${reference}`,
                description: `Wallet Set: ${reference}`,
                transferType: TransferType.SELF
            });

            if (!settlementResult.success) {
                // CRITICAL: Reservation succeeded but Settlement failed.
                // Option A: Reverse Reservation
                // Option B: Flag for manual reconciliation (safer to avoid double reversal issues?)
                // Let's try to reverse reservation
                console.warn(`[WalletTx] Settlement failed, reversing reservation...`);
                await t24Service.transfer({
                    fromAccount: outboundSuspense,
                    toAccount: fromAccount.accountNumber,
                    amount: amount.toString(),
                    currency,
                    reference: `REV-${reference}`,
                    description: `Rev: Settlement Failed`,
                    transferType: TransferType.SELF
                });
                throw new Error(`Settlement transfer failed: ${settlementResult.message}`);
            }

            // 5. Step 3: Credit Wallet (DB Update)
            console.log(`[WalletTx] Step 3: Credit Wallet DB ${walletAccount.accountNumber}`);

            // Update Balance
            await prisma.mobileUserAccount.update({
                where: { id: walletAccount.id },
                data: {
                    balance: { increment: amountDecimal },
                    availableBalance: { increment: amountDecimal }
                }
            });

            // Complete Transaction
            const completedTransaction = await prisma.fdhTransaction.update({
                where: { id: transaction.id },
                data: {
                    status: TransactionStatus.COMPLETED,
                    completedAt: new Date(),
                    toAccountNumber: walletAccount.accountNumber
                }
            });

            await prisma.fdhTransactionStatusHistory.create({
                data: {
                    transactionId: transaction.id,
                    fromStatus: TransactionStatus.PROCESSING,
                    toStatus: TransactionStatus.COMPLETED,
                    reason: "Workflow completed successfully"
                }
            });

            return { success: true, transaction: completedTransaction };

        } catch (error: any) {
            console.error("[WalletTx] Transaction failed", error);

            await prisma.fdhTransaction.update({
                where: { id: transaction.id },
                data: {
                    status: TransactionStatus.FAILED,
                    errorMessage: error.message,
                    errorCode: "WALLET_PROCESS_ERROR"
                }
            });

            await prisma.fdhTransactionStatusHistory.create({
                data: {
                    transactionId: transaction.id,
                    fromStatus: TransactionStatus.PROCESSING,
                    toStatus: TransactionStatus.FAILED,
                    reason: error.message
                }
            });

            return { success: false, error: error.message };
        }
    }
}

export const walletTransactionService = new WalletTransactionService();
