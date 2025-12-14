import { prisma } from "@/lib/db/prisma";
import { Client } from "pg";

export const migrationResolvers = {
  Query: {
    async migrations() {
      const migrations = await prisma.migration.findMany({
        include: {
          sourceConnection: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return migrations.map((m: any) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        sourceConnectionId: m.sourceConnectionId,
        sourceConnectionName: m.sourceConnection.name,
        sourceQuery: m.sourceQuery,
        targetTable: m.targetTable,
        targetInsertQuery: m.targetInsertQuery,
        status: m.status,
        lastRunAt: m.lastRunAt ? m.lastRunAt.toISOString() : null,
        lastRunSuccess: m.lastRunSuccess,
        lastRunMessage: m.lastRunMessage,
        lastRunRowsAffected: m.lastRunRowsAffected,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
        isRecurring: m.isRecurring ?? false,
        cronExpression: m.cronExpression ?? null,
        nextRunAt: m.nextRunAt ? m.nextRunAt.toISOString() : null,
      }));
    },
    async migration(_parent: unknown, args: { id: string }) {
      const id = parseInt(args.id, 10);
      const m = await prisma.migration.findUnique({
        where: { id },
        include: {
          sourceConnection: true,
        },
      });
      if (!m) return null;

      return {
        id: m.id,
        name: m.name,
        description: m.description,
        sourceConnectionId: m.sourceConnectionId,
        sourceConnectionName: m.sourceConnection.name,
        sourceQuery: m.sourceQuery,
        targetTable: m.targetTable,
        targetInsertQuery: m.targetInsertQuery,
        status: m.status,
        lastRunAt: m.lastRunAt ? m.lastRunAt.toISOString() : null,
        lastRunSuccess: m.lastRunSuccess,
        lastRunMessage: m.lastRunMessage,
        lastRunRowsAffected: m.lastRunRowsAffected,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
        isRecurring: m.isRecurring ?? false,
        cronExpression: m.cronExpression ?? null,
        nextRunAt: m.nextRunAt ? m.nextRunAt.toISOString() : null,
      };
    },
  },
  Mutation: {
    async createMigration(
      _parent: unknown,
      args: {
        input: {
          name: string;
          description?: string;
          sourceConnectionId: number;
          sourceQuery: string;
          targetTable: string;
          targetInsertQuery: string;
        };
      },
    ) {
      const m = await prisma.migration.create({
        data: {
          name: args.input.name.trim(),
          description: args.input.description?.trim(),
          sourceConnectionId: args.input.sourceConnectionId,
          sourceQuery: args.input.sourceQuery.trim(),
          targetTable: args.input.targetTable.trim(),
          targetInsertQuery: args.input.targetInsertQuery.trim(),
        },
        include: {
          sourceConnection: true,
        },
      });

      return {
        id: m.id,
        name: m.name,
        description: m.description,
        sourceConnectionId: m.sourceConnectionId,
        sourceConnectionName: m.sourceConnection.name,
        sourceQuery: m.sourceQuery,
        targetTable: m.targetTable,
        targetInsertQuery: m.targetInsertQuery,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
        lastRunAt: m.lastRunAt ? m.lastRunAt.toISOString() : null,
        lastRunSuccess: m.lastRunSuccess,
        lastRunMessage: m.lastRunMessage,
        lastRunRowsAffected: m.lastRunRowsAffected,
        isRecurring: m.isRecurring ?? false,
        cronExpression: m.cronExpression ?? null,
        nextRunAt: m.nextRunAt ? m.nextRunAt.toISOString() : null,
      };
    },
    async updateMigration(
      _parent: unknown,
      args: {
        id: string;
        input: {
          name: string;
          description?: string;
          sourceConnectionId: number;
          sourceQuery: string;
          targetTable: string;
          targetInsertQuery: string;
        };
      },
    ) {
      const id = parseInt(args.id, 10);

      const m = await prisma.migration.update({
        where: { id },
        data: {
          name: args.input.name.trim(),
          description: args.input.description?.trim(),
          sourceConnectionId: args.input.sourceConnectionId,
          sourceQuery: args.input.sourceQuery.trim(),
          targetTable: args.input.targetTable.trim(),
          targetInsertQuery: args.input.targetInsertQuery.trim(),
        },
        include: {
          sourceConnection: true,
        },
      });

      return {
        id: m.id,
        name: m.name,
        description: m.description,
        sourceConnectionId: m.sourceConnectionId,
        sourceConnectionName: m.sourceConnection.name,
        sourceQuery: m.sourceQuery,
        targetTable: m.targetTable,
        targetInsertQuery: m.targetInsertQuery,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
        lastRunAt: m.lastRunAt ? m.lastRunAt.toISOString() : null,
        lastRunSuccess: m.lastRunSuccess,
        lastRunMessage: m.lastRunMessage,
        lastRunRowsAffected: m.lastRunRowsAffected,
        isRecurring: m.isRecurring ?? false,
        cronExpression: m.cronExpression ?? null,
        nextRunAt: m.nextRunAt ? m.nextRunAt.toISOString() : null,
      };
    },
    async deleteMigration(_parent: unknown, args: { id: string }) {
      const id = parseInt(args.id, 10);
      await prisma.migration.delete({ where: { id } });
      return true;
    },
    async runMigration(
      _parent: unknown,
      args: {
        id: string;
        duplicateStrategy?:
          | "FAIL_ON_DUPLICATE"
          | "SKIP_DUPLICATES"
          | "UPDATE_EXISTING";
      },
    ) {
      const id = parseInt(args.id, 10);
      const duplicateStrategy =
        args.duplicateStrategy ?? "FAIL_ON_DUPLICATE";
      const migration = await prisma.migration.findUnique({
        where: { id },
        include: { sourceConnection: true },
      });

      if (!migration) {
        return {
          ok: false,
          message: "Migration not found.",
        };
      }

      await prisma.migration.update({
        where: { id },
        data: { status: "RUNNING" },
      });

      const sourceClient = new Client({
        host: migration.sourceConnection.host.trim(),
        port: migration.sourceConnection.port,
        user: migration.sourceConnection.username.trim(),
        password: migration.sourceConnection.password,
        database: migration.sourceConnection.database.trim(),
      });

      const targetClient = new Client({
        connectionString: process.env.DATABASE_URL,
      });

      try {
        await sourceClient.connect();
        await targetClient.connect();

        // Execute source query to fetch data
        const sourceResult = await sourceClient.query(migration.sourceQuery);
        const sourceRows = sourceResult.rows;

        if (sourceRows.length === 0) {
          await prisma.migration.update({
            where: { id },
            data: {
              status: "COMPLETED",
              lastRunAt: new Date(),
              lastRunSuccess: true,
              lastRunMessage: "No rows to migrate.",
              lastRunRowsAffected: 0,
            },
          });

          return {
            ok: true,
            message: "No rows to migrate.",
            rowsAffected: 0,
          };
        }

        // Begin transaction for target inserts
        await targetClient.query("BEGIN");

        let rowsAffected = 0;
        let rowsSkipped = 0;
        let rowsUpdated = 0;
        
        for (const row of sourceRows) {
          // Replace placeholders in target query with actual values
          // Simple placeholder replacement: {{column_name}}
          let query = migration.targetInsertQuery;
          
          // Debug: Log source row columns
          console.log("Source row columns:", Object.keys(row));
          console.log("Source row data:", row);
          
          Object.keys(row).forEach((key) => {
            const placeholder = new RegExp(`{{${key}}}`, "g");
            const value = row[key];
            // Properly escape values
            const escapedValue =
              value === null
                ? "NULL"
                : typeof value === "string"
                  ? `'${value.replace(/'/g, "''")}'`
                  : String(value);
            query = query.replace(placeholder, escapedValue);
          });
          
          // Debug: Log final query before execution
          console.log("Final INSERT query:", query);
          
          // Check for unreplaced placeholders
          const unreplaced = query.match(/{{[^}]+}}/g);
          if (unreplaced) {
            throw new Error(`Unreplaced placeholders found: ${unreplaced.join(', ')}`);
          }

          // Use savepoint to handle errors without aborting the entire transaction
          await targetClient.query("SAVEPOINT before_insert");
          
          try {
            await targetClient.query(query);
            await targetClient.query("RELEASE SAVEPOINT before_insert");
            rowsAffected++;
          } catch (error: any) {
            // Rollback to savepoint (not the entire transaction)
            await targetClient.query("ROLLBACK TO SAVEPOINT before_insert");
            
            // 23505 is unique_violation in Postgres
            if (error && typeof error.code === "string" && error.code === "23505") {
              if (duplicateStrategy === "SKIP_DUPLICATES") {
                // Skip this row and continue with the next one
                rowsSkipped++;
                continue;
              } else if (duplicateStrategy === "UPDATE_EXISTING") {
                // Convert INSERT to UPDATE by removing id from the insert
                // This is a simplified approach - assumes id is the conflict column
                
                // Extract table name from INSERT query
                const tableMatch = query.match(/INSERT INTO\s+(\S+)/i);
                if (!tableMatch) {
                  throw new Error("Could not parse table name from INSERT query");
                }
                const tableName = tableMatch[1];
                
                // Build UPDATE query from the row data, excluding 'id'.
                // Quote column identifiers to preserve case (e.g. phoneNumber -> "phoneNumber").
                const updateColumns = Object.keys(row)
                  .filter(key => key !== 'id')
                  .map(key => {
                    const value = row[key];
                    const escapedValue =
                      value === null
                        ? "NULL"
                        : typeof value === "string"
                          ? `'${value.replace(/'/g, "''")}'`
                          : String(value);
                    const columnIdentifier = /[A-Z]/.test(key)
                      ? `"${key}"`
                      : key;
                    return `${columnIdentifier} = ${escapedValue}`;
                  })
                  .join(', ');
                
                if (updateColumns && row.id) {
                  const updateQuery = `UPDATE ${tableName} SET ${updateColumns} WHERE id = ${row.id}`;
                  console.log("UPDATE query:", updateQuery);
                  await targetClient.query(updateQuery);
                  rowsUpdated++;
                  rowsAffected++;
                } else {
                  throw new Error("Cannot UPDATE: missing id or no columns to update");
                }
                continue;
              }
            }
            throw error;
          }
        }

        await targetClient.query("COMMIT");

        const successMessage = duplicateStrategy === "UPDATE_EXISTING" && rowsUpdated > 0
          ? `Successfully migrated ${rowsAffected} rows (${rowsUpdated} updated, ${rowsAffected - rowsUpdated} inserted).`
          : duplicateStrategy === "SKIP_DUPLICATES" && rowsSkipped > 0
            ? `Successfully migrated ${rowsAffected} rows (${rowsSkipped} skipped as duplicates).`
            : `Successfully migrated ${rowsAffected} rows.`;

        await prisma.migration.update({
          where: { id },
          data: {
            status: "COMPLETED",
            lastRunAt: new Date(),
            lastRunSuccess: true,
            lastRunMessage: successMessage,
            lastRunRowsAffected: rowsAffected,
          },
        });

        return {
          ok: true,
          message: successMessage,
          rowsAffected,
        };
      } catch (error: any) {
        try {
          await targetClient.query("ROLLBACK");
        } catch {
          // ignore
        }

        const message = `Migration failed: ${error?.message ?? String(error)}`;

        await prisma.migration.update({
          where: { id },
          data: {
            status: "FAILED",
            lastRunAt: new Date(),
            lastRunSuccess: false,
            lastRunMessage: message,
          },
        });

        return {
          ok: false,
          message,
        };
      } finally {
        try {
          await sourceClient.end();
          await targetClient.end();
        } catch {
          // ignore
        }
      }
    },
  },
};
