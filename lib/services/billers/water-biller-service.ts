import { ESBBillerClient } from "./esb-client";

export interface BillerPaymentParams {
    accountNumber: string;
    amount: number;
    currency: string;
    debitAccount: string;
    debitAccountType: string;
    creditAccount?: string;
    creditAccountType?: string;
    customerAccountNumber?: string;
    customerAccountName?: string;
    externalTxnId: string;
}

export interface AccountLookupParams {
    accountNumber: string;
    accountType?: string;
}

/**
 * Water Biller Service
 * Handles LWB, BWB, and SRWB postpaid water bill payments
 */
export class WaterBillerService {
    private esb: ESBBillerClient;

    constructor() {
        this.esb = new ESBBillerClient();
    }

    /**
     * Lookup LWB account details
     */
    async lwbAccountLookup(params: AccountLookupParams) {
        const endpoint = `/esb/api/lwb-postpaid-test/v1/accounts/${params.accountNumber}`;
        return this.esb.get(endpoint);
    }

    /**
     * Process LWB payment
     */
    async lwbPayment(params: BillerPaymentParams) {
        const endpoint = `/esb/api/lwb-postpaid-test/v1/accounts/${params.accountNumber}`;

        const xml = this.buildPaymentXml(params);
        return this.esb.postXml(endpoint, xml);
    }

    /**
     * Lookup BWB account details
     */
    async bwbAccountLookup(params: AccountLookupParams) {
        const endpoint = `/esb/api/bwb-postpaid-test/v1/accounts/${params.accountNumber}`;
        return this.esb.get(endpoint);
    }

    /**
     * Process BWB payment
     */
    async bwbPayment(params: BillerPaymentParams) {
        const endpoint = `/esb/api/bwb-postpaid-test/v1/transactions`;

        const xml = this.buildPaymentXml(params);
        return this.esb.postXml(endpoint, xml);
    }

    /**
     * Lookup SRWB account details
     */
    async srwbAccountLookup(params: AccountLookupParams) {
        const endpoint = `/esb/api/lwb-postpaid-test/v1/accounts/${params.accountNumber}`;
        return this.esb.get(endpoint);
    }

    /**
     * Process SRWB payment
     */
    async srwbPayment(params: BillerPaymentParams) {
        const endpoint = `/esb/api/srwb-postpaid-test/v1/transactions`;

        const xml = this.buildPaymentXml(params);
        return this.esb.postXml(endpoint, xml);
    }

    /**
     * Lookup LWB Prepaid (voucher) account details
     */
    async lwbPrepaidAccountLookup(params: AccountLookupParams) {
        const endpoint = `/esb/api/lwb-prepaid-test/v1/accounts/${params.accountNumber}`;
        return this.esb.get(endpoint);
    }

    /**
     * Process LWB Prepaid payment
     */
    async lwbPrepaidPayment(params: BillerPaymentParams) {
        const endpoint = `/esb/api/lwb-prepaid-test/v1/transactions`;

        const xml = this.buildPaymentXml(params);
        return this.esb.postXml(endpoint, xml);
    }

    /**
     * Lookup SRWB Prepaid (voucher) account details
     */
    async srwbPrepaidAccountLookup(params: AccountLookupParams) {
        const endpoint = `/esb/api/srwb-prepaid-test/v1/accounts/${params.accountNumber}`;
        return this.esb.get(endpoint);
    }

    /**
     * Process SRWB Prepaid payment
     */
    async srwbPrepaidPayment(params: BillerPaymentParams) {
        const endpoint = `/esb/api/srwb-prepaid-test/v1/transactions`;

        const xml = this.buildPaymentXml(params);
        return this.esb.postXml(endpoint, xml);
    }

    /**
     * Build payment XML for water billers
     */
    private buildPaymentXml(params: BillerPaymentParams): string {
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
</post-payment-request>`;
    }
}

export const waterBillerService = new WaterBillerService();
