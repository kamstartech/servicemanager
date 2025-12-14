/**
 * T24 Customer Accounts API Integration
 * 
 * Fetches list of accounts for a customer from T24 Core Banking System
 * 
 * Endpoint: GET https://fdh-esb.ngrok.dev/esb/customer/accounts/v1/api/{customer_id}
 * Auth: Basic Auth (username:password)
 */

import { fetchIPv4 } from "@/lib/utils/fetch-ipv4";

interface T24AccountInfo {
  "ACCOUNT.ID": string;
  "CUSTOMER.ID"?: string;
  "CATEGORY"?: string;
  "CURRENCY"?: string;
  "ACCOUNT.TITLE.1"?: string;
  [key: string]: any;
}

interface T24AccountsResponse {
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
  body: T24AccountInfo[];
}

export class T24AccountsService {
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
   * Get all accounts for a customer with pagination support
   * Endpoint: GET /esb/customer/accounts/v1/api/{customer_id}
   */
  async getCustomerAccounts(
    customerId: string,
    pageToken?: string
  ): Promise<T24AccountsResponse | null> {
    try {
      let url = `${this.baseUrl}/esb/customer/accounts/v1/api/${customerId}`;
      if (pageToken) {
        url += `?page_token=${encodeURIComponent(pageToken)}`;
      }

      console.log(`🔄 Fetching accounts from T24 for customer: ${customerId}${pageToken ? ` (page: ${pageToken})` : ''}`);

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

      const data: T24AccountsResponse = await response.json();

      if (!data.body || !Array.isArray(data.body)) {
        console.error("❌ Invalid T24 response: no body array");
        return null;
      }

      console.log(`✅ Found ${data.body.length} accounts for customer ${customerId} (total: ${data.header.total_size})`);
      return data;
    } catch (error) {
      console.error(`❌ T24 accounts fetch failed for ${customerId}:`, error);
      return null;
    }
  }

  /**
   * Get all accounts for a customer (single page, legacy method)
   */
  async getCustomerAccountsLegacy(
    customerId: string
  ): Promise<T24AccountInfo[] | null> {
    const data = await this.getCustomerAccounts(customerId);
    return data ? data.body : null;
  }

  /**
   * Get just the account IDs for a customer with full pagination support
   * Returns array of account numbers and indicates if more pages exist
   */
  async getCustomerAccountIds(customerId: string): Promise<{
    accountIds: string[];
    hasMore: boolean;
    nextPageToken?: string;
    totalSize: number;
  }> {
    const data = await this.getCustomerAccounts(customerId);

    if (!data) {
      return { accountIds: [], hasMore: false, totalSize: 0 };
    }

    const accountIds = data.body
      .map((account) => account["ACCOUNT.ID"])
      .filter((id) => id !== undefined && id !== null);

    const hasMore = data.header.total_size > (data.header.page_start + data.body.length - 1);

    return {
      accountIds,
      hasMore,
      nextPageToken: hasMore ? data.header.page_token : undefined,
      totalSize: data.header.total_size,
    };
  }

  /**
   * Get all account IDs for a customer (all pages)
   * This method fetches all pages synchronously - use with caution for customers with many accounts
   */
  async getAllCustomerAccountIds(customerId: string): Promise<string[]> {
    const allAccountIds: string[] = [];
    let pageToken: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      const data = await this.getCustomerAccounts(customerId, pageToken);

      if (!data) {
        break;
      }

      const accountIds = data.body
        .map((account) => account["ACCOUNT.ID"])
        .filter((id) => id !== undefined && id !== null);

      allAccountIds.push(...accountIds);

      hasMore = data.header.total_size > (data.header.page_start + data.body.length - 1);
      pageToken = hasMore ? data.header.page_token : undefined;

      console.log(`   Fetched ${accountIds.length} accounts (total so far: ${allAccountIds.length}/${data.header.total_size})`);
    }

    return allAccountIds;
  }

  /**
   * Get detailed account information
   * Returns full account objects with all fields
   */
  async getCustomerAccountsDetailed(
    customerId: string
  ): Promise<{
    ok: boolean;
    accounts?: Array<{
      accountId: string;
      customerId?: string;
      category?: string;
      currency?: string;
      title?: string;
    }>;
    error?: string;
  }> {
    const data = await this.getCustomerAccounts(customerId);

    if (!data) {
      return {
        ok: false,
        error: "Failed to fetch accounts from T24",
      };
    }

    const detailedAccounts = data.body.map((account) => ({
      accountId: account["ACCOUNT.ID"],
      customerId: account["CUSTOMER.ID"],
      category: account["CATEGORY"],
      currency: account["CURRENCY"],
      title: account["ACCOUNT.TITLE.1"],
    }));

    return {
      ok: true,
      accounts: detailedAccounts,
    };
  }

  /**
   * Test connection by fetching a test customer's accounts
   */
  async testConnection(): Promise<boolean> {
    try {
      const testCustomer = process.env.T24_TEST_CUSTOMER || "35042058";
      const data = await this.getCustomerAccounts(testCustomer);
      return data !== null && data.body.length > 0;
    } catch (error) {
      console.error("❌ T24 accounts connection test failed:", error);
      return false;
    }
  }
}

// Singleton instance
export const t24AccountsService = new T24AccountsService();
