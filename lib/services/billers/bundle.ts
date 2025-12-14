import { BillerConfig } from "@prisma/client";
import {
  BaseBillerService,
  AccountDetails,
  PaymentParams,
  PaymentResult,
  Bundle,
  BundlePurchaseParams,
} from "./base";

/**
 * Bundle-based biller service
 * Used for TNM Bundles
 */
export class BundleBillerService extends BaseBillerService {
  constructor(config: BillerConfig) {
    super(config);
  }

  /**
   * Lookup account (validate phone number)
   */
  async lookupAccount(accountNumber: string): Promise<AccountDetails> {
    if (!this.validateAccountNumber(accountNumber)) {
      throw new Error("Invalid phone number format");
    }

    return {
      accountNumber,
      customerName: "Mobile User",
      status: "active",
      billerDetails: {
        phoneNumber: accountNumber,
      },
    };
  }

  /**
   * Get bundle details
   */
  async getBundleDetails(bundleId: string): Promise<Bundle> {
    const endpoints = this.config.endpoints as any;
    let endpoint = endpoints.bundleDetails || "";

    endpoint = endpoint
      .replace("{bundle_id}", bundleId)
      .replace("{bundleId}", bundleId);

    try {
      const response = await this.retryRequest(() =>
        this.makeRequest(endpoint, null, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        })
      );

      return this.parseBundleResponse(response);
    } catch (error: any) {
      throw new Error(`Failed to get bundle details: ${error.message}`);
    }
  }

  /**
   * Purchase bundle
   */
  async purchaseBundle(params: BundlePurchaseParams): Promise<PaymentResult> {
    if (!this.validateAccountNumber(params.accountNumber)) {
      throw new Error("Invalid phone number format");
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
    let endpoint = endpoints.confirmBundle || "";

    endpoint = endpoint
      .replace("{bundle_id}", params.bundleId)
      .replace("{bundleId}", params.bundleId)
      .replace("{phone_number}", params.accountNumber)
      .replace("{phoneNumber}", params.accountNumber);

    const requestBody = {
      bundle_id: params.bundleId,
      phone_number: params.accountNumber,
      amount: params.amount,
      transaction_id: this.generateTransactionId(),
      timestamp: new Date().toISOString(),
    };

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
        error: `Bundle purchase failed: ${error.message}`,
      };
    }
  }

  /**
   * Process payment (uses bundle flow)
   */
  async processPayment(params: PaymentParams): Promise<PaymentResult> {
    if (!params.metadata?.bundleId) {
      throw new Error("Bundle ID required for bundle purchase");
    }

    const bundleParams: BundlePurchaseParams = {
      bundleId: params.metadata.bundleId,
      accountNumber: params.accountNumber,
      amount: params.amount.toString(),
    };

    return this.purchaseBundle(bundleParams);
  }

  /**
   * Parse bundle details response
   */
  private parseBundleResponse(response: any): Bundle {
    const data = typeof response === "string" ? JSON.parse(response) : response;

    return {
      bundleId: data.bundle_id || data.bundleId || "",
      name: data.name || data.bundle_name || "",
      description: data.description || "",
      amount: data.amount?.toString() || data.price?.toString() || "0",
      validity: data.validity || data.validity_period,
      dataAmount: data.data_amount || data.data_size,
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
