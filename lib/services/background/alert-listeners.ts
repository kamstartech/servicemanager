import { accountEvents, AccountEvent } from "@/lib/events/account-events";
import { AccountAlertService } from "@/lib/services/account-alert";
import { prisma } from "@/lib/db/prisma";

/**
 * Alert Listener Service
 * 
 * Listens for system events and triggers account alerts based on user settings.
 * Bridges the gap between the Event Bus and the Account Alert Service.
 */
export class AlertListenerService {
    private isListening = false;

    /**
     * Start listening for events
     */
    start(): void {
        if (this.isListening) {
            console.log("⚠️ Alert listener service already running");
            return;
        }

        console.log("🚀 Starting alert listener service...");
        this.registerListeners();
        this.isListening = true;
        console.log("✅ Alert listener service started");
    }

    /**
     * Register event listeners
     */
    private registerListeners(): void {
        // Listen for User Login events
        accountEvents.on(AccountEvent.USER_LOGIN, async (payload) => {
            const { userId, metadata } = payload;

            if (!userId) return;

            console.log(`🔔 Event received: USER_LOGIN for user ${userId}`);

            try {
                // Trigger login alert
                // Metadata should contain device info if available from the auth resolver
                // We'll need to ensure the auth resolver passes this info
                const deviceName = metadata?.deviceName || "Unknown Device";
                const deviceId = metadata?.deviceId || "unknown";
                const location = metadata?.location;
                const ipAddress = metadata?.ipAddress;

                await AccountAlertService.triggerLoginAlert(
                    userId,
                    deviceName,
                    deviceId,
                    location,
                    ipAddress
                );
            } catch (error) {
                console.error(`❌ Error processing USER_LOGIN alert for user ${userId}:`, error);
            }
        });

        // Listen for Transaction Completed events (Large Transaction & Low Balance)
        accountEvents.on(AccountEvent.TRANSACTION_COMPLETED, async (payload) => {
            const { userId, accountNumber, metadata } = payload;

            if (!userId || !accountNumber || !metadata) return;

            try {
                // 1. Large Transaction Alert
                if (metadata.amount) {
                    await AccountAlertService.triggerLargeTransactionAlert(
                        userId,
                        accountNumber,
                        payload.transactionId || "unknown",
                        metadata.amount.toString(),
                        metadata.currency || "MWK",
                        metadata.type === "CREDIT" ? "CREDIT" : "DEBIT",
                        metadata.description
                    );
                }

                // 2. Low Balance Alert
                if (metadata.newBalance && metadata.newBalanceCurrency) {
                    const settings = await prisma.accountAlertSettings.findFirst({
                        where: { mobileUserId: userId, accountNumber }
                    });

                    if (settings && settings.lowBalanceEnabled && settings.lowBalanceThreshold) {
                        const balance = parseFloat(metadata.newBalance);
                        const threshold = settings.lowBalanceThreshold.toNumber();

                        if (balance < threshold) {
                            await AccountAlertService.triggerLowBalanceAlert(
                                userId,
                                accountNumber,
                                metadata.newBalance.toString(),
                                metadata.newBalanceCurrency,
                                settings.lowBalanceThreshold.toString()
                            );
                        }
                    }
                }
            } catch (error) {
                console.error(`❌ Error processing TRANSACTION_COMPLETED alert for user ${userId}:`, error);
            }
        });

        // Listen for Transaction Failed events (Suspicious Activity)
        accountEvents.on(AccountEvent.TRANSACTION_FAILED, async (payload) => {
            const { userId, accountNumber, metadata } = payload;
            if (!userId || !accountNumber || !metadata) return;

            try {
                const suspiciousErrors = ["INVALID_PIN", "SUSPECTED_FRAUD", "LOCATION_MISMATCH"];

                if (metadata.errorCode && suspiciousErrors.includes(metadata.errorCode)) {
                    await AccountAlertService.triggerSuspiciousActivityAlert(
                        userId,
                        accountNumber,
                        "Failed Transaction: " + (metadata.failureReason || "Unknown"),
                        {
                            transactionId: payload.transactionId,
                            errorCode: metadata.errorCode,
                            location: metadata.location,
                            ipAddress: metadata.ipAddress,
                            deviceId: metadata.deviceId
                        },
                        75 // High risk score
                    );
                }
            } catch (error) {
                console.error(`❌ Error processing TRANSACTION_FAILED alert for user ${userId}:`, error);
            }
        });
    }

    /**
     * Stop listening
     */
    stop(): void {
        // In a real event emitter, we might need to remove listeners, 
        // but the singleton pattern here implies app lifecycle binding.
        this.isListening = false;
        console.log("✅ Alert listener service stopped");
    }
}

export const alertListenerService = new AlertListenerService();
