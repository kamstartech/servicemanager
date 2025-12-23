import { ESBBillerClient, type BillerHttpResult } from "./esb-client";
import { AccountLookupParams, BillerPaymentParams } from "./water-biller-service";

/**
 * MASM Health Coverage Biller Service
 * Handles MASM health coverage lookups and payments
 */
export class MasmBillerService {
    private esb: ESBBillerClient;

    constructor() {
        this.esb = new ESBBillerClient();
    }

    /**
     * Lookup MASM account details
     * @param params - Account lookup parameters
     * @param params.accountNumber - Meter number
     * @param params.accountType - Account type (required for MASM)
     */
    async accountLookup(params: AccountLookupParams) {
        const accountType = params.accountType || "account";
        const endpoint = `/esb/api/masm-test/v1/accounts/${params.accountNumber}?type=${accountType}`;
        return this.esb.get(endpoint);
    }

    /**
     * Process MASM payment
     */
    async processPayment(params: BillerPaymentParams & { accountType?: string }) {
        const endpoint = `/esb/api/masm-test/v1/transactions`;

        const xml = this.buildPaymentXml(params);
        return this.esb.postXml(endpoint, xml);
    }

    /**
     * Build payment XML for MASM
     */
    private buildPaymentXml(params: BillerPaymentParams & { accountType?: string }): string {
        return `<?xml version="1.0"?>
<post-payment-request>
    <our-transaction-id>${params.externalTxnId}</our-transaction-id>
    <account-number>${params.accountNumber}</account-number>
    <amount>${params.amount}</amount>
    <currency>${params.currency}</currency>
    ${params.creditAccount ? `<credit-account>${params.creditAccount}</credit-account>` : ""}
    ${params.creditAccountType ? `<credit-account-type>${params.creditAccountType}</credit-account-type>` : ""}
    <debit-account>${params.debitAccount}</debit-account>
    <debit-account-type>${params.debitAccountType}</debit-account-type>
    ${params.customerAccountNumber ? `<customer-account-number>${params.customerAccountNumber}</customer-account-number>` : ""}
    ${params.customerAccountName ? `<customer-account-name>${params.customerAccountName}</customer-account-name>` : ""}
    ${params.accountType ? `<type>${params.accountType}</type>` : ""}
</post-payment-request>`;
    }
}

export const masmBillerService = new MasmBillerService();
