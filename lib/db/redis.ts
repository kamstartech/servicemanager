import { redisClient } from "@/lib/redis/client";
import type Redis from "ioredis";

// Export the publisher as the main redis client for passkey operations
export const redis = redisClient.getPublisher();

export async function getRedis(): Promise<Redis> {
  await redisClient.initialize();
  return redisClient.getPublisher();
}


