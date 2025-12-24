
import { ConfigurationService } from "./configuration-service";
import { t24Service } from "./t24-service";

export class FundReservationService {
    /**
     * Holds funds by transferring them to the suspense account.
     */
    static async holdFunds(
        amount: number,
        sourceAccount: string,
        _reference: string,
        _description: string
    ): Promise<{ success: boolean; transactionReference?: string; error?: string }> {
        try {
            const suspenseAccount = await ConfigurationService.getSuspenseAccount();

            // Logic to call core banking or transfer service
            // For now, we stub this or use an existing service if valid
            console.log(`[FundReservation] Transferring ${amount} from ${sourceAccount} to Suspense ${suspenseAccount}`);

            const result = await t24Service.transfer({
                fromAccount: sourceAccount,
                toAccount: suspenseAccount,
                amount: amount.toString(),
                currency: "MWK", // Defaulting to MWK for now
                reference: _reference || `HOLD_${Date.now()}`,
                description: _description || "Fund Reservation Hold",
            });

            if (!result.success) {
                throw new Error(result.message || "Transfer failed");
            }

            return {
                success: true,
                transactionReference: result.t24Reference || result.externalReference || `HOLD_${Date.now()}`
            };
        } catch (error: unknown) {
            console.error("Failed to hold funds", error);
            const message = error instanceof Error ? error.message : "Unknown error";
            return { success: false, error: message };
        }
    }

    /**
     * Releases funds by transferring them from the suspense account to a destination.
     */
    static async releaseFunds(
        amount: number,
        destinationAccount: string,
        _reference: string,
        _description: string
    ): Promise<{ success: boolean; transactionReference?: string; error?: string }> {
        try {
            const suspenseAccount = await ConfigurationService.getSuspenseAccount();

            console.log(`[FundReservation] Releasing ${amount} from Suspense ${suspenseAccount} to ${destinationAccount}`);

            const result = await t24Service.transfer({
                fromAccount: suspenseAccount,
                toAccount: destinationAccount,
                amount: amount.toString(),
                currency: "MWK",
                reference: _reference || `REL_${Date.now()}`,
                description: _description || "Fund Reservation Release",
            });

            if (!result.success) {
                throw new Error(result.message || "Transfer failed");
            }

            return {
                success: true,
                transactionReference: result.t24Reference || result.externalReference || `REL_${Date.now()}`
            };
        } catch (error: unknown) {
            console.error("Failed to release funds", error);
            const message = error instanceof Error ? error.message : "Unknown error";
            return { success: false, error: message };
        }
    }
}
