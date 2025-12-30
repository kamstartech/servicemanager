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

type ServiceCallback = (channel: string, message: ServiceStatusUpdate) => void;

export class ServicePubSub {
  private listeners: Map<string, Set<ServiceCallback>> = new Map();
  private patternListeners: Set<ServiceCallback> = new Set();
  private isSubscribed = false;

  constructor() {
    this.setupGlobalListeners();
  }

  private setupGlobalListeners() {
    // We can't set up listeners here because redisClient might not be ready
    // Instead we'll ensure they are set up when the first subscription happens
  }

  private async ensureGlobalSubscription() {
    if (this.isSubscribed) return;

    const subscriber = redisClient.getSubscriber();

    // Handle pattern-based subscriptions (pmessage for psubscribe)
    subscriber.on("pmessage", (pattern: string, channel: string, message: string) => {
      try {
        const data = JSON.parse(message);
        // Pattern listeners receive all messages matching the pattern
        this.patternListeners.forEach(callback => callback(channel, data));
      } catch (error) {
        console.error("Failed to parse pmessage:", error);
      }
    });

    // Handle regular subscriptions
    subscriber.on("message", (channel: string, message: string) => {
      try {
        const data = JSON.parse(message);
        // Dispatch to specific channel listeners
        const channelListeners = this.listeners.get(channel);
        if (channelListeners) {
          channelListeners.forEach(callback => callback(channel, data));
        }
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    });

    // Subscribe to everything we need globally
    // We just subscribe to the pattern for simplicity as we handle dispatching internally
    await subscriber.psubscribe("service:*");
    console.log("✅ Global execution: Subscribed to pattern: service:*");

    this.isSubscribed = true;
  }

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
   * Returns an unsubscribe function
   */
  async subscribe(
    channels: ServiceChannel[],
    callback: ServiceCallback
  ): Promise<() => void> {
    await this.ensureGlobalSubscription();

    const isPatternSubscription = channels.includes(ServiceChannel.ALL_SERVICES);

    if (isPatternSubscription) {
      this.patternListeners.add(callback);
      console.log("✅ Added pattern listener");
    } else {
      channels.forEach(channel => {
        if (!this.listeners.has(channel)) {
          this.listeners.set(channel, new Set());
        }
        this.listeners.get(channel)!.add(callback);
      });
      console.log("✅ Added listeners for channels:", channels);
    }

    // Return cleanup function
    return () => {
      this.unsubscribeFrom(channels, callback, isPatternSubscription);
    };
  }

  /**
   * Internal helper to unsubscribe specific callback
   */
  private unsubscribeFrom(
    channels: ServiceChannel[],
    callback: ServiceCallback,
    isPattern: boolean
  ) {
    if (isPattern) {
      this.patternListeners.delete(callback);
      console.log("✅ Removed pattern listener");
    } else {
      channels.forEach(channel => {
        const channelListeners = this.listeners.get(channel);
        if (channelListeners) {
          channelListeners.delete(callback);
          if (channelListeners.size === 0) {
            this.listeners.delete(channel);
          }
        }
      });
      console.log("✅ Removed listeners for channels:", channels);
    }
  }

  /**
   * Unsubscribe from channels (Backward Compatibility)
   * This removes ALL listeners for the given channels or everything if no channels provided.
   * NOTE: This is destructive for other listeners. Use the returned unsubscribe function from subscribe() instead.
   */
  async unsubscribe(channels?: ServiceChannel[]): Promise<void> {
    const subscriber = redisClient.getSubscriber();

    if (!channels) {
      // Clear all local listeners
      this.listeners.clear();
      this.patternListeners.clear();
      console.log("✅ Cleared all local listeners");
    } else if (channels.includes(ServiceChannel.ALL_SERVICES)) {
      this.patternListeners.clear();
      console.log("✅ Cleared all pattern listeners");
    } else {
      channels.forEach(channel => {
        this.listeners.delete(channel);
      });
      console.log("✅ Cleared listeners for channels:", channels);
    }
  }
}

export const servicePubSub = new ServicePubSub();
