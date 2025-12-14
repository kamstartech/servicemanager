import { prisma } from "@/lib/db/prisma";
import { Agent } from "undici";

export const coreBankingEndpointResolvers = {
  CoreBankingConnection: {
    async endpoints(parent: { id: number }) {
      const endpoints = await prisma.coreBankingEndpoint.findMany({
        where: { connectionId: parent.id },
        orderBy: { name: "asc" },
      });

      return endpoints.map((e: any) => ({
        id: e.id,
        connectionId: e.connectionId,
        name: e.name,
        method: e.method,
        path: e.path,
        bodyTemplate: e.bodyTemplate,
        isActive: e.isActive,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      }));
    },
  },
  Query: {
    async coreBankingEndpoints(
      _parent: unknown,
      args: { connectionId: number },
    ) {
      const endpoints = await prisma.coreBankingEndpoint.findMany({
        where: { connectionId: args.connectionId },
        orderBy: { name: "asc" },
      });

      return endpoints.map((e: any) => ({
        id: e.id,
        connectionId: e.connectionId,
        name: e.name,
        path: e.path,
        isActive: e.isActive,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      }));
    },
    async coreBankingEndpoint(_parent: unknown, args: { id: string }) {
      const id = parseInt(args.id, 10);
      const e = await prisma.coreBankingEndpoint.findUnique({ where: { id } });
      if (!e) return null;

      return {
        id: e.id,
        connectionId: e.connectionId,
        name: e.name,
        method: e.method,
        path: e.path,
        bodyTemplate: e.bodyTemplate,
        isActive: e.isActive,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      };
    },
  },
  Mutation: {
    async createCoreBankingEndpoint(
      _parent: unknown,
      args: {
        input: {
          connectionId: number;
          name: string;
          method: string;
          path: string;
          bodyTemplate?: string | null;
          isActive?: boolean | null;
        };
      },
    ) {
      const e = await prisma.coreBankingEndpoint.create({
        data: {
          connectionId: args.input.connectionId,
          name: args.input.name.trim(),
          method: args.input.method.trim(),
          path: args.input.path.trim(),
          bodyTemplate: args.input.bodyTemplate?.trim() || null,
          isActive: args.input.isActive ?? true,
        },
      });

      return {
        id: e.id,
        connectionId: e.connectionId,
        name: e.name,
        path: e.path,
        isActive: e.isActive,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      };
    },
    async updateCoreBankingEndpoint(
      _parent: unknown,
      args: {
        id: string;
        input: {
          connectionId: number;
          name: string;
          path: string;
          isActive?: boolean | null;
        };
      },
    ) {
      const id = parseInt(args.id, 10);

      const e = await prisma.coreBankingEndpoint.update({
        where: { id },
        data: {
          connectionId: args.input.connectionId,
          name: args.input.name.trim(),
          path: args.input.path.trim(),
          isActive: args.input.isActive ?? true,
        },
      });

      return {
        id: e.id,
        connectionId: e.connectionId,
        name: e.name,
        path: e.path,
        isActive: e.isActive,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      };
    },
    async deleteCoreBankingEndpoint(_parent: unknown, args: { id: string }) {
      const id = parseInt(args.id, 10);
      await prisma.coreBankingEndpoint.delete({ where: { id } });
      return true;
    },

    async testCoreBankingEndpoint(
      _parent: unknown,
      args: { id: string; variablesJson?: string | null },
    ) {
      const id = parseInt(args.id, 10);

      const endpoint = await prisma.coreBankingEndpoint.findUnique({
        where: { id },
        include: { connection: true },
      });

      if (!endpoint || !endpoint.connection) {
        return {
          ok: false,
          message: "Core banking endpoint or connection not found",
        };
      }

      const connection = endpoint.connection;

      // Parse variables JSON (if provided) for placeholder substitution
      let variables: Record<string, unknown> = {};
      if (args.variablesJson && args.variablesJson.trim().length > 0) {
        try {
          variables = JSON.parse(args.variablesJson);
        } catch (_error) {
          return {
            ok: false,
            message: "Invalid variables JSON format",
          };
        }
      }

      const renderTemplate = (template: string | null | undefined) => {
        if (!template) return template;
        return template.replace(/{{\s*([a-zA-Z0-9_\.]+)\s*}}/g, (_match, key) => {
          const value = (variables as any)[key];
          return value != null ? String(value) : "";
        });
      };

      const method = (endpoint.method || "GET").toUpperCase();

      // Apply placeholders to path
      const renderedPath = renderTemplate(endpoint.path) || endpoint.path;

      // Build full URL from baseUrl and rendered path
      let url: string;
      try {
        url = new URL(renderedPath, connection.baseUrl).toString();
      } catch (_error) {
        return {
          ok: false,
          message: "Invalid URL configuration for endpoint",
        };
      }

      const headers: Record<string, string> = {};

      const authMode =
        connection.authType === "BEARER" && connection.token ? "BEARER" : "BASIC";

      console.log("[CoreBankingEndpoint:test] Auth", {
        endpointId: endpoint.id,
        connectionId: endpoint.connectionId,
        authType: connection.authType,
        hasToken: !!connection.token,
        mode: authMode,
      });

      // Prefer bearer token when configured; otherwise fall back to basic auth
      if (authMode === "BEARER") {
        headers.Authorization = `Bearer ${connection.token}`;
      } else {
        const authHeader = Buffer.from(
          `${connection.username}:${connection.password}`,
          "utf8",
        ).toString("base64");

        headers.Authorization = `Basic ${authHeader}`;
      }

      let body: string | undefined;
      const renderedBodyTemplate = renderTemplate(endpoint.bodyTemplate);
      if (method !== "GET" && renderedBodyTemplate && renderedBodyTemplate.trim().length > 0) {
        body = renderedBodyTemplate;
        headers["Content-Type"] = "application/json";
      }

      // Prepare safe headers for logging (redact Authorization)
      const logHeaders: Record<string, string> = { ...headers };
      if (logHeaders.Authorization) {
        logHeaders.Authorization = "<redacted>";
      }

      // Create a custom dispatcher to ignore SSL errors (self-signed certs)
      const dispatcher = new Agent({
        connect: {
          rejectUnauthorized: false,
        },
      });

      try {
        // Log outgoing request
        console.log("[CoreBankingEndpoint:test] Request", {
          endpointId: endpoint.id,
          connectionId: endpoint.connectionId,
          url,
          method,
          headers: logHeaders,
          body,
        });

        const response = await fetch(url, {
          method,
          headers,
          body,
          dispatcher: dispatcher as any
        } as any);

        const statusCode = response.status;
        const statusText = response.statusText;
        const responseText = await response.text();

        const ok = response.ok;
        const message = `HTTP ${statusCode} ${statusText}`;

        // Log response summary
        console.log("[CoreBankingEndpoint:test] Response", {
          endpointId: endpoint.id,
          connectionId: endpoint.connectionId,
          url,
          method,
          statusCode,
          statusText,
          ok,
          // Avoid logging huge bodies in full
          responsePreview: responseText.slice(0, 1000),
        });

        return {
          ok,
          message,
          url,
          method,
          requestHeadersJson: JSON.stringify(headers),
          requestBody: body ?? "",
          statusCode,
          statusText,
          responseBody: responseText,
        };
      } catch (error: any) {
        console.error("[CoreBankingEndpoint:test] Error", {
          endpointId: endpoint.id,
          connectionId: endpoint.connectionId,
          url,
          method,
          headers: logHeaders,
          body,
          error: error?.message || String(error),
        });

        return {
          ok: false,
          message: error?.message || "Failed to reach core banking endpoint",
          url,
          method,
          requestHeadersJson: JSON.stringify(headers),
          requestBody: body ?? "",
          statusCode: null,
          statusText: null,
          responseBody: "",
        } as any;
      }
    },
  },
};
