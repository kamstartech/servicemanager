/**
 * T24 Core Banking System Integration Service
 * 
 * This service acts as a client to communicate with T24 API
 * for processing financial transactions.
 */

import { TransferType } from "@prisma/client";
import { fetchIPv4 } from "@/lib/utils/fetch-ipv4";

interface T24TransferRequest {
  fromAccount: string;
  toAccount: string;
  amount: string;
  currency: string;
  reference: string;
  description: string;
  transferType?: TransferType;
}

interface T24TransferResponse {
  success: boolean;
  t24Reference?: string;
  externalReference?: string;
  message: string;
  errorCode?: string;
}

export class T24Service {
  private baseUrl: string;
  private username: string;
  private password: string;
  private credentials: string;

  constructor() {
    this.baseUrl =
      process.env.T24_ESB_URL ||
      process.env.T24_BASE_URL ||
      process.env.T24_API_URL ||
      "https://fdh-esb.ngrok.dev";
    this.username = process.env.T24_USERNAME || "";
    this.password = process.env.T24_PASSWORD || "";
    this.credentials = Buffer.from(
      `${this.username}:${this.password}`
    ).toString("base64");
  }

  /**
   * Transfer funds between accounts
   */
  async transfer(request: T24TransferRequest): Promise<T24TransferResponse> {
    try {
      const transferType = request.transferType;
      const isExternalBankTransfer = transferType === TransferType.EXTERNAL_BANK;

      const endpointPath = isExternalBankTransfer
        ? "/api/esb/transfers/other/1.0/bank"
        : "/api/esb/transaction/1.0/initiate/transaction";

      const url = `${this.baseUrl}${endpointPath}`;

      const body = this.buildTransferBody(request, isExternalBankTransfer);

      console.log("[T24Service] Posting transfer to T24 ESB", {
        url,
        transferType,
        fromAccount: request.fromAccount,
        toAccount: request.toAccount,
        amount: request.amount,
        currency: request.currency,
        reference: request.reference,
      });

      const response = await fetchIPv4(url, {
        method: "POST",
        headers: {
          Accept: "*/*",
          "Content-Type": "application/json",
          Authorization: `Basic ${this.credentials}`,
        },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      let responseJson: any = null;

      try {
        responseJson = responseText ? JSON.parse(responseText) : null;
      } catch (e) {
        responseJson = null;
      }

      if (!response.ok) {
        const errorCode =
          responseJson?.code ||
          responseJson?.errorCode ||
          responseJson?.error?.code ||
          "T24_API_ERROR";
        const message =
          responseJson?.message ||
          responseJson?.error ||
          responseJson?.error_description ||
          response.statusText ||
          "T24 transfer failed";

        console.error("[T24Service] T24 ESB transfer failed", {
          status: response.status,
          errorCode,
          message,
          response: responseJson ?? responseText,
        });

        return {
          success: false,
          message,
          errorCode,
        };
      }

      // Check for logical errors even if status is 200
      if (
        responseJson?.type === "BUSINESS" ||
        responseJson?.errorDetails ||
        responseJson?.header?.status === "failed" ||
        responseJson?.status === "failed"
      ) {
        let errorMessage = "T24 transfer failed";
        let errCode = "T24_BUSINESS_ERROR";

        if (responseJson.errorDetails && Array.isArray(responseJson.errorDetails) && responseJson.errorDetails.length > 0) {
          errorMessage = responseJson.errorDetails[0].message || errorMessage;
          errCode = responseJson.errorDetails[0].code || errCode;
        } else if (responseJson.message) {
          errorMessage = typeof responseJson.message === 'string' ? responseJson.message : JSON.stringify(responseJson.message);
        }

        console.error("[T24Service] T24 logic error detected:", {
          errorMessage,
          errorCode: errCode,
          response: responseJson
        });

        return {
          success: false,
          message: errorMessage,
          errorCode: errCode,
          t24Reference: responseJson?.id || responseJson?.header?.id, // Capture ref if available even on failure
        };
      }

      const t24Reference =
        responseJson?.body?.header?.id ||
        responseJson?.header?.id ||
        responseJson?.id;

      const externalReference =
        responseJson?.body?.header?.uniqueIdentifier ||
        responseJson?.header?.uniqueIdentifier;

      return {
        success: true,
        t24Reference,
        externalReference,
        message: "Transfer initiated successfully",
      };
    } catch (error) {
      console.error("[T24Service] Transfer error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        errorCode: "T24_ERROR",
      };
    }
  }

  private buildTransferBody(
    request: T24TransferRequest,
    isExternalBankTransfer: boolean
  ): Record<string, unknown> {
    const commonBody: Record<string, unknown> = {
      transactionType: "AC",
      debitAccountNumber: request.fromAccount,
      debitAmount: request.amount,
      debitCurrency: request.currency,
      creditAccountNumber: request.toAccount,
    };

    if (!isExternalBankTransfer) {
      commonBody.creditCurrencyId = request.currency;
    }

    return {
      header: {},
      body: commonBody,
    };
  }

  /**
   * Check account balance
   */
  async getBalance(accountNumber: string): Promise<any> {
    try {
      // TODO: Implement actual T24 API call
      console.log("[T24Service] Get balance for:", accountNumber);

      // Simulate API call
      await this.delay(500);

      return {
        accountNumber,
        balance: "1000.00",
        currency: "MWK",
      };
    } catch (error) {
      console.error("[T24Service] Get balance error:", error);
      throw error;
    }
  }

  /**
   * Reverse a transaction
   */
  async reverseTransaction(t24Reference: string, reason: string): Promise<T24TransferResponse> {
    try {
      // TODO: Implement actual T24 API call
      console.log("[T24Service] Reverse transaction:", t24Reference, reason);

      await this.delay(1000);

      return {
        success: true,
        t24Reference: `T24-REV-${Date.now()}`,
        message: "Transaction reversed successfully",
      };
    } catch (error) {
      console.error("[T24Service] Reverse transaction error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        errorCode: "T24_REVERSAL_ERROR",
      };
    }
  }

  /**
   * Helper: Simulate delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const t24Service = new T24Service();
