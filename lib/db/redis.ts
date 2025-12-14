import { redisClient } from "@/lib/redis/client";

// Export the publisher as the main redis client for passkey operations
export const redis = redisClient.getPublisher();


