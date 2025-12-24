
import { prisma } from "@/lib/db/prisma";

export class ConfigurationService {
    private static CACHE_TTL = 60 * 1000; // 1 minute
    private static cache: Record<string, { value: string; expires: number }> = {};

    static async get(key: string): Promise<string | null> {
        const cached = this.cache[key];
        if (cached && cached.expires > Date.now()) {
            return cached.value;
        }

        const config = await prisma.systemConfiguration.findUnique({
            where: { key },
        });

        if (config) {
            this.cache[key] = {
                value: config.value,
                expires: Date.now() + this.CACHE_TTL,
            };
            return config.value;
        }

        return null;
    }

    static async set(key: string, value: string, description?: string, updatedBy?: string): Promise<void> {
        await prisma.systemConfiguration.upsert({
            where: { key },
            update: { value, description, updatedBy },
            create: { key, value, description, updatedBy },
        });

        // Invalidate cache
        delete this.cache[key];
    }

    static async getSuspenseAccount(): Promise<string> {
        const account = await this.get("suspense_account");
        return account || "1520000114607"; // Default fallback
    }
}
