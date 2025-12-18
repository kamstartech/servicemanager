import { BillerConfig } from "@prisma/client";
import {
    BaseBillerService,
    AccountDetails,
    PaymentParams,
    PaymentResult
} from "../base";
import { ESBAirtimeTopupService } from "../../airtime/topup";

/**
 * Airtel Biller Service (Custom XML)
 * Replicates logic from airtel_recharge_builder.ex
 */
export class AirtelBillerService extends BaseBillerService {
    constructor(config: BillerConfig) {
        super(config);
    }

    async lookupAccount(accountNumber: string): Promise<AccountDetails> {
        // Replicates AirtelRechargeBuilder.get_details_url
        // "http://172.25.131.190:7055/api/airtel-validation/accounts/#{account_number}"
        const endpoints = this.config.endpoints as any;
        const endpoint = (endpoints.validation || "/api/airtel-validation/accounts/{account_number}")
            .replace("{account_number}", accountNumber);

        try {
            const response = await this.makeRequest(endpoint, null, { method: "GET" });
            // Response here seems to be JSON based on previous analysis of the validation service
            // The Recharge is XML, but validation might be a separate local wrapper?
            // Elixir: AirtelResponseParser.account_lookup_response_parse
            return this.parseValidationResponse(response, accountNumber);
        } catch (e: any) {
            throw new Error(`Airtel validation failed: ${e.message}`);
        }
    }

    async processPayment(params: PaymentParams): Promise<PaymentResult> {
        const xmlPayload = this.buildRechargeXml(params);
        const endpoints = this.config.endpoints as any;
        // Default: /api/esb/topup/airtel/v1/C2SReceiver
        const baseUrlEndpoint = "/api/esb/topup/airtel/v1/C2SReceiver";

        const endpoint = endpoints?.purchase || baseUrlEndpoint;

        // Airtel builder appends query params to the URL even for POST!
        const urlWithParams = this.buildUrlWithParams(endpoint, params);

        try {
            const esb = new ESBAirtimeTopupService({
                baseUrl: this.config.baseUrl,
                authentication: this.config.authentication as any,
            });

            const res = await this.retryRequest(() =>
                esb.postXml(urlWithParams, xmlPayload, {
                    "Content-Type": "text/xml",
                })
            );

            if (!res.ok) {
                return {
                    success: false,
                    error: res.error || `HTTP ${res.status}`,
                    message: res.error || `HTTP ${res.status}`,
                    data: {
                        status: res.status,
                        rawResponse: res.raw,
                        parsed: res.data,
                    },
                };
            }

            const parsed = this.parseXmlResponse(res.raw);
            return {
                ...parsed,
                data: {
                    ...(parsed.data || {}),
                    httpStatus: res.status,
                    rawHttpResponse: res.raw,
                    parsedHttpResponse: res.data,
                },
            };
        } catch (error: any) {
            const msg = `Airtel Purchase failed: ${error.message}`;
            return {
                success: false,
                error: msg,
                message: msg
            };
        }
    }

    private buildUrlWithParams(endpoint: string, params: PaymentParams): string {
        // Replicates AirtelRechargeBuilder.build_url/1 logic
        // Note: In real implementation, these constants (TGW, etc) should probably be in config
        const queryParams = new URLSearchParams({
            REQUEST_GATEWAY_CODE: "TGW",
            REQUEST_GATEWAY_TYPE: "TGW",
            LOGIN: "ups", // Should come from config
            PASSWORD: "pw", // Should come from config
            SOURCE_TYPE: "EXT",
            SERVICE_PORT: "190",
            MSISDN: params.accountNumber,
            AMOUNT: params.amount.toString()
        });
        return `${endpoint}?${queryParams.toString()}`;
    }

    private buildRechargeXml(params: PaymentParams): string {
        // Replicates AirtelRechargeBuilder.build_body/1
        const dateStr = new Date().toISOString()
            .replace(/T/, ' ')
            .replace(/\..+/, ''); // Format: YYYY-MM-DD HH:mm:ss approx

        return `<?xml version="1.0"?>
      <COMMAND>
          <TYPE>EXRCTRFREQ</TYPE>
          <DATE>${dateStr}</DATE>
          <EXTNWCODE>MW</EXTNWCODE>
          <MSISDN>994123863</MSISDN> 
          <PIN>1234567890123456</PIN>
          <LOGINID></LOGINID>
          <PASSWORD></PASSWORD>
          <EXTCODE></EXTCODE>
          <EXTREFNUM>${this.generateTransactionId()}</EXTREFNUM>
          <MSISDN2>${params.accountNumber}</MSISDN2>
          <AMOUNT>${params.amount}</AMOUNT>
          <LANGUAGE1>0</LANGUAGE1>
          <LANGUAGE2>0</LANGUAGE2>
          <SELECTOR>1</SELECTOR>
      </COMMAND>`;
        // Note: MSISDN/PIN above seem hardcoded in legacy code samples too? 
        // We should likely move them to config.
    }

    private parseXmlResponse(xml: string): PaymentResult {
        // Logic from AirtelResponseParser
        const txnStatus = this.extractXmlValue(xml, "TXNSTATUS");
        const message = this.extractXmlValue(xml, "MESSAGE");
        const txnId = this.extractXmlValue(xml, "TXNID");

        const success = txnStatus === "200";

        return {
            success,
            message: message || "Completed",
            transactionId: txnId || undefined,
            data: { rawResponse: xml }
        };
    }

    private parseValidationResponse(response: any, accountNumber: string): AccountDetails {
        const data = typeof response === "string" ? JSON.parse(response) : response;
        // Adjust based on actual response shape
        return {
            accountNumber,
            customerName: data.name || data.customerName || "Airtel User",
            status: "active",
            billerDetails: data
        };
    }

    private extractXmlValue(xml: string, tagName: string): string | null {
        const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, "i");
        const match = xml.match(regex);
        return match ? match[1].trim() : null;
    }

    private generateTransactionId(): string {
        return `AIR${Date.now()}`;
    }
}
