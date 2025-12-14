/**
 * T24 Account Balance API Integration
 * 
 * Fetches account balances from T24 Core Banking System via ESB
 * 
 * Endpoint: GET https://fdh-esb.ngrok.dev/api/esb/accounts/account/v1/balances/{account_number}
 * Auth: Basic Auth (username:password)
 */

import { fetchIPv4 } from "@/lib/utils/fetch-ipv4";

interface T24BalanceResponse {
  working_balance: string;
  available_balance: string;
  cleared_balance: string;
  online_actual_balance: string;
  currency_id: string;
}

interface T24APIResponse {
  header: {
    audit: {
      T24_time: number;
      responseParse_time: number;
      requestParse_time: number;
    };
    page_start: number;
    page_token: string;
    total_size: number;
    page_size: number;
    status: string;
  };
  body: Array<{
    workingBalance: string;
    availableBalance: string;
    clearedBalance: string;
    onlineActualBalance: string;
    currencyId: string;
  }>;
}

export class T24BalanceService {
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
   * Fetch account balance from T24
   * Endpoint: GET /api/esb/accounts/account/v1/balances/{account_number}
   */
  async getAccountBalance(
    accountNumber: string
  ): Promise<T24BalanceResponse | null> {
    try {
      const url = `${this.baseUrl}/api/esb/accounts/account/v1/balances/${accountNumber}`;

      console.log(`🔄 Fetching balance from T24 for account: ${accountNumber}`);

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
        return null;
      }

      const data: T24APIResponse = await response.json();

      // Flatten the nested response
      return this.flattenBalanceResponse(data);
    } catch (error) {
      console.error(`❌ T24 balance fetch failed for ${accountNumber}:`, error);
      return null;
    }
  }

  /**
   * Flatten nested T24 response to simple object
   */
  private flattenBalanceResponse(
    response: T24APIResponse
  ): T24BalanceResponse | null {
    if (!response.body || response.body.length === 0) {
      console.error("❌ Empty T24 response body");
      return null;
    }

    const balanceInfo = response.body[0];

    return {
      working_balance: balanceInfo.workingBalance,
      available_balance: balanceInfo.availableBalance,
      cleared_balance: balanceInfo.clearedBalance,
      online_actual_balance: balanceInfo.onlineActualBalance,
      currency_id: balanceInfo.currencyId,
    };
  }

  /**
   * Get all balance types (working, available, cleared, online)
   * Returns tuple similar to Elixir implementation
   */
  async getAccountBalanceExtended(
    accountNumber: string
  ): Promise<{
    ok: boolean;
    workingBalance?: string;
    availableBalance?: string;
    clearedBalance?: string;
    onlineActualBalance?: string;
    error?: string;
  }> {
    const balance = await this.getAccountBalance(accountNumber);

    if (!balance) {
      return { ok: false, error: "Failed to fetch balance from T24" };
    }

    if (!balance.working_balance) {
      return { ok: false, error: "Missing working balance in T24 response" };
    }

    return {
      ok: true,
      workingBalance: balance.working_balance,
      availableBalance: balance.available_balance,
      clearedBalance: balance.cleared_balance,
      onlineActualBalance: balance.online_actual_balance,
    };
  }

  /**
   * Test connection to T24 API
   */
  async testConnection(): Promise<boolean> {
    try {
      // Use a test account number
      const testAccount = process.env.T24_TEST_ACCOUNT || "1520000114607";
      const balance = await this.getAccountBalance(testAccount);
      return balance !== null;
    } catch (error) {
      console.error("❌ T24 connection test failed:", error);
      return false;
    }
  }
}

// Singleton instance
export const t24BalanceService = new T24BalanceService();
