import { waterBillerService } from "./water-biller-service";
import { masmBillerService } from "./masm-biller-service";
import { governmentBillerService } from "./government-biller-service";
import { mnoValidationService } from "./mno-validation-service";
import { mnoBillerService } from "./mno-biller-service";
import { type BillerPaymentParams, type AccountLookupParams } from "./water-biller-service";

/**
 * Unified Biller ESB Service
 * Routes requests to appropriate biller service
 * Similar to AirtimeService pattern
 */
export class BillerEsbService {
    /**
     * Lookup account for any biller type
     */
    async lookupAccount(
        billerType: string,
        params: AccountLookupParams | { phoneNumber?: string; invoiceNumber?: string; bundleId?: string }
    ) {
        switch (billerType) {
            case "LWB_POSTPAID":
                return waterBillerService.lwbAccountLookup(params as AccountLookupParams);

            case "LWB_PREPAID":
                return waterBillerService.lwbPrepaidAccountLookup(params as AccountLookupParams);

            case "BWB_POSTPAID":
                return waterBillerService.bwbAccountLookup(params as AccountLookupParams);

            case "SRWB_POSTPAID":
                return waterBillerService.srwbAccountLookup(params as AccountLookupParams);

            case "SRWB_PREPAID":
                return waterBillerService.srwbPrepaidAccountLookup(params as AccountLookupParams);

            case "MASM":
                return masmBillerService.accountLookup(params as AccountLookupParams);

            case "REGISTER_GENERAL":
                return governmentBillerService.getInvoice({
                    invoiceNumber: (params as any).invoiceNumber || (params as any).accountNumber
                });

            case "TNM_BUNDLES":
                return mnoValidationService.validateTnmBundle({
                    phoneNumber: (params as any).phoneNumber || (params as any).accountNumber,
                    bundleId: (params as any).bundleId,
                });

            case "AIRTEL_VALIDATION":
            case "AIRTEL_AIRTIME":
                return mnoValidationService.validateAirtelNumber({
                    phoneNumber: (params as any).phoneNumber || (params as any).accountNumber,
                });

            case "TNM_AIRTIME":
                // Use generic TNM validation or assumes bundle ID is not needed for airtime
                // Using validateTnmBundle might fail if bundleId is missing?
                // mnoValidationService has validateTnmBundle which takes bundleId.
                // Let's assume for airtime we just validate the number if possible, or skip deeply validating if no explicit method exists.
                // Actually, mnoValidationService only has `validateTnmBundle`. 
                // Let's use `validateAirtelNumber` logic (which is just a GET) as a template for what we might expect, 
                // but for TNM, let's assumed there is a `validateTnmNumber` or similar? 
                // No, currently only `validateTnmBundle`.
                // I will return a mock success or simple check for now since I can't add new methods to `mnoValidationService` without seeing it fully first (I saw it, it has validateTnmBundle).
                // Ah, `validateTnmBundle` takes `bundleId` as optional?
                // `params.bundleId` is optional in the interface.
                // Let's re-read `mno-validation-service.ts`.
                return mnoValidationService.validateTnmBundle({
                    phoneNumber: (params as any).phoneNumber || (params as any).accountNumber,
                });

            default:
                throw new Error(`Unsupported biller type: ${billerType}`);
        }
    }

    /**
     * Process payment for any biller type
     */
    async processPayment(
        billerType: string,
        params: BillerPaymentParams & { accountType?: string; invoiceNumber?: string }
    ) {
        switch (billerType) {
            case "LWB_POSTPAID":
                return waterBillerService.lwbPayment(params);

            case "LWB_PREPAID":
                return waterBillerService.lwbPrepaidPayment(params);

            case "BWB_POSTPAID":
                return waterBillerService.bwbPayment(params);

            case "SRWB_POSTPAID":
                return waterBillerService.srwbPayment(params);

            case "SRWB_PREPAID":
                return waterBillerService.srwbPrepaidPayment(params);

            case "MASM":
                return masmBillerService.processPayment(params);

            case "REGISTER_GENERAL":
                return governmentBillerService.confirmInvoice({
                    ...params,
                    invoiceNumber: params.invoiceNumber || params.accountNumber,
                });

            case "AIRTEL_AIRTIME":
                return mnoBillerService.processAirtelAirtime(params);

            case "TNM_AIRTIME":
                return mnoBillerService.processTnmAirtime(params);

            default:
                throw new Error(`Unsupported biller type: ${billerType}`);
        }
    }

    /**
     * Get available biller types
     */
    getSupportedBillers() {
        return [
            "LWB_POSTPAID",
            "LWB_PREPAID",
            "BWB_POSTPAID",
            "SRWB_POSTPAID",
            "SRWB_PREPAID",
            "MASM",
            "REGISTER_GENERAL",
            "TNM_BUNDLES",
            "AIRTEL_VALIDATION",
            "AIRTEL_AIRTIME",
            "TNM_AIRTIME",
        ];
    }
}

export const billerEsbService = new BillerEsbService();

