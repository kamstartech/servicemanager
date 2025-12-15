import type Redis from "ioredis";
import { redisClient } from "./client";

export enum LogsChannel {
  ALL = "logs:all",
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface ServiceLogEvent {
  service: string;
  level: LogLevel;
  message: string;
  timestamp: number;
  meta?: Record<string, any>;
}

export class LogsPubSub {
  async publishLog(event: ServiceLogEvent): Promise<void> {
    try {
      if (!redisClient.isConnected()) return;

      const publisher = redisClient.getPublisher();
      const payload = JSON.stringify(event);

      await Promise.all([
        publisher.publish(LogsChannel.ALL, payload),
        publisher.publish(this.serviceChannel(event.service), payload),
      ]);
    } catch (error) {
      console.error(
        "Failed to publish log (non-fatal):",
        error instanceof Error ? error.message : error
      );
    }
  }

  createSubscriber(): Redis | null {
    try {
      if (!redisClient.isConnected()) return null;
      const base = redisClient.getPublisher();
      const sub = base.duplicate();
      sub.connect().catch(() => {});
      return sub;
    } catch {
      return null;
    }
  }

  serviceChannel(service: string): string {
    return `logs:${service}`;
  }
}

export const logsPubSub = new LogsPubSub();
