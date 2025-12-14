import { BillerConfig } from "@prisma/client";
import {
  BaseBillerService,
  AccountDetails,
  PaymentParams,
  PaymentResult,
} from "./base";

/**
 * Validation-only biller service
 * Used for Airtel Money validation
 */
export class ValidationBillerService extends BaseBillerService {
  constructor(config: BillerConfig) {
    super(config);
  }

  /**
   * Validate account/phone number
   */
  async lookupAccount(accountNumber: string): Promise<AccountDetails> {
    if (!this.validateAccountNumber(accountNumber)) {
      throw new Error("Invalid phone number format");
    }

    const endpoints = this.config.endpoints as any;
    let endpoint = endpoints.validation || endpoints.accountDetails || "";

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

      return this.parseValidationResponse(response, accountNumber);
    } catch (error: any) {
      throw new Error(`Validation failed: ${error.message}`);
    }
  }

  /**
   * Payment not supported for validation-only billers
   */
  async processPayment(params: PaymentParams): Promise<PaymentResult> {
    throw new Error("Payment not supported for validation-only billers");
  }

  /**
   * Parse validation response
   */
  private parseValidationResponse(
    response: any,
    accountNumber: string
  ): AccountDetails {
    const data = typeof response === "string" ? JSON.parse(response) : response;

    const isValid = data.valid === true || 
                    data.status === "valid" ||
                    data.is_valid === true;

    if (!isValid) {
      throw new Error("Account validation failed");
    }

    return {
      accountNumber,
      customerName: data.customer_name || data.name || "Validated User",
      status: isValid ? "valid" : "invalid",
      billerDetails: {
        phoneNumber: accountNumber,
        provider: data.provider || "Airtel",
        accountType: data.account_type || data.type,
        ...data,
      },
    };
  }
}
