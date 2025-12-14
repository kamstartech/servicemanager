import { BillerConfig } from "@prisma/client";

export interface AccountDetails {
  accountNumber: string;
  customerName: string;
  balance?: string;
  status: string;
  billerDetails?: Record<string, any>;
}

export interface PaymentParams {
  accountNumber: string;
  amount: string | number;
  currency?: string;
  accountType?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  externalReference?: string;
  message?: string;
  error?: string;
  data?: Record<string, any>;
}

export interface Invoice {
  invoiceNumber: string;
  accountNumber: string;
  amount: string;
  dueDate?: string;
  description?: string;
  details?: Record<string, any>;
}

export interface InvoiceConfirmParams {
  invoiceNumber: string;
  accountNumber: string;
  amount: string;
  currency?: string;
}

export interface Bundle {
  bundleId: string;
  name: string;
  description: string;
  amount: string;
  validity?: string;
  dataAmount?: string;
}

export interface BundlePurchaseParams {
  bundleId: string;
  accountNumber: string;
  amount: string;
}

/**
 * Base class for all biller service implementations
 */
export abstract class BaseBillerService {
  protected config: BillerConfig;

  constructor(config: BillerConfig) {
    this.config = config;
  }

  /**
   * Lookup account details from the biller
   */
  abstract lookupAccount(
    accountNumber: string,
    accountType?: string
  ): Promise<AccountDetails>;

  /**
   * Process payment to the biller
   */
  abstract processPayment(params: PaymentParams): Promise<PaymentResult>;

  /**
   * Make HTTP request to biller API
   */
  protected async makeRequest(
    endpoint: string,
    body: any,
    options?: {
      method?: string;
      headers?: Record<string, string>;
      timeout?: number;
    }
  ): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const timeout = options?.timeout || this.config.timeoutMs;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/xml",
        ...this.getAuthHeaders(),
        ...options?.headers,
      };

      const fetchOptions: RequestInit = {
        method: options?.method || "POST",
        headers,
        signal: controller.signal,
      };

      // Only add body for POST/PUT/PATCH requests
      if (body && (options?.method !== "GET" && options?.method !== "HEAD")) {
        fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        return await response.json();
      } else if (contentType?.includes("application/xml") || contentType?.includes("text/xml")) {
        return await response.text();
      } else {
        return await response.text();
      }
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Get authentication headers based on config
   */
  protected getAuthHeaders(): Record<string, string> {
    const auth = this.config.authentication as any;

    if (!auth) {
      return {};
    }

    if (auth.type === "basic") {
      const credentials = Buffer.from(
        `${auth.username}:${auth.password}`
      ).toString("base64");
      return {
        Authorization: `Basic ${credentials}`,
      };
    }

    if (auth.type === "api_key") {
      return {
        "X-API-Key": auth.apiKey,
      };
    }

    if (auth.type === "bearer") {
      return {
        Authorization: `Bearer ${auth.token}`,
      };
    }

    return {};
  }

  /**
   * Retry logic for failed requests
   */
  protected async retryRequest<T>(
    fn: () => Promise<T>,
    maxRetries: number = this.config.retryAttempts
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error("Request failed after retries");
  }

  /**
   * Validate account number format
   */
  protected validateAccountNumber(accountNumber: string): boolean {
    const rules = this.config.validationRules as any;

    if (rules.accountNumberFormat) {
      const regex = new RegExp(rules.accountNumberFormat);
      return regex.test(accountNumber);
    }

    return true;
  }

  /**
   * Validate amount
   */
  protected validateAmount(amount: number): boolean {
    const rules = this.config.validationRules as any;

    if (rules.minAmount !== undefined && amount < rules.minAmount) {
      return false;
    }

    if (rules.maxAmount !== undefined && amount > rules.maxAmount) {
      return false;
    }

    return true;
  }
}
