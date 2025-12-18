import { ESBAirtimeTopupService } from "./topup";

export type AirtimeProvider = "AIRTEL" | "TNM";

export interface AirtimeParams {
    msisdn: string;
    amount: number;
    externalTxnId?: string;
    bundleId?: string;
    metadata?: any;
}

export class AirtimeService {
    private esb: ESBAirtimeTopupService;

    constructor() {
        this.esb = new ESBAirtimeTopupService();
    }

    private generateTransactionId(provider: AirtimeProvider) {
        const prefix = provider === "AIRTEL" ? "AIR" : "TNM";
        return `${prefix}${Date.now()}`;
    }

    /**
     * Performs an Airtel airtime recharge
     */
    async airtelRecharge(params: AirtimeParams) {
        const msisdn = params.msisdn.trim().replace(/^\+/, "");
        const extRefNum = params.externalTxnId || this.generateTransactionId("AIRTEL");
        const username = process.env.AIRTEL_ESB_USERNAME || "ups";
        const password = process.env.AIRTEL_ESB_PASSWORD || "a0558c";

        // Airtel expects DD/MM/YYYY HH:mm:ss
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(
            now.getMonth() + 1
        ).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(
            2,
            "0"
        )}:${String(now.getMinutes()).padStart(2, "0")}:${String(
            now.getSeconds()
        ).padStart(2, "0")}`;

        const endpoint = "/api/esb/topup/airtel/v1/C2SReceiver";

        // Build URL with query params
        const queryParams = new URLSearchParams({
            REQUEST_GATEWAY_CODE: "TGW",
            REQUEST_GATEWAY_TYPE: "TGW",
            LOGIN: username,
            PASSWORD: password,
            SOURCE_TYPE: "EXT",
            SERVICE_PORT: "190",
            MSISDN: msisdn,
            AMOUNT: params.amount.toString(),
        });

        const urlWithParams = `${endpoint}?${queryParams.toString()}`;

        // Build XML body
        const xml = `<?xml version="1.0"?>
<COMMAND>
    <TYPE>EXRCTRFREQ</TYPE>
    <DATE>${dateStr}</DATE>
    <EXTNWCODE>MW</EXTNWCODE>
    <MSISDN>994123863</MSISDN>
    <PIN>1234567890123456</PIN>
    <LOGINID></LOGINID>
    <PASSWORD></PASSWORD>
    <EXTCODE></EXTCODE>
    <EXTREFNUM>${extRefNum}</EXTREFNUM>
    <MSISDN2>${msisdn}</MSISDN2>
    <AMOUNT>${params.amount}</AMOUNT>
    <LANGUAGE1>0</LANGUAGE1>
    <LANGUAGE2>0</LANGUAGE2>
    <SELECTOR>1</SELECTOR>
</COMMAND>`;

        return this.esb.postXml(urlWithParams, xml);
    }

    /**
     * Performs a TNM airtime or bundle recharge
     */
    async tnmRecharge(params: AirtimeParams) {
        const msisdn = params.msisdn.trim().replace(/^\+/, "");
        const externalTxnId = params.externalTxnId || this.generateTransactionId("TNM");
        const username = process.env.TNM_ESB_USERNAME || "sidlee";
        const password = process.env.TNM_ESB_PASSWORD || "sidlee";

        // TNM expects ISO format without milliseconds and Z suffix: YYYY-MM-DDTHH:mm:ss
        const requestTime = new Date().toISOString().split(".")[0];

        const endpoint = "/api/esb/topup/tnm/v1/ERSTopup";

        // Parameters for the recharge
        const rechargeParamsHtml: string[] = [
            `<Parameter>
                <key>PREPAID</key>
                <value>true</value>
            </Parameter>`
        ];

        if (params.bundleId) {
            rechargeParamsHtml.push(`
            <Parameter>
                <key>BUNDLE_ID</key>
                <value>${params.bundleId}</value>
            </Parameter>`);
        }

        const xml = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:erec="http://erecharge.sixdee.com">
    <soapenv:Header />
    <soapenv:Body>
        <erec:recharge>
            <RechargeRequest>
                <WSUsername>${username}</WSUsername>
                <WSPassword>${password}</WSPassword>
                <ExternalTxnId>${externalTxnId}</ExternalTxnId>
                <RequestTime>${requestTime}</RequestTime>
                <Channel>API</Channel>
                <SenderMsisdn>${params.metadata?.senderMsisdn || "265888800900"}</SenderMsisdn>
                <SenderUserId>${params.metadata?.senderUserId || "5761974728"}</SenderUserId>
                <Pin>3026</Pin>
                <SubscriberMsisdn>${msisdn}</SubscriberMsisdn>
                <Amount>${params.amount}</Amount>
                <ExternalSystem>p1</ExternalSystem>
                <Parameters>
                    ${rechargeParamsHtml.join("\n")}
                </Parameters>
                <Prefix>LMN</Prefix>
                <Additionalnfo>LMN Outlaw</Additionalnfo>
            </RechargeRequest>
        </erec:recharge>
    </soapenv:Body>
</soapenv:Envelope>`.trim();

        return this.esb.postXml(endpoint, xml);
    }
}

export const airtimeService = new AirtimeService();
