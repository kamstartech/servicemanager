import { XMLParser } from "fast-xml-parser";
import { fetchIPv4 } from "@/lib/utils/fetch-ipv4";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true, // easier to traverse (soapenv:Body -> Body)
});

type AuthConfig =
  | { type: "basic"; username: string; password: string }
  | { type: "bearer"; token: string }
  | { type: "api_key"; apiKey: string }
  | null
  | undefined;

export type AirtimeTopupHttpResult = {
  ok: boolean;
  status: number;
  statusText?: string;
  raw: string;
  data?: any;
  error?: string;
};

function tryParseJson(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function tryParseXml(text: string) {
  const trimmed = text.trim();
  if (!trimmed || !trimmed.startsWith("<")) return null;
  try {
    return xmlParser.parse(trimmed);
  } catch {
    return null;
  }
}

function resolveBaseUrl(fallback?: string) {
  return (
    process.env.T24_ESB_URL ||
    process.env.T24_BASE_URL ||
    fallback ||
    "https://fdh-esb.ngrok.dev"
  );
}

function resolveAuthHeaders(auth: AuthConfig): Record<string, string> {
  if (auth?.type === "basic") {
    const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString(
      "base64"
    );
    return { Authorization: `Basic ${credentials}` };
  }

  if (auth?.type === "bearer") {
    return { Authorization: `Bearer ${auth.token}` };
  }

  if (auth?.type === "api_key") {
    return {
      apikey: auth.apiKey,
      "X-API-Key": auth.apiKey,
    };
  }

  const apiKey =
    process.env.ESB_APIKEY ||
    process.env.ESB_API_KEY ||
    "";

  if (apiKey) {
    return {
      apikey: apiKey,
      "X-API-Key": apiKey,
    };
  }

  const bearer = process.env.ESB_BEARER_TOKEN || "";

  if (bearer) {
    return { Authorization: `Bearer ${bearer}` };
  }

  const username = process.env.T24_USERNAME || "";
  const password = process.env.T24_PASSWORD || "";

  if (username && password) {
    const credentials = Buffer.from(`${username}:${password}`).toString("base64");
    return { Authorization: `Basic ${credentials}` };
  }

  return {};
}

export class ESBAirtimeTopupService {
  private baseUrl: string;
  private authHeaders: Record<string, string>;

  constructor(opts?: { baseUrl?: string; authentication?: AuthConfig }) {
    this.baseUrl = resolveBaseUrl(opts?.baseUrl);
    this.authHeaders = resolveAuthHeaders(opts?.authentication);
  }

  async postXml(
    endpointWithQuery: string,
    xml: string,
    extraHeaders?: Record<string, string>
  ): Promise<AirtimeTopupHttpResult> {
    const url = `${this.baseUrl}${endpointWithQuery}`;

    const response = await fetchIPv4(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
        ...this.authHeaders,
        ...extraHeaders,
      },
      body: xml,
    });

    const raw = await response.text();
    const data = tryParseJson(raw);
    const xmlData = !data ? tryParseXml(raw) : null;

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;

      if (data) {
        errorMessage = data.message || data.error || data.description || errorMessage;
      } else if (xmlData) {
        // Common XML Error patterns
        // 1. SOAP Fault
        if (xmlData.Envelope?.Body?.Fault) {
          const fault = xmlData.Envelope.Body.Fault;
          errorMessage = fault.faultstring || fault.faultcode || errorMessage;
        }
        // 2. Airtel/Generic Command Response
        else if (xmlData.COMMAND) {
          errorMessage =
            xmlData.COMMAND.MESSAGE ||
            xmlData.COMMAND.TXNSTATUS ||
            xmlData.COMMAND.Message ||
            errorMessage;
        }
        // 3. Simple Error Tag
        else if (xmlData.Error) {
          errorMessage = xmlData.Error.Message || xmlData.Error || errorMessage;
        }
        // 4. Response with Status/Message
        else if (xmlData.Response?.Message) {
          errorMessage = xmlData.Response.Message;
        }
      }

      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
        raw,
        data: data ?? xmlData ?? undefined,
        error: errorMessage,
      };
    } else {
      // Also check if sucessful HTTP response contains business logic error (common in legacy XML APIs)
      if (xmlData) {
        // Airtel example: <COMMAND><TXNSTATUS>200</TXNSTATUS><MESSAGE>Success</MESSAGE></COMMAND>
        // Need to check specific provider patterns if needed, but for now assuming HTTP OK = Success
        // unless we see specific error flags.
        // Often HTTP 200 returns <COMMAND><TXNSTATUS>FAILED</TXNSTATUS>...
        if (xmlData.COMMAND && xmlData.COMMAND.TXNSTATUS && String(xmlData.COMMAND.TXNSTATUS) !== "200" && String(xmlData.COMMAND.TXNSTATUS) !== "SUCCESS") {
          return {
            ok: false,
            status: 400, // Treat as client error
            statusText: "Business Logic Error",
            raw,
            data: xmlData,
            error: xmlData.COMMAND.MESSAGE || `Transaction Failed: ${xmlData.COMMAND.TXNSTATUS}`
          };
        }
      }
    }

    return {
      ok: true,
      status: response.status,
      statusText: response.statusText,
      raw,
      data: data ?? xmlData ?? undefined,
    };
  }
}
