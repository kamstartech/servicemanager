import { NextResponse } from "next/server";
import { ESBAirtimeTopupService } from "@/lib/services/airtime/topup";

function normalizePhoneNumber(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/^\+/, "");
}

function isAirtelMsisdn(msisdn: string) {
  return /^(?:0?99[0-9]{7}|26599[0-9]{7})$/.test(msisdn);
}

function generateTransactionId() {
  return `AIR${Date.now()}`;
}

function buildUrlWithParams(endpoint: string, opts: { msisdn: string; amount: number; login?: string; password?: string }) {
  const queryParams = new URLSearchParams({
    REQUEST_GATEWAY_CODE: "TGW",
    REQUEST_GATEWAY_TYPE: "TGW",
    LOGIN: opts.login || "ups",
    PASSWORD: opts.password || "pw",
    SOURCE_TYPE: "EXT",
    SERVICE_PORT: "190",
    MSISDN: opts.msisdn,
    AMOUNT: opts.amount.toString(),
  });

  return `${endpoint}?${queryParams.toString()}`;
}

function buildRechargeXml(opts: { msisdn: string; amount: number; extRefNum?: string }) {
  const dateStr = new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");

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
    <EXTREFNUM>${opts.extRefNum || generateTransactionId()}</EXTREFNUM>
    <MSISDN2>${opts.msisdn}</MSISDN2>
    <AMOUNT>${opts.amount}</AMOUNT>
    <LANGUAGE1>0</LANGUAGE1>
    <LANGUAGE2>0</LANGUAGE2>
    <SELECTOR>1</SELECTOR>
</COMMAND>`;
}

export async function POST(request: Request) {
  console.log("[AirtelTest] Received recharge request");
  try {
    const body = await request.json();

    const msisdn = normalizePhoneNumber(body.phoneNumber ?? body.msisdn ?? body.accountNumber);
    const amount = 1;

    if (!msisdn) {
      return NextResponse.json(
        { success: false, error: "phoneNumber is required" },
        { status: 400 }
      );
    }

    if (!isAirtelMsisdn(msisdn)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Airtel MSISDN format. Use 099XXXXXXX or 26599XXXXXXX (do not use TNM 088/26588 numbers).",
        },
        { status: 400 }
      );
    }

    const { airtimeService } = require("@/lib/services/airtime/airtime-service");
    const res = await airtimeService.airtelRecharge({
      msisdn,
      amount,
      externalTxnId: body.extRefNum,
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
      message: "Airtel airtime topup request sent via AirtimeService",
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
