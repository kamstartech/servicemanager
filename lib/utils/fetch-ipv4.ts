/**
 * IPv4 Fetch Utility
 * 
 * Custom fetch implementation that forces IPv4 connections.
 * Fixes Docker network IPv6 issues with external HTTPS requests.
 * 
 * This module is Node.js only and should be imported dynamically
 * to avoid Edge Runtime warnings.
 */

import https from "https";

export async function fetchIPv4(url: string, options: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || "GET",
      headers: options.headers as Record<string, string>,
      family: 4, // Force IPv4 - KEY FIX for Docker
    };

    const req = https.request(requestOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          ok: res.statusCode! >= 200 && res.statusCode! < 300,
          status: res.statusCode!,
          statusText: res.statusMessage!,
          json: async () => JSON.parse(data),
          text: async () => data,
        } as Response);
      });
    });

    req.on("error", reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}
