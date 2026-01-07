import { pubsub, EVENTS } from "../../pubsub";

export const subscriptionResolvers = {
  Subscription: {
    mobileUserCreated: {
      subscribe: () => pubsub.asyncIterator(EVENTS.MOBILE_USER_CREATED),
    },
    mobileUserUpdated: {
      subscribe: () => pubsub.asyncIterator(EVENTS.MOBILE_USER_UPDATED),
    },
    deviceApprovalStatus: {
      subscribe: (_parent: any, { deviceId }: { deviceId: string }) =>
        pubsub.asyncIterator(`${EVENTS.DEVICE_APPROVAL_STATUS}:${deviceId}`),
      resolve: (payload: any) => payload.deviceApprovalStatus,
    },
  },
};
