import { NextResponse } from "next/server";
import { ESBAirtimeTopupService } from "@/lib/services/airtime/topup";

function normalizePhoneNumber(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/^\+/, "");
}

function generateTransactionId() {
  return `TNM${Date.now()}`;
}

function buildRechargeXml(opts: {
  msisdn: string;
  amount: number;
  bundleId: string;
  externalTxnId?: string;
  senderMsisdn?: string;
  senderUserId?: string;
  wsUsername?: string;
  wsPassword?: string;
}) {
  const externalTxnId = opts.externalTxnId || generateTransactionId();
  const senderMsisdn = opts.senderMsisdn || "265888800900";
  const senderUserId = opts.senderUserId || "5761974728";
  const wsUsername = opts.wsUsername || "sidlee";
  const wsPassword = opts.wsPassword || "sidlee";

  return `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:erec="http://erecharge.sixdee.com">
    <soapenv:Header />
    <soapenv:Body>
        <erec:recharge>
            <RechargeRequest>
                <WSUsername>${wsUsername}</WSUsername>
                <WSPassword>${wsPassword}</WSPassword>
                <ExternalTxnId>${externalTxnId}</ExternalTxnId>
                <RequestTime>${new Date().toISOString()}</RequestTime>
                <Channel>API</Channel>
                <SenderMsisdn>${senderMsisdn}</SenderMsisdn>
                <SenderUserId>${senderUserId}</SenderUserId>
                <Pin>3026</Pin>
                <SubscriberMsisdn>${opts.msisdn}</SubscriberMsisdn>
                <Amount>${opts.amount}</Amount>
                <ExternalSystem>p1</ExternalSystem>
                <Parameters>
                    <Parameter>
                        <key>PREPAID</key>
                        <value>true</value>
                    </Parameter>
                    <Parameter>
                        <key>BUNDLE_ID</key>
                        <value>${opts.bundleId}</value>
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

export async function POST(request: Request) {
  console.log("[TnmTest] Received recharge request");
  try {
    const body = await request.json();

    const msisdn = normalizePhoneNumber(body.phoneNumber ?? body.msisdn ?? body.accountNumber);
    const amount = 1;
    const bundleId = String(body.bundleId || body.packageId || "").trim();

    if (!msisdn) {
      return NextResponse.json(
        { success: false, error: "phoneNumber is required" },
        { status: 400 }
      );
    }

    const { airtimeService } = require("@/lib/services/airtime/airtime-service");
    const res = await airtimeService.tnmRecharge({
      msisdn,
      amount,
      bundleId: bundleId || undefined,
      externalTxnId: body.externalTxnId,
      metadata: { ...body },
    });

    if (!res.ok) {
      return NextResponse.json({
        success: false,
        status: res.status,
        error: res.error || `HTTP ${res.status}`,
        message: res.error || `HTTP ${res.status}`,
        raw: res.raw,
        parsed: res.data,
      });
    }

    return NextResponse.json({
      success: true,
      status: res.status,
      message: `TNM airtime/bundle purchase request sent via AirtimeService${bundleId ? ' (Bundle: ' + bundleId + ')' : ''}`,
      raw: res.raw,
      parsed: res.data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
