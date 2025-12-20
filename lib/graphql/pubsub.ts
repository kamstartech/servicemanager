import { createPubSub } from "graphql-yoga";

export const pubsub = createPubSub();

export const EVENTS = {
  MOBILE_USER_CREATED: "MOBILE_USER_CREATED",
  MOBILE_USER_UPDATED: "MOBILE_USER_UPDATED",
  DEVICE_APPROVAL_STATUS: "DEVICE_APPROVAL_STATUS",
} as const;
