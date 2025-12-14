import { BillerConfig } from "@prisma/client";
import {
  BaseBillerService,
  AccountDetails,
  PaymentParams,
  PaymentResult,
} from "./base";

/**
 * Generic SOAP/XML-based biller service
 * Used for water boards (LWB, BWB, SRWB) and MASM
 */
export class SoapBillerService extends BaseBillerService {
  constructor(config: BillerConfig) {
    super(config);
  }

  /**
   * Lookup account details via SOAP/XML
   */
  async lookupAccount(
    accountNumber: string,
    accountType?: string
  ): Promise<AccountDetails> {
    if (!this.validateAccountNumber(accountNumber)) {
      throw new Error("Invalid account number format");
    }

    const features = this.config.features as any;
    if (!features.supportsAccountLookup) {
      throw new Error("Account lookup not supported for this biller");
    }

    const endpoints = this.config.endpoints as any;
    let endpoint = endpoints.accountDetails || "";

    // Replace placeholders
    endpoint = endpoint
      .replace("{account_number}", accountNumber)
      .replace("{accountNumber}", accountNumber);

    // Add account type for MASM
    if (accountType && features.requiresAccountType) {
      endpoint += `?type=${accountType}`;
    }

    try {
      const response = await this.retryRequest(() =>
        this.makeRequest(endpoint, null, {
          method: "GET",
          headers: {
            Accept: "application/xml",
          },
        })
      );

      return this.parseAccountDetailsResponse(response);
    } catch (error: any) {
      throw new Error(`Account lookup failed: ${error.message}`);
    }
  }

  /**
   * Process payment via SOAP/XML
   */
  async processPayment(params: PaymentParams): Promise<PaymentResult> {
    if (!this.validateAccountNumber(params.accountNumber)) {
      throw new Error("Invalid account number format");
    }

    const amount = typeof params.amount === "string" 
      ? parseFloat(params.amount) 
      : params.amount;

    if (!this.validateAmount(amount)) {
      const rules = this.config.validationRules as any;
      throw new Error(
        `Amount must be between ${rules.minAmount} and ${rules.maxAmount}`
      );
    }

    const endpoints = this.config.endpoints as any;
    const endpoint = endpoints.payment || endpoints.postTransaction || "";

    const requestXml = this.buildPaymentXml(params);

    try {
      const response = await this.retryRequest(() =>
        this.makeRequest(endpoint, requestXml, {
          method: "POST",
          headers: {
            "Content-Type": "application/xml",
            Accept: "application/xml",
          },
        })
      );

      return this.parsePaymentResponse(response);
    } catch (error: any) {
      return {
        success: false,
        error: `Payment failed: ${error.message}`,
      };
    }
  }

  /**
   * Build SOAP/XML payment request
   */
  private buildPaymentXml(params: PaymentParams): string {
    const currency = params.currency || this.config.defaultCurrency;
    const metadata = params.metadata || {};

    return `<?xml version="1.0" encoding="UTF-8"?>
<post-payment-request>
    <our-transaction-id>${metadata.ourTransactionId || this.generateTransactionId()}</our-transaction-id>
    <account-number>${params.accountNumber}</account-number>
    <amount>${params.amount}</amount>
    <currency>${currency}</currency>
    ${metadata.creditAccount ? `<credit-account>${metadata.creditAccount}</credit-account>` : ""}
    ${metadata.creditAccountType ? `<credit-account-type>${metadata.creditAccountType}</credit-account-type>` : ""}
    ${metadata.debitAccount ? `<debit-account>${metadata.debitAccount}</debit-account>` : ""}
    ${metadata.debitAccountType ? `<debit-account-type>${metadata.debitAccountType}</debit-account-type>` : ""}
    ${metadata.customerAccountNumber ? `<customer-account-number>${metadata.customerAccountNumber}</customer-account-number>` : ""}
    ${metadata.customerAccountName ? `<customer-account-name>${metadata.customerAccountName}</customer-account-name>` : ""}
    ${params.accountType ? `<type>${params.accountType}</type>` : ""}
</post-payment-request>`;
  }

  /**
   * Parse XML account details response
   */
  private parseAccountDetailsResponse(xmlResponse: string): AccountDetails {
    // Basic XML parsing - you might want to use a proper XML parser
    const accountNumber = this.extractXmlValue(xmlResponse, "account-number");
    const customerName = this.extractXmlValue(xmlResponse, "customer-name");
    const balance = this.extractXmlValue(xmlResponse, "balance");
    const status = this.extractXmlValue(xmlResponse, "status");

    if (!accountNumber) {
      throw new Error("Invalid response format");
    }

    return {
      accountNumber,
      customerName: customerName || "Unknown",
      balance: balance || "0.00",
      status: status || "active",
      billerDetails: {
        rawResponse: xmlResponse,
      },
    };
  }

  /**
   * Parse XML payment response
   */
  private parsePaymentResponse(xmlResponse: string): PaymentResult {
    const status = this.extractXmlValue(xmlResponse, "status");
    const transactionId = this.extractXmlValue(xmlResponse, "transaction-id");
    const externalReference = this.extractXmlValue(
      xmlResponse,
      "external-reference"
    );
    const message = this.extractXmlValue(xmlResponse, "message");

    const success = status?.toLowerCase() === "success" || 
                    status?.toLowerCase() === "completed";

    return {
      success,
      transactionId,
      externalReference: externalReference || undefined,
      message: message || undefined,
      data: {
        rawResponse: xmlResponse,
        status,
      },
    };
  }

  /**
   * Extract value from XML string (basic implementation)
   */
  private extractXmlValue(xml: string, tagName: string): string | null {
    const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, "i");
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
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
