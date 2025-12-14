/**
 * T24 Account Transactions API Integration
 * 
 * Fetches transaction history for an account from T24 Core Banking System
 * Based on Elixir implementation: lib/service_manager/services/t24/messages/get_account_transactions.ex
 * 
 * Endpoint: GET https://fdh-esb.ngrok.dev/api/esb/reports/v1/account/transactions/{account_number}
 * Auth: Basic Auth (username:password)
 */

import { fetchIPv4 } from "@/lib/utils/fetch-ipv4";

export interface T24Transaction {
  transactionId: string;
  accountNumber: string;
  transactionDate: string;
  valueDate: string;
  amount: string;
  debitAmount?: string;
  creditAmount?: string;
  type: string;
  description: string;
  reference: string;
  balance?: string;
  currency: string;
  status?: string;
  narrative?: string;
  [key: string]: any;
}

interface T24TransactionsResponse {
  status?: string;
  transactions?: T24Transaction[];
  error?: string;
  errorCode?: string;
  message?: string;
}

export class T24TransactionsService {
  private baseUrl: string;
  private username: string;
  private password: string;
  private credentials: string;

  constructor() {
    this.baseUrl =
      process.env.T24_ESB_URL ||
      process.env.T24_BASE_URL ||
      "https://fdh-esb.ngrok.dev";
    this.username = process.env.T24_USERNAME || "";
    this.password = process.env.T24_PASSWORD || "";
    this.credentials = Buffer.from(
      `${this.username}:${this.password}`
    ).toString("base64");
  }

  /**
   * Check if an error indicates "no records found"
   * T24 returns 404 with code TGVCP-007 for empty results
   */
  private isNoRecordsError(
    statusCode: number,
    errorData: any
  ): boolean {
    const code = errorData?.code || "";
    const message = (errorData?.message || "").toLowerCase();
    const type = errorData?.type || "";

    return (
      code === "TGVCP-007" ||
      message.includes("no records") ||
      message.includes("no transactions") ||
      message.includes("not found that matched") ||
      (statusCode === 404 && type === "BUSINESS")
    );
  }

  /**
   * Get transaction history for an account
   * Endpoint: GET /api/esb/reports/v1/account/transactions/{account_number}
   */
  async getAccountTransactions(
    accountNumber: string
  ): Promise<T24TransactionsResponse> {
    if (!accountNumber || accountNumber.trim() === "") {
      return {
        status: "error",
        error: "Invalid account number format",
        transactions: [],
      };
    }

    try {
      const url = `${this.baseUrl}/api/esb/reports/v1/account/transactions/${accountNumber}`;

      console.log(`🔄 Fetching transactions from T24 for account: ${accountNumber}`);

      const response = await fetchIPv4(url, {
        method: "GET",
        headers: {
          Accept: "*/*",
          "Content-Type": "application/json",
          Authorization: `Basic ${this.credentials}`,
        },
      });

      if (!response.ok) {
        console.error(
          `❌ T24 API error: ${response.status} ${response.statusText}`
        );
        
        // Try to parse error response
        let errorMessage = response.statusText;
        let errorCode = "";
        let errorData: any = {};
        
        try {
          errorData = await response.json();
          errorCode = errorData.code || "";
          errorMessage = errorData.message || errorData.error || errorMessage;
          
          console.log(`   Error details:`, {
            code: errorData.code,
            message: errorData.message,
            type: errorData.type,
          });
        } catch (e) {
          // Ignore JSON parse error
        }

        // Check for specific T24 "no records found" error
        if (this.isNoRecordsError(response.status, errorData)) {
          console.log(`ℹ️  No transactions found for account ${accountNumber}`);
          return {
            status: "success",
            transactions: [],
            message: "No transactions found for this account",
          };
        }

        return {
          status: "error",
          error: errorMessage,
          errorCode,
          transactions: [],
        };
      }

      const data = await response.json();

      // Handle different T24 response formats
      let transactions: T24Transaction[] = [];

      if (Array.isArray(data)) {
        transactions = data;
      } else if (data.transactions && Array.isArray(data.transactions)) {
        transactions = data.transactions;
      } else if (data.body && Array.isArray(data.body)) {
        transactions = data.body;
      } else {
        console.error("❌ Invalid T24 response: unexpected format", data);
        return {
          status: "error",
          error: "Invalid response format from T24",
          transactions: [],
        };
      }

      console.log(`✅ Found ${transactions.length} transactions for account ${accountNumber}`);

      return {
        status: "success",
        transactions: this.normalizeTransactions(transactions, accountNumber),
      };
    } catch (error) {
      console.error(`❌ T24 transactions fetch failed for ${accountNumber}:`, error);
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes("fetch")) {
        return {
          status: "error",
          error: "Network error: Could not connect to T24 Core Banking System",
          errorCode: "NETWORK_ERROR",
          transactions: [],
        };
      }
      
      return {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error occurred",
        transactions: [],
      };
    }
  }

  /**
   * Normalize transactions to a consistent format
   * Handles different field naming conventions from T24
   */
  private normalizeTransactions(
    rawTransactions: any[],
    accountNumber: string
  ): T24Transaction[] {
    return rawTransactions.map((txn) => {
      // Try to extract common fields from different possible keys
      const transactionId =
        txn.transactionId || 
        txn.id || 
        txn.transaction_id ||
        txn.TRANSACTION_ID ||
        txn.transRef ||
        "";

      const transactionDate =
        txn.transactionDate ||
        txn.date ||
        txn.transaction_date ||
        txn.BOOKING_DATE ||
        txn.bookingDate ||
        "";

      const valueDate =
        txn.valueDate ||
        txn.value_date ||
        txn.VALUE_DATE ||
        transactionDate;

      const amount =
        txn.amount ||
        txn.AMOUNT ||
        txn.transactionAmount ||
        "0";

      const debitAmount =
        txn.debitAmount ||
        txn.debit_amount ||
        txn.DEBIT_AMOUNT ||
        undefined;

      const creditAmount =
        txn.creditAmount ||
        txn.credit_amount ||
        txn.CREDIT_AMOUNT ||
        undefined;

      const type =
        txn.type ||
        txn.transactionType ||
        txn.transaction_type ||
        txn.TRANSACTION_TYPE ||
        (debitAmount ? "debit" : creditAmount ? "credit" : "unknown");

      const description =
        txn.description ||
        txn.narrative ||
        txn.NARRATIVE ||
        txn.details ||
        "";

      const reference =
        txn.reference ||
        txn.ref ||
        txn.REFERENCE ||
        txn.transRef ||
        "";

      const balance =
        txn.balance ||
        txn.BALANCE ||
        txn.runningBalance ||
        undefined;

      const currency =
        txn.currency ||
        txn.CURRENCY ||
        txn.currencyCode ||
        "MWK";

      const status =
        txn.status ||
        txn.STATUS ||
        "completed";

      return {
        transactionId,
        accountNumber,
        transactionDate,
        valueDate,
        amount: String(amount),
        debitAmount: debitAmount ? String(debitAmount) : undefined,
        creditAmount: creditAmount ? String(creditAmount) : undefined,
        type,
        description,
        reference,
        balance: balance ? String(balance) : undefined,
        currency,
        status,
        narrative: description,
        ...txn, // Preserve all original fields
      };
    });
  }

  /**
   * Test connection by fetching transactions for a test account
   */
  async testConnection(): Promise<boolean> {
    try {
      const testAccount = process.env.T24_TEST_ACCOUNT || "1010100007998";
      const result = await this.getAccountTransactions(testAccount);
      return result.status === "success";
    } catch (error) {
      console.error("❌ T24 transactions connection test failed:", error);
      return false;
    }
  }
}

// Singleton instance
export const t24TransactionsService = new T24TransactionsService();
