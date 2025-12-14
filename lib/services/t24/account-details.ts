/**
 * T24 Account Details API Integration
 * 
 * Fetches detailed account information including holder details, category, status, and customer info
 * 
 * Endpoint: GET https://fdh-esb.ngrok.dev/api/esb/accounts/1.0/account/{account_number}
 * Auth: Basic Auth (username:password)
 */

import { fetchIPv4 } from "@/lib/utils/fetch-ipv4";

interface T24AccountDetail {
  arrangementID?: string[];
  accountID?: string[];
  accountCurrency?: string[];
}

interface T24CustomerDetail {
  firstName?: string[];
  lastName?: string[];
  customerType?: string[];
  phoneNumber?: string[];
  street?: string[];
  dateOfBirth?: string[];
  postCode?: string[];
  employmentStatus?: string[];
  townCountry?: string[];
  email?: string[];
  maritalStatus?: string[];
  customer?: string[];
}

interface T24AccountInfo {
  holderName?: string;
  positionType?: string;
  nickName?: string;
  categoryName?: string;
  accountStatus?: string;
  onlineLimit?: string;
  accountDetails?: T24AccountDetail[];
  dateTo?: string;
  CUSTOMER?: number;
  "ACCOUNT.DETAILS"?: Array<{ accountStatus?: string[] }>;
  customerDetails?: T24CustomerDetail[];
  openingDate?: string;
  categoryId?: string;
}

interface T24AccountDetailsResponse {
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

export class T24AccountDetailsService {
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
   * Get detailed account information from T24
   * Endpoint: GET /api/esb/accounts/1.0/account/{account_number}
   */
  async getAccountDetails(
    accountNumber: string
  ): Promise<T24AccountDetailsResponse | null> {
    try {
      const url = `${this.baseUrl}/api/esb/accounts/1.0/account/${accountNumber}`;

      console.log(`🔄 Fetching account details from T24 for: ${accountNumber}`);

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

      const data: T24AccountDetailsResponse = await response.json();

      if (!data.body || !Array.isArray(data.body)) {
        console.error("❌ Invalid T24 response: no body array");
        return null;
      }

      console.log(`✅ Fetched details for account ${accountNumber}`);
      return data;
    } catch (error) {
      console.error(`❌ T24 account details fetch failed for ${accountNumber}:`, error);
      return null;
    }
  }

  /**
   * Get formatted account details
   * Returns a simplified object with commonly used fields
   */
  async getAccountDetailsFormatted(accountNumber: string): Promise<{
    ok: boolean;
    data?: {
      accountNumber: string;
      holderName: string;
      categoryId: string;
      categoryName: string;
      accountStatus: string;
      currency: string;
      openingDate: string;
      nickName?: string;
      onlineLimit?: string;
      customer?: {
        id: number;
        firstName: string;
        lastName: string;
        phoneNumber: string;
        email: string;
        dateOfBirth: string;
        street: string;
        town: string;
        maritalStatus: string;
        employmentStatus: string;
      };
    };
    error?: string;
  }> {
    const response = await this.getAccountDetails(accountNumber);

    if (!response || response.body.length === 0) {
      return {
        ok: false,
        error: "Failed to fetch account details from T24",
      };
    }

    const account = response.body[0];
    const accountDetail = account.accountDetails?.[0];
    const customerDetail = account.customerDetails?.[0];

    return {
      ok: true,
      data: {
        accountNumber: accountDetail?.accountID?.[0] || accountNumber,
        holderName: account.holderName || "",
        categoryId: account.categoryId || "", // T24 category ID (e.g., "1001", "6015")
        categoryName: account.categoryName || "",
        accountStatus: account.accountStatus || "",
        currency: accountDetail?.accountCurrency?.[0] || "MWK",
        openingDate: account.openingDate || "",
        nickName: account.nickName,
        onlineLimit: account.onlineLimit,
        customer: customerDetail ? {
          id: account.CUSTOMER || 0,
          firstName: customerDetail.firstName?.[0] || "",
          lastName: customerDetail.lastName?.[0] || "",
          phoneNumber: customerDetail.phoneNumber?.[0] || "",
          email: customerDetail.email?.[0] || "",
          dateOfBirth: customerDetail.dateOfBirth?.[0] || "",
          street: customerDetail.street?.[0] || "",
          town: customerDetail.townCountry?.[0] || "",
          maritalStatus: customerDetail.maritalStatus?.[0] || "",
          employmentStatus: customerDetail.employmentStatus?.[0] || "",
        } : undefined,
      },
    };
  }

  /**
   * Test connection by fetching test account details
   */
  async testConnection(): Promise<boolean> {
    try {
      const testAccount = process.env.T24_TEST_ACCOUNT || "1520000114607";
      const data = await this.getAccountDetails(testAccount);
      return data !== null && data.body.length > 0;
    } catch (error) {
      console.error("❌ T24 account details connection test failed:", error);
      return false;
    }
  }
}

// Singleton instance
export const t24AccountDetailsService = new T24AccountDetailsService();
