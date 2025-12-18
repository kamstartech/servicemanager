import { fetchIPv4 } from "@/lib/utils/fetch-ipv4";

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

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
        raw,
        data: data ?? undefined,
        error:
          (data && (data.message || data.error || data.description)) ||
          raw ||
          `HTTP ${response.status}`,
      };
    }

    return {
      ok: true,
      status: response.status,
      statusText: response.statusText,
      raw,
      data: data ?? undefined,
    };
  }
}
