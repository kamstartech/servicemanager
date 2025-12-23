import { ESBBillerClient, type BillerHttpResult } from "./esb-client";

/**
 * Mobile Network Operator Validation Service
 * Handles TNM bundle validation and Airtel number validation
 */
export class MNOValidationService {
    private esb: ESBBillerClient;

    constructor() {
        this.esb = new ESBBillerClient();
    }

    /**
     * Validate TNM bundle availability for a phone number
     */
    async validateTnmBundle(params: {
        phoneNumber: string;
        bundleId?: string;
    }): Promise<BillerHttpResult> {
        const query = params.bundleId ? `?bundleId=${params.bundleId}` : "";
        const endpoint = `/esb/api/tnm-bundles/v1/validation/${params.phoneNumber}${query}`;
        return this.esb.get(endpoint);
    }

    /**
     * Get available TNM bundles for a phone number
     */
    async getTnmBundles(params: { phoneNumber: string }): Promise<BillerHttpResult> {
        const endpoint = `/esb/api/tnm-bundles/v1/bundles/${params.phoneNumber}`;
        return this.esb.get(endpoint);
    }

    /**
     * Validate Airtel number for topup eligibility
     */
    async validateAirtelNumber(params: { phoneNumber: string }): Promise<BillerHttpResult> {
        const endpoint = `/esb/api/airtel/v1/validation/${params.phoneNumber}`;
        return this.esb.get(endpoint);
    }

    /**
     * Get Airtel customer details
     */
    async getAirtelCustomerInfo(params: { phoneNumber: string }): Promise<BillerHttpResult> {
        const endpoint = `/esb/api/airtel/v1/customers/${params.phoneNumber}`;
        return this.esb.get(endpoint);
    }
}

export const mnoValidationService = new MNOValidationService();
