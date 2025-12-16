import { BillerConfig } from "@prisma/client";
import {
    BaseBillerService,
    Bundle,
    BundlePurchaseParams,
    PaymentResult,
    AccountDetails
} from "../base";

/**
 * TNM Biller Service (SOAP/XML)
 * Replicates logic from tnm_recharge_builder.ex
 */
export class TnmBillerService extends BaseBillerService {
    constructor(config: BillerConfig) {
        super(config);
    }

    async lookupAccount(accountNumber: string): Promise<AccountDetails> {
        // TNM validation is implicit or done via separate lookup if supported
        // For now, we return valid if format is correct
        if (!this.validateAccountNumber(accountNumber)) {
            throw new Error("Invalid phone number format");
        }
        return {
            accountNumber,
            customerName: "TNM Subscriber",
            status: "active",
            billerDetails: { phoneNumber: accountNumber }
        };
    }

    async processPayment(params: any): Promise<PaymentResult> {
        // TNM usually bundle based for this integration, but if direct airtime is needed:
        throw new Error("Direct airtime implementation pending. Use purchaseBundle.");
    }

    async getBundleDetails(bundleId: string): Promise<Bundle> {
        // Assuming we can use the same endpoint structure as mapped in Elixir
        // http://172.25.131.190:5002/api/internetbundles/#{bundle_id}
        const endpoints = this.config.endpoints as any;
        const endpoint = (endpoints.bundleDetails || "/api/internetbundles/{bundle_id}").replace("{bundle_id}", bundleId);

        try {
            const response = await this.retryRequest(() =>
                this.makeRequest(endpoint, null, {
                    method: "GET",
                    headers: { "Accept": "application/json" } // This part of TNM API seems REST-ish in Elixir
                })
            );
            return this.parseBundleResponse(response);
        } catch (e: any) {
            throw new Error(`Failed to get bundle details: ${e.message}`);
        }
    }

    async purchaseBundle(params: BundlePurchaseParams): Promise<PaymentResult> {
        // Logic from TnmRechargeBuilder.build/1
        const xmlPayload = this.buildRechargeXml(params);
        const endpoints = this.config.endpoints as any;
        // Default from builder: /api/esb/topup/tnm/v1/ERSTopup
        const endpoint = endpoints.purchase || "/api/esb/topup/tnm/v1/ERSTopup";

        try {
            const response = await this.retryRequest(() =>
                this.makeRequest(endpoint, xmlPayload, {
                    method: "POST",
                    headers: {
                        "Content-Type": "text/xml",
                        // Auth handled by getAuthHeaders in base
                    }
                })
            );
            return this.parseSoapResponse(response);
        } catch (error: any) {
            return {
                success: false,
                message: `TNM Purchase failed: ${error.message}`
            };
        }
    }

    private buildRechargeXml(params: BundlePurchaseParams): string {
        const externalTxnId = this.generateTransactionId(); // Or passed in params
        // Hardcoded values from Elixir builder for compatibility
        const senderMsisdn = (params as any).senderMsisdn || "265888800900"; // Should come from config or params
        const senderUserId = (params as any).senderUserId || "5761974728";

        return `
          <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:erec="http://erecharge.sixdee.com">
              <soapenv:Header />
              <soapenv:Body>
                  <erec:recharge>
                      <RechargeRequest>
                          <WSUsername>sidlee</WSUsername>
                          <WSPassword>sidlee</WSPassword>
                          <ExternalTxnId>${externalTxnId}</ExternalTxnId>
                          <RequestTime>${new Date().toISOString()}</RequestTime>
                          <Channel>API</Channel>
                          <SenderMsisdn>${senderMsisdn}</SenderMsisdn>
                          <SenderUserId>${senderUserId}</SenderUserId>
                          <Pin>3026</Pin>
                          <SubscriberMsisdn>${params.accountNumber}</SubscriberMsisdn>
                          <Amount>${params.amount}</Amount>
                          <ExternalSystem>p1</ExternalSystem>
                          <Parameters>
                              <Parameter>
                                  <key>PREPAID</key>
                                  <value>true</value>
                              </Parameter>
                              <Parameter>
                                  <key>BUNDLE_ID</key>
                                  <value>${params.bundleId}</value>
                              </Parameter>
                          </Parameters>
                          <Prefix>LMN</Prefix>
                          <Additionalnfo>LMN Outlaw</Additionalnfo>
                      </RechargeRequest>
                  </erec:recharge>
              </soapenv:Body>
          </soapenv:Envelope>
      `.trim();
    }

    private parseSoapResponse(xml: string): PaymentResult {
        // Basic regex check for success until we implement full XML parser
        // Looking for <txnstatus>200</txnstatus> or similar in SixDee response
        const isSuccess = xml.includes("<txnstatus>200</txnstatus>") || xml.includes("SUCCESS");
        const message = this.extractXmlValue(xml, "message") || "Processed";
        const txnId = this.extractXmlValue(xml, "transactionid");

        return {
            success: isSuccess,
            message,
            transactionId: txnId || undefined,
            data: { rawResponse: xml }
        };
    }

    private parseBundleResponse(response: any): Bundle {
        // Reusing bundle parsing logic for the definitions part
        const data = typeof response === "string" ? JSON.parse(response) : response;
        return {
            bundleId: data.bundle_id || data.bundleId || "",
            name: data.name || data.bundle_name || "",
            description: data.description || "",
            amount: data.amount?.toString() || "0",
            validity: data.validity,
            dataAmount: data.data_amount,
        };
    }

    // Helper to reuse base private method if needed, or re-implement
    private extractXmlValue(xml: string, tagName: string): string | null {
        const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, "i");
        const match = xml.match(regex);
        return match ? match[1].trim() : null;
    }

    private generateTransactionId(): string {
        return `EXT${Date.now()}`;
    }
}
