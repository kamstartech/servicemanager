import { prisma } from "@/lib/db/prisma";
import { Agent } from "undici";

export const coreBankingConnectionResolvers = {
  Query: {
    async coreBankingConnections() {
      const connections = await prisma.coreBankingConnection.findMany({
        orderBy: { createdAt: "desc" },
      });

      return connections.map((c: any) => ({
        id: c.id,
        name: c.name,
        username: c.username,
        baseUrl: c.baseUrl,
        isActive: c.isActive,
        authType: c.authType,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        lastTestedAt: c.lastTestedAt ? c.lastTestedAt.toISOString() : null,
        lastTestOk: c.lastTestOk,
        lastTestMessage: c.lastTestMessage,
      }));
    },
    async coreBankingConnection(_parent: unknown, args: { id: string }) {
      const id = parseInt(args.id, 10);
      const c = await prisma.coreBankingConnection.findUnique({ where: { id } });
      if (!c) return null;

      return {
        id: c.id,
        name: c.name,
        username: c.username,
        baseUrl: c.baseUrl,
        isActive: c.isActive,
        authType: c.authType,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        lastTestedAt: c.lastTestedAt ? c.lastTestedAt.toISOString() : null,
        lastTestOk: c.lastTestOk,
        lastTestMessage: c.lastTestMessage,
      };
    },
  },
  Mutation: {
    async createCoreBankingConnection(
      _parent: unknown,
      args: {
        input: {
          name: string;
          username?: string | null;
          password?: string | null;
          baseUrl: string;
          isActive?: boolean | null;
          authType?: "BASIC" | "BEARER" | null;
          token?: string | null;
        };
      },
    ) {
      const c = await prisma.coreBankingConnection.create({
        data: {
          name: args.input.name.trim(),
          username: (args.input.username ?? "").trim(),
          password: args.input.password ?? "",
          baseUrl: args.input.baseUrl.trim(),
          isActive: args.input.isActive ?? true,
          authType: (args.input.authType as any) ?? "BASIC",
          token: args.input.token ?? null,
        },
      });

      return {
        id: c.id,
        name: c.name,
        username: c.username,
        baseUrl: c.baseUrl,
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        lastTestedAt: c.lastTestedAt ? c.lastTestedAt.toISOString() : null,
        lastTestOk: c.lastTestOk,
        lastTestMessage: c.lastTestMessage,
      };
    },
    async updateCoreBankingConnection(
      _parent: unknown,
      args: {
        id: string;
        input: {
          name: string;
          username?: string | null;
          password?: string | null;
          baseUrl: string;
          isActive?: boolean | null;
          authType?: "BASIC" | "BEARER" | null;
          token?: string | null;
        };
      },
    ) {
      const id = parseInt(args.id, 10);

      const c = await prisma.coreBankingConnection.update({
        where: { id },
        data: {
          name: args.input.name.trim(),
          username: (args.input.username ?? "").trim(),
          // Only update password if explicitly provided (non-empty)
          password:
            args.input.password && args.input.password.length > 0
              ? args.input.password
              : undefined,
          baseUrl: args.input.baseUrl.trim(),
          isActive: args.input.isActive ?? true,
          authType: (args.input.authType as any) ?? undefined,
          // Only update token if explicitly provided; empty string means "clear"
          token:
            args.input.token != null
              ? args.input.token.length > 0
                ? args.input.token
                : null
              : undefined,
        },
      });

      return {
        id: c.id,
        name: c.name,
        username: c.username,
        baseUrl: c.baseUrl,
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        lastTestedAt: c.lastTestedAt ? c.lastTestedAt.toISOString() : null,
        lastTestOk: c.lastTestOk,
        lastTestMessage: c.lastTestMessage,
      };
    },
    async deleteCoreBankingConnection(_parent: unknown, args: { id: string }) {
      const id = parseInt(args.id, 10);
      await prisma.coreBankingConnection.delete({ where: { id } });
      return true;
    },
    async testCoreBankingConnection(_parent: unknown, args: { id: string }) {
      const id = parseInt(args.id, 10);

      const connection = await prisma.coreBankingConnection.findUnique({ where: { id } });
      if (!connection) {
        return {
          ok: false,
          message: "Core banking connection not found",
        };
      }

      // Create a custom dispatcher to ignore SSL errors (self-signed certs)
      const dispatcher = new Agent({
        connect: {
          rejectUnauthorized: false,
        },
      });

      let ok = false;
      let message = "";
      let statusCode: number | null = null;
      let statusText: string | null = null;
      let responseBody: string | null = null;
      let requestHeadersJson: string | null = null;

      const method = "GET";
      const url = connection.baseUrl; // Assuming base URL is a valid endpoint to test

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json"
        };

        // Add Auth headers if configured
        if (connection.authType === "BEARER" && connection.token) {
          headers.Authorization = `Bearer ${connection.token}`;
        } else if (connection.username) { // Basic Auth fallback/default
          const auth = Buffer.from(`${connection.username}:${connection.password || ""}`).toString("base64");
          headers.Authorization = `Basic ${auth}`;
        }

        requestHeadersJson = JSON.stringify(headers); // Capture headers for result

        const response = await fetch(url, {
          method,
          headers,
          dispatcher: dispatcher as any // Pass the custom dispatcher
        } as any);

        ok = response.ok;
        statusCode = response.status;
        statusText = response.statusText;
        message = `HTTP ${statusCode} ${statusText}`;
        responseBody = await response.text();

      } catch (error: any) {
        ok = false;
        message = error?.message || "Failed to reach core banking service";
        responseBody = error?.stack || String(error);
      }

      const now = new Date();

      await prisma.$transaction(async (tx) => {
        await tx.coreBankingConnection.update({
          where: { id },
          data: {
            lastTestedAt: now,
            lastTestOk: ok,
            lastTestMessage: message,
          },
        });
      });

      return {
        ok,
        message,
        url,
        method,
        statusCode,
        statusText,
        requestHeadersJson,
        responseBody: responseBody ? responseBody.slice(0, 2000) : null, // Limit body size
      };
    },
  },
};
