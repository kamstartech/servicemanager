
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function ensureIndexes() {
    console.log("🌱 Ensuring database indexes...");

    try {
        // Partial unique index for Wallet users (unique phone number where context is 'WALLET')
        // Note: Standard Prisma schema only supports standard unique indexes.
        // We use raw SQL to enforce this conditional uniqueness.

        await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_wallet_phone 
      ON fdh_mobile_users ("phoneNumber") 
      WHERE context = 'WALLET';
    `);

        console.log("   ✅ Ensured partial unique index: unique_wallet_phone");
    } catch (error) {
        console.error("   ❌ Error ensuring indexes:", error);
        // Don't throw for now to allow seeding to continue if index fails (e.g. data conflict)
        // But in production this might be critical.
    }
}
