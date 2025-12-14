import { prisma } from "@/lib/db/prisma";
import { Client } from "pg";

export const databaseConnectionResolvers = {
  Query: {
    async dbConnections() {
      const connections = await prisma.databaseConnection.findMany({
        orderBy: { createdAt: "desc" },
      });

      return connections.map((c: { [key: string]: any }) => ({
        id: c.id,
        name: c.name,
        engine: c.engine,
        host: c.host,
        port: c.port,
        database: c.database,
        username: c.username,
        isReadOnly: c.isReadOnly,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        lastTestedAt: c.lastTestedAt ? c.lastTestedAt.toISOString() : null,
        lastTestOk: c.lastTestOk,
        lastTestMessage: c.lastTestMessage,
      }));
    },
    async dbConnection(_parent: unknown, args: { id: string }) {
      const id = parseInt(args.id, 10);
      const c = await prisma.databaseConnection.findUnique({ where: { id } });
      if (!c) return null;

      return {
        id: c.id,
        name: c.name,
        engine: c.engine,
        host: c.host,
        port: c.port,
        database: c.database,
        username: c.username,
        isReadOnly: c.isReadOnly,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        lastTestedAt: c.lastTestedAt ? c.lastTestedAt.toISOString() : null,
        lastTestOk: c.lastTestOk,
        lastTestMessage: c.lastTestMessage,
      };
    },
    async appDatabaseTables() {
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
      });

      try {
        await client.connect();

        const result = await client.query(
          `
          SELECT table_schema, table_name
          FROM information_schema.tables
          WHERE table_type = 'BASE TABLE'
            AND table_schema NOT IN ('pg_catalog', 'information_schema')
          ORDER BY table_schema, table_name
        `,
        );

        return result.rows.map((row: any) => ({
          schema: row.table_schema,
          name: row.table_name,
        }));
      } catch {
        return [];
      } finally {
        try {
          await client.end();
        } catch {
          // ignore
        }
      }
    },
    async appTableColumns(_parent: unknown, args: { table: string }) {
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
      });

      try {
        await client.connect();

        const result = await client.query(
          `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1
            AND table_schema = 'public'
          ORDER BY ordinal_position
        `,
          [args.table],
        );

        return result.rows.map((row: any) => ({
          name: row.column_name,
          dataType: row.data_type,
          isNullable: row.is_nullable === 'YES',
          defaultValue: row.column_default,
        }));
      } catch {
        return [];
      } finally {
        try {
          await client.end();
        } catch {
          // ignore
        }
      }
    },
    async previewSourceQuery(
      _parent: unknown,
      args: { connectionId: number; query: string },
    ) {
      const connection = await prisma.databaseConnection.findUnique({
        where: { id: args.connectionId },
      });

      if (!connection) {
        throw new Error("Database connection not found");
      }

      if (connection.engine !== "postgres") {
        throw new Error("Only PostgreSQL connections are supported");
      }

      const client = new Client({
        host: connection.host.trim(),
        port: connection.port,
        user: connection.username.trim(),
        password: connection.password,
        database: connection.database.trim(),
      });

      try {
        await client.connect();

        // Add LIMIT to prevent huge result sets
        let query = args.query.trim();
        if (!query.toLowerCase().includes("limit")) {
          query = `${query} LIMIT 10`;
        }

        const result = await client.query(query);

        // Get column information
        const columns = result.fields.map((field: any) => ({
          name: field.name,
          dataType: field.dataType || "unknown",
        }));

        // Get row data
        const rows = result.rows.map((row: any) => ({
          values: Object.values(row).map((val) =>
            val === null ? "NULL" : String(val),
          ),
        }));

        return {
          columns,
          rows,
        };
      } catch (error: any) {
        throw new Error(`Query preview failed: ${error.message}`);
      } finally {
        try {
          await client.end();
        } catch {
          // ignore
        }
      }
    },
    async dbConnectionTables(_parent: unknown, args: { id: string }) {
      const id = parseInt(args.id, 10);
      const connection = await prisma.databaseConnection.findUnique({ where: { id } });

      if (!connection) {
        return [];
      }

      if (connection.engine !== "postgres") {
        return [];
      }

      const client = new Client({
        host: connection.host.trim(),
        port: connection.port,
        user: connection.username,
        password: connection.password,
        database: connection.database.trim(),
      });

      try {
        await client.connect();

        const result = await client.query(
          `
          SELECT table_schema, table_name
          FROM information_schema.tables
          WHERE table_type = 'BASE TABLE'
            AND table_schema NOT IN ('pg_catalog', 'information_schema')
          ORDER BY table_schema, table_name
        `,
        );

        return result.rows.map((row: any) => ({
          schema: row.table_schema,
          name: row.table_name,
        }));
      } catch {
        return [];
      } finally {
        try {
          await client.end();
        } catch {
          // ignore
        }
      }
    },
    async dbConnectionTableData(
      _parent: unknown,
      args: { id: string; schema: string; table: string },
    ) {
      const id = parseInt(args.id, 10);
      const connection = await prisma.databaseConnection.findUnique({ where: { id } });

      if (!connection) {
        throw new Error("Database connection record not found.");
      }

      if (connection.engine !== "postgres") {
        throw new Error("Only PostgreSQL connections are supported for table data.");
      }

      // Basic validation to avoid SQL injection via identifiers.
      const identifierPattern = /^[A-Za-z0-9_]+$/;
      if (!identifierPattern.test(args.schema) || !identifierPattern.test(args.table)) {
        throw new Error("Invalid schema or table name.");
      }

      const client = new Client({
        host: connection.host,
        port: connection.port,
        user: connection.username,
        password: connection.password,
        database: connection.database,
      });

      try {
        await client.connect();

        const columnsResult = await client.query(
          `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2
          ORDER BY ordinal_position
        `,
          [args.schema, args.table],
        );

        const columns = columnsResult.rows.map((row: any) => ({
          name: row.column_name as string,
          dataType: row.data_type as string,
        }));

        const selectSql = `SELECT * FROM "${args.schema}"."${args.table}" LIMIT 100`;
        const dataResult = await client.query(selectSql);

        const rows = dataResult.rows.map((row: any) => ({
          values: columns.map((col: { name: string }) => {
            const value = row[col.name];
            if (value === null || value === undefined) return "";
            if (value instanceof Date) return value.toISOString();
            return String(value);
          }),
        }));

        return {
          columns,
          rows,
        };
      } finally {
        try {
          await client.end();
        } catch {
          // ignore
        }
      }
    },
  },
  Mutation: {
    async createDbConnection(
      _parent: unknown,
      args: {
        input: {
          name: string;
          engine: string;
          host: string;
          port: number;
          database: string;
          username: string;
          password: string;
          isReadOnly?: boolean;
        };
      },
    ) {
      const c = await prisma.databaseConnection.create({
        data: {
          name: args.input.name.trim(),
          engine: args.input.engine.trim(),
          host: args.input.host.trim(),
          port: args.input.port,
          database: args.input.database.trim(),
          username: args.input.username.trim(),
          password: args.input.password,
          isReadOnly: args.input.isReadOnly ?? true,
        },
      });

      return {
        id: c.id,
        name: c.name,
        engine: c.engine,
        host: c.host,
        port: c.port,
        database: c.database,
        username: c.username,
        isReadOnly: c.isReadOnly,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    },
    async updateDbConnection(
      _parent: unknown,
      args: {
        id: string;
        input: {
          name: string;
          engine: string;
          host: string;
          port: number;
          database: string;
          username: string;
          password?: string | null;
          isReadOnly?: boolean;
        };
      },
    ) {
      const id = parseInt(args.id, 10);

      const updateData: any = {
        name: args.input.name.trim(),
        engine: args.input.engine.trim(),
        host: args.input.host.trim(),
        port: args.input.port,
        database: args.input.database.trim(),
        username: args.input.username.trim(),
        isReadOnly: args.input.isReadOnly ?? true,
      };

      if (args.input.password && args.input.password.length > 0) {
        updateData.password = args.input.password;
      }

      const c = await prisma.databaseConnection.update({
        where: { id },
        data: updateData,
      });

      return {
        id: c.id,
        name: c.name,
        engine: c.engine,
        host: c.host,
        port: c.port,
        database: c.database,
        username: c.username,
        isReadOnly: c.isReadOnly,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    },
    async deleteDbConnection(_parent: unknown, args: { id: string }) {
      const id = parseInt(args.id, 10);
      await prisma.databaseConnection.delete({ where: { id } });
      return true;
    },
    async testDbConnection(_parent: unknown, args: { id: string }) {
      const id = parseInt(args.id, 10);
      const connection = await prisma.databaseConnection.findUnique({ where: { id } });

      if (!connection) {
        return {
          ok: false,
          message: "Database connection record not found.",
        };
      }

      if (connection.engine !== "postgres") {
        return {
          ok: false,
          message: "Only PostgreSQL connections can be tested at the moment.",
        };
      }

      const client = new Client({
        host: connection.host.trim(),
        port: connection.port,
        user: connection.username,
        password: connection.password,
        database: connection.database.trim(),
      });

      const startedAt = Date.now();

      try {
        await client.connect();
        await client.query("SELECT 1");
        const duration = Date.now() - startedAt;

        await prisma.databaseConnection.update({
          where: { id },
          data: {
            lastTestedAt: new Date(),
            lastTestOk: true,
            lastTestMessage: `Connection successful in ${duration} milliseconds.`,
          },
        });

        return {
          ok: true,
          message: `Connection successful in ${duration} milliseconds.`,
        };
      } catch (error: any) {
        const message = `Connection failed: ${error?.message ?? String(error)}`;

        await prisma.databaseConnection.update({
          where: { id },
          data: {
            lastTestedAt: new Date(),
            lastTestOk: false,
            lastTestMessage: message,
          },
        });

        return {
          ok: false,
          message,
        };
      } finally {
        try {
          await client.end();
        } catch {
          // ignore
        }
      }
    },
  },
};
