import { redisClient } from "./client";

export enum ServiceChannel {
  BALANCE_SYNC = "service:balance-sync",
  ACCOUNT_DISCOVERY = "service:account-discovery",
  ACCOUNT_ENRICHMENT = "service:account-enrichment",
  ACCOUNT_CLEANUP = "service:account-cleanup",
  REGISTRATION_UPDATES = "service:registration-updates",
  ALL_SERVICES = "service:*",
}

export interface ServiceStatusUpdate {
  service: string;
  timestamp: number;
  status: {
    [key: string]: any;
  };
}

export class ServicePubSub {
  /**
   * Publish service status update
   * Fails silently if Redis is unavailable to prevent service interruption
   */
  async publishStatus(
    channel: ServiceChannel,
    status: ServiceStatusUpdate
  ): Promise<void> {
    try {
      // Check if Redis is connected
      if (!redisClient.isConnected()) {
        // Silently skip if Redis not available
        return;
      }

      const publisher = redisClient.getPublisher();
      await publisher.publish(channel, JSON.stringify(status));
      console.log(`📢 Published to ${channel}:`, status.service);
    } catch (error) {
      // Log but don't throw - service should continue even if Redis fails
      console.error("Failed to publish status (non-fatal):", error instanceof Error ? error.message : error);
    }
  }

  /**
   * Subscribe to service status updates
   * Note: Pattern subscribe (psubscribe) is used for ALL_SERVICES wildcard
   */
  async subscribe(
    channels: ServiceChannel[],
    callback: (channel: string, message: ServiceStatusUpdate) => void
  ): Promise<void> {
    const subscriber = redisClient.getSubscriber();

    // Handle pattern-based subscriptions (pmessage for psubscribe)
    subscriber.on("pmessage", (pattern, channel, message) => {
      try {
        const data = JSON.parse(message);
        callback(channel, data);
      } catch (error) {
        console.error("Failed to parse pmessage:", error);
      }
    });

    // Handle regular subscriptions
    subscriber.on("message", (channel, message) => {
      try {
        const data = JSON.parse(message);
        callback(channel, data);
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    });

    // Use psubscribe for pattern matching if ALL_SERVICES
    if (channels.includes(ServiceChannel.ALL_SERVICES)) {
      await subscriber.psubscribe("service:*");
      console.log("✅ Subscribed to pattern: service:*");
    } else {
      await subscriber.subscribe(...channels);
      console.log("✅ Subscribed to channels:", channels);
    }
  }

  /**
   * Unsubscribe from channels
   */
  async unsubscribe(channels?: ServiceChannel[]): Promise<void> {
    const subscriber = redisClient.getSubscriber();

    if (!channels) {
      await subscriber.unsubscribe();
      await subscriber.punsubscribe();
      console.log("✅ Unsubscribed from all channels");
    } else if (channels.includes(ServiceChannel.ALL_SERVICES)) {
      await subscriber.punsubscribe("service:*");
      console.log("✅ Unsubscribed from pattern: service:*");
    } else {
      await subscriber.unsubscribe(...channels);
      console.log("✅ Unsubscribed from channels:", channels);
    }
  }
}

export const servicePubSub = new ServicePubSub();
