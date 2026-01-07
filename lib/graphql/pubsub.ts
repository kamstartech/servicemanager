import { RedisPubSub } from "graphql-redis-subscriptions";
import Redis from "ioredis";

const options = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times: number) => {
    return Math.min(times * 50, 2000);
  }
};

export const pubsub = new RedisPubSub({
  publisher: new Redis(options),
  subscriber: new Redis(options)
});

export const EVENTS = {
  MOBILE_USER_CREATED: "MOBILE_USER_CREATED",
  MOBILE_USER_UPDATED: "MOBILE_USER_UPDATED",
  DEVICE_APPROVAL_STATUS: "DEVICE_APPROVAL_STATUS",
  ACCOUNTS_UPDATED: "ACCOUNTS_UPDATED",
  BENEFICIARIES_UPDATED: "BENEFICIARIES_UPDATED",
  APP_STRUCTURE_UPDATED: "APP_STRUCTURE_UPDATED",
  TICKET_MESSAGE_ADDED: "TICKET_MESSAGE_ADDED",
} as const;
