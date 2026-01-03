import { GraphQLObjectType, GraphQLSchema } from "graphql";
import { schema as baseSchema } from "../index";

const MOBILE_QUERY_FIELDS = new Set([
  "myDevices",
  "mySessions",
  "myProfile",
  "myAccounts",
  "myPrimaryAccount",
  "myNotificationSettings",
  "appScreens",
  "pageWorkflows",
  "workflowExecution",
  "myBeneficiaries",
  "allBeneficiaries",
  "beneficiaries",
  "beneficiary",
  "accountAlertSettings",
  "accountAlerts",
  "myCheckbookRequests",
  "myCheckbookRequest",
  "accountTransactions",
  "proxyTransactionByReference",
  "proxyTransaction",
  "proxyAccountTransactions",
  "mobileUserAccounts",
  "mobileUserAccount",
  "myTickets",
  "ticket",
  "externalBanks",
  "myNotifications",
  "unreadNotificationCount",
]);

const MOBILE_SUBSCRIPTION_FIELDS = new Set([
  "mobileUserCreated",
  "mobileUserUpdated",
  "deviceApprovalStatus",
  "accountsUpdated",
  "beneficiariesUpdated",
  "appStructureUpdated",
]);

const MOBILE_MUTATION_FIELDS = new Set([
  "login",
  "verifyDeviceOtp",
  "resendDeviceOtp",
  "registerPasskeyStart",
  "registerPasskeyComplete",
  "loginWithPasskeyStart",
  "loginWithPasskeyComplete",
  "startWorkflowExecution",
  "executeWorkflowStep",
  "completeWorkflowExecution",
  "secureRotateUserToken",
  "initiatePasswordReset",
  "verifyResetOTP",
  "completePasswordReset",
  "updateMyNotificationSettings",
  "toggleMultiDeviceSession",
  "updateAccountAlertSettings",
  "acknowledgeAlert",
  "updateMyProfile",
  "revokeMyDevice",
  "renameMyDevice",
  "approveMyDevice",
  "denyMyDevice",
  "revokeMySession",
  "revokeAllMyOtherSessions",
  "createCheckbookRequest",
  "cancelMyCheckbookRequest",
  "registerDeviceForPush",
  "unregisterDeviceFromPush",
  "testPushNotification",
  "markNotificationAsRead",
  "markAllNotificationsAsRead",
  "deleteNotification",
  "setAccountNickname",
  "freezeAccount",
  "unfreezeAccount",
  "hideAccount",
  "unhideAccount",
  "createTransaction",
  "createTransfer",
  "retryTransaction",
  "reverseTransaction",
  "purchaseAirtime",
  "setMemoWord",
  "requestPasswordChangeOtp",
  "changePassword",
  "createBeneficiary",
  "updateBeneficiary",
  "deleteBeneficiary",
  "toggleBeneficiaryStatus",
  "requestStatement",
  "requestCheckbook",
  "verifyPassword",
  "createTicket",
  "replyToTicket",
  "sendTicketMessage",
]);

function pickRootFields(
  type: GraphQLObjectType,
  allowed: Set<string>
): Record<string, any> {
  const fields = type.getFields();
  const result: Record<string, any> = {};

  for (const fieldName of Object.keys(fields)) {
    if (!allowed.has(fieldName)) continue;

    const field = fields[fieldName];

    const args: Record<string, any> = {};
    for (const arg of field.args) {
      args[arg.name] = {
        type: arg.type,
        defaultValue: arg.defaultValue,
        description: arg.description,
        astNode: arg.astNode,
        extensions: arg.extensions,
      };
    }

    result[fieldName] = {
      type: field.type,
      args,
      resolve: field.resolve,
      subscribe: field.subscribe,
      description: field.description,
      deprecationReason: field.deprecationReason,
      astNode: field.astNode,
      extensions: field.extensions,
    };
  }

  return result;
}

const baseQuery = baseSchema.getQueryType();
const baseMutation = baseSchema.getMutationType();
const baseSubscription = baseSchema.getSubscriptionType();

if (!baseQuery) {
  throw new Error("Base schema has no Query type");
}

export const mobileSchema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: baseQuery.name,
    fields: () => pickRootFields(baseQuery, MOBILE_QUERY_FIELDS),
  }),
  mutation: baseMutation
    ? new GraphQLObjectType({
      name: baseMutation.name,
      fields: () => pickRootFields(baseMutation, MOBILE_MUTATION_FIELDS),
    })
    : undefined,
  subscription: baseSubscription
    ? new GraphQLObjectType({
      name: baseSubscription.name,
      fields: () => pickRootFields(baseSubscription, MOBILE_SUBSCRIPTION_FIELDS),
    })
    : undefined,
});
