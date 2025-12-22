/**
 * T24 Statement Service
 * 
 * Retrieves account statements (transaction history) from T24 ESB
 */

import { fetchIPv4 } from "@/lib/utils/fetch-ipv4";

export interface T24StatementRequestParams {
    accountNumber: string;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
}

export interface T24StatementTransaction {
    date: string; // Transaction date
    valueDate: string; // Value date
    description: string;
    debit?: number;
    credit?: number;
    balance: number;
    reference: string;
    narration?: string;
}

export interface T24StatementResponse {
    success: boolean;
    transactions: T24StatementTransaction[];
    openingBalance?: number;
    closingBalance?: number;
    currency: string;
    message?: string;
    errorCode?: string;
}

export class T24StatementService {
    private baseUrl: string;
    private credentials: string;

    constructor() {
        this.baseUrl =
            process.env.T24_ESB_URL ||
            process.env.T24_BASE_URL ||
            process.env.T24_API_URL ||
            "https://fdh-esb.ngrok.dev";

        const username = process.env.T24_USERNAME || "";
        const password = process.env.T24_PASSWORD || "";
        this.credentials = Buffer.from(`${username}:${password}`).toString("base64");
    }

    /**
     * Get account statement from T24
     */
    async getAccountStatement(
        params: T24StatementRequestParams
    ): Promise<T24StatementResponse> {
        try {
            const endpointPath = "/api/esb/statement/1.0/get";
            const url = `${this.baseUrl}${endpointPath}`;

            console.log("[T24StatementService] Fetching statement from T24 ESB", {
                url,
                accountNumber: params.accountNumber,
                startDate: params.startDate,
                endDate: params.endDate,
            });

            const response = await fetchIPv4(url, {
                method: "POST",
                headers: {
                    Accept: "*/*",
                    "Content-Type": "application/json",
                    Authorization: `Basic ${this.credentials}`,
                },
                body: JSON.stringify({
                    header: {},
                    body: {
                        accountNumber: params.accountNumber,
                        startDate: params.startDate,
                        endDate: params.endDate,
                    },
                }),
            });

            const responseText = await response.text();
            let responseJson: any = null;

            try {
                responseJson = responseText ? JSON.parse(responseText) : null;
            } catch (e) {
                console.error("[T24StatementService] Failed to parse response", e);
                responseJson = null;
            }

            if (!response.ok) {
                const errorCode =
                    responseJson?.code ||
                    responseJson?.errorCode ||
                    responseJson?.error?.code ||
                    "T24_STATEMENT_ERROR";
                const message =
                    responseJson?.description ||
                    responseJson?.message ||
                    responseJson?.error ||
                    responseJson?.error_description ||
                    response.statusText ||
                    "Failed to fetch statement from T24";

                console.error("[T24StatementService] T24 statement fetch failed", {
                    status: response.status,
                    errorCode,
                    message,
                    response: responseJson ?? responseText,
                });

                return {
                    success: false,
                    transactions: [],
                    currency: "MWK",
                    message,
                    errorCode,
                };
            }

            // Parse T24 response
            const transactions = this.parseT24Transactions(responseJson);
            const openingBalance = responseJson?.body?.openingBalance;
            const closingBalance = responseJson?.body?.closingBalance;
            const currency = responseJson?.body?.currency || "MWK";

            console.log("[T24StatementService] Statement retrieved successfully", {
                transactionCount: transactions.length,
                openingBalance,
                closingBalance,
            });

            return {
                success: true,
                transactions,
                openingBalance,
                closingBalance,
                currency,
            };
        } catch (error) {
            console.error("[T24StatementService] Statement fetch error:", error);
            return {
                success: false,
                transactions: [],
                currency: "MWK",
                message: error instanceof Error ? error.message : "Unknown error",
                errorCode: "T24_ERROR",
            };
        }
    }

    /**
     * Parse T24 transaction response into our format
     */
    private parseT24Transactions(responseJson: any): T24StatementTransaction[] {
        try {
            const rawTransactions =
                responseJson?.body?.transactions ||
                responseJson?.transactions ||
                [];

            return rawTransactions.map((tx: any) => ({
                date: tx.transactionDate || tx.date || "",
                valueDate: tx.valueDate || tx.date || "",
                description: tx.description || tx.narrative || "",
                debit: tx.debitAmount ? parseFloat(tx.debitAmount) : undefined,
                credit: tx.creditAmount ? parseFloat(tx.creditAmount) : undefined,
                balance: parseFloat(tx.balance || tx.runningBalance || "0"),
                reference: tx.reference || tx.transactionId || "",
                narration: tx.narration || tx.description || "",
            }));
        } catch (error) {
            console.error("[T24StatementService] Failed to parse transactions", error);
            return [];
        }
    }
}

// Export singleton instance
export const t24StatementService = new T24StatementService();
