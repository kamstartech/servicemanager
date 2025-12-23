import { ESBBillerClient, type BillerHttpResult } from "./esb-client";
import { AccountLookupParams, BillerPaymentParams } from "./water-biller-service";

/**
 * Government Biller Service (Register General)
 * Handles government service payments and invoice lookups
 */
export class GovernmentBillerService {
    private esb: ESBBillerClient;

    constructor() {
        this.esb = new ESBBillerClient();
    }

    /**
     * Get invoice details for a government service
     */
    async getInvoice(params: { invoiceNumber: string }): Promise<BillerHttpResult> {
        const endpoint = `/api/billers/register-general/v1/accounts/${params.invoiceNumber}`;
        return this.esb.get(endpoint);
    }

    /**
     * Confirm and pay government invoice
     */
    async confirmInvoice(params: BillerPaymentParams & { invoiceNumber: string }): Promise<BillerHttpResult> {
        const endpoint = `/api/billers/register-general/v1/transactions`;

        const xml = this.buildPaymentXml(params);
        return this.esb.postXml(endpoint, xml);
    }

    /**
     * Build payment XML for government billers
     */
    private buildPaymentXml(params: BillerPaymentParams & { invoiceNumber: string }): string {
        return `<?xml version="1.0"?>
<post-payment-request>
    <our-transaction-id>${params.externalTxnId}</our-transaction-id>
    <invoice-number>${params.invoiceNumber}</invoice-number>
    <account-number>${params.accountNumber}</account-number>
    <amount>${params.amount}</amount>
    <currency>${params.currency}</currency>
    <debit-account>${params.debitAccount}</debit-account>
    <debit-account-type>${params.debitAccountType}</debit-account-type>
    ${params.customerAccountNumber ? `<customer-account-number>${params.customerAccountNumber}</customer-account-number>` : ""}
    ${params.customerAccountName ? `<customer-account-name>${params.customerAccountName}</customer-account-name>` : ""}
</post-payment-request>`;
    }
}

export const governmentBillerService = new GovernmentBillerService();
