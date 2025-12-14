import { createPubSub } from "graphql-yoga";

export const pubsub = createPubSub();

export const EVENTS = {
  MOBILE_USER_CREATED: "MOBILE_USER_CREATED",
  MOBILE_USER_UPDATED: "MOBILE_USER_UPDATED",
} as const;
