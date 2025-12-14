import { BillerConfig } from "@prisma/client";
import {
  BaseBillerService,
  AccountDetails,
  PaymentParams,
  PaymentResult,
  Invoice,
  InvoiceConfirmParams,
} from "./base";

/**
 * Invoice-based biller service
 * Used for Register General and SRWB Prepaid
 */
export class InvoiceBillerService extends BaseBillerService {
  constructor(config: BillerConfig) {
    super(config);
  }

  /**
   * Lookup account (not typically supported for invoice billers)
   */
  async lookupAccount(accountNumber: string): Promise<AccountDetails> {
    throw new Error("Account lookup not supported for invoice-based billers");
  }

  /**
   * Get invoice for account
   */
  async getInvoice(accountNumber: string): Promise<Invoice> {
    if (!this.validateAccountNumber(accountNumber)) {
      throw new Error("Invalid account number format");
    }

    const endpoints = this.config.endpoints as any;
    let endpoint = endpoints.invoice || endpoints.getInvoice || "";

    endpoint = endpoint
      .replace("{account_number}", accountNumber)
      .replace("{accountNumber}", accountNumber);

    try {
      const response = await this.retryRequest(() =>
        this.makeRequest(endpoint, null, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        })
      );

      return this.parseInvoiceResponse(response);
    } catch (error: any) {
      throw new Error(`Failed to get invoice: ${error.message}`);
    }
  }

  /**
   * Confirm invoice payment
   */
  async confirmInvoice(params: InvoiceConfirmParams): Promise<PaymentResult> {
    if (!this.validateAccountNumber(params.accountNumber)) {
      throw new Error("Invalid account number format");
    }

    const amount = typeof params.amount === "string"
      ? parseFloat(params.amount)
      : parseFloat(params.amount);

    if (!this.validateAmount(amount)) {
      const rules = this.config.validationRules as any;
      throw new Error(
        `Amount must be between ${rules.minAmount} and ${rules.maxAmount}`
      );
    }

    const endpoints = this.config.endpoints as any;
    const endpoint = endpoints.confirmInvoice || "";

    const requestBody = this.buildInvoiceConfirmRequest(params);

    try {
      const response = await this.retryRequest(() =>
        this.makeRequest(endpoint, JSON.stringify(requestBody), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        })
      );

      return this.parsePaymentResponse(response);
    } catch (error: any) {
      return {
        success: false,
        error: `Invoice confirmation failed: ${error.message}`,
      };
    }
  }

  /**
   * Process payment (uses invoice flow)
   */
  async processPayment(params: PaymentParams): Promise<PaymentResult> {
    // For invoice billers, we need to confirm the invoice
    const confirmParams: InvoiceConfirmParams = {
      invoiceNumber: params.metadata?.invoiceNumber || "",
      accountNumber: params.accountNumber,
      amount: params.amount.toString(),
      currency: params.currency,
    };

    return this.confirmInvoice(confirmParams);
  }

  /**
   * Build invoice confirmation request
   */
  private buildInvoiceConfirmRequest(params: InvoiceConfirmParams): any {
    return {
      invoice_number: params.invoiceNumber,
      account_number: params.accountNumber,
      amount: params.amount,
      currency: params.currency || this.config.defaultCurrency,
      transaction_id: this.generateTransactionId(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Parse invoice response
   */
  private parseInvoiceResponse(response: any): Invoice {
    const data = typeof response === "string" ? JSON.parse(response) : response;

    return {
      invoiceNumber: data.invoice_number || data.invoiceNumber || "",
      accountNumber: data.account_number || data.accountNumber || "",
      amount: data.amount?.toString() || "0",
      dueDate: data.due_date || data.dueDate,
      description: data.description,
      details: data,
    };
  }

  /**
   * Parse payment response
   */
  private parsePaymentResponse(response: any): PaymentResult {
    const data = typeof response === "string" ? JSON.parse(response) : response;

    const success = data.status === "success" || 
                    data.status === "completed" ||
                    data.success === true;

    return {
      success,
      transactionId: data.transaction_id || data.transactionId,
      externalReference: data.external_reference || data.externalReference,
      message: data.message,
      data,
    };
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `TT${timestamp}${random}`.toUpperCase();
  }
}
