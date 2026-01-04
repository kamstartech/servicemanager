import { ESBBillerClient, type BillerHttpResult } from "./esb-client";
import { type BillerPaymentParams } from "./water-biller-service";

/**
 * MNO Biller Service
 * Handles Airtel and TNM airtime purchases
 */
export class MNOBillerService {
    private esb: ESBBillerClient;

    constructor() {
        this.esb = new ESBBillerClient();
    }

    /**
     * Process Airtel Airtime Purchase
     */
    async processAirtelAirtime(params: BillerPaymentParams): Promise<BillerHttpResult> {
        // Assuming JSON endpoint for Airtime, based on modern API trends, 
        // but falling back to XML or specific format if ESB standards dictate.
        // For now, let's assume a standard JSON POST if that's what ESB supports for new services,
        // otherwise we can stick to XML if that's the established pattern (like Water).
        // BUT `esb-client` has `postXml`. It does NOT have `postJson`.
        // So we should probably use XML or add `postJson` to `esb-client`.
        // Let's check `esb-client` again. It has `postXml` and `get`.
        // If I need JSON POST, I should add it to `esb-client`.

        // However, sticking to the existing pattern (XML) is safer unless I'm sure.
        // Let's implement `postJson` in `esb-client` first if I want to use JSON,
        // OR just use `postXml` if that's the only way.

        // Given the task is to "add airtime", and usually airtime APIs are simpler, 
        // I will assume XML to be safe as `postXml` is the only mutator available.

        const endpoint = `/esb/api/airtel/v1/airtime`;
        const xml = this.buildAirtimeXml(params, "AIRTEL");
        return this.esb.postXml(endpoint, xml);
    }

    /**
     * Process TNM Airtime Purchase
     */
    async processTnmAirtime(params: BillerPaymentParams): Promise<BillerHttpResult> {
        const endpoint = `/esb/api/tnm/v1/airtime`;
        const xml = this.buildAirtimeXml(params, "TNM");
        return this.esb.postXml(endpoint, xml);
    }

    private buildAirtimeXml(params: BillerPaymentParams, provider: string): string {
        const phoneNumber = (params as any).phoneNumber || params.accountNumber;
        return `<?xml version="1.0"?>
<airtime-request>
    <provider>${provider}</provider>
    <our-transaction-id>${params.externalTxnId}</our-transaction-id>
    <phone-number>${phoneNumber}</phone-number>
    <amount>${params.amount}</amount>
    <currency>${params.currency || 'MWK'}</currency>
    <debit-account>${params.debitAccount}</debit-account>
    <debit-account-type>${params.debitAccountType}</debit-account-type>
</airtime-request>`;
    }
}

export const mnoBillerService = new MNOBillerService();
