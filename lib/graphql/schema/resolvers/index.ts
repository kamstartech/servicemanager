import { mobileUserResolvers } from "./mobileUser";
import { adminWebUserResolvers } from "./adminWebUser";
import { subscriptionResolvers } from "./subscription";
import { databaseConnectionResolvers } from "./databaseConnection";
import { migrationResolvers } from "./migration";
import { authResolvers } from "./auth";
import { coreBankingConnectionResolvers } from "./coreBankingConnection";
import { coreBankingEndpointResolvers } from "./coreBankingEndpoint";
import { beneficiaryResolvers } from "./beneficiary";
import { passkeyResolvers } from "./passkey";
import { backupResolvers } from "./backup";
import { migrationSchedulingResolvers } from "./migrationScheduling";
import { mobileUserAccountResolvers } from "./mobileUserAccount";
import { deviceVerificationResolvers } from "./deviceVerification";
import { loginAttemptResolvers } from "./loginAttempt";
import { accountCategoryResolvers } from "./accountCategory";
import { mobileUserProfileResolvers } from "./mobileUserProfile";
import { tokenRotationResolvers } from "./tokenRotation";
import { formsResolvers } from "./forms";
import { appScreenResolvers } from "./appScreen";
import { mobileResolvers } from "./mobile";
import { passwordResetResolvers } from "./passwordReset";
import { transactionResolvers } from "./transaction";
import { accountAlertResolvers } from "./accountAlert";
import { workflowResolvers } from "./workflow";
import { workflowStepResolvers } from "./workflowStep";
import { JSONResolver } from "graphql-scalars";

export const resolvers = {
  JSON: JSONResolver,
  MobileUser: {
    ...mobileUserResolvers.MobileUser,
  },
  Query: {
    ...mobileUserResolvers.Query,
    ...adminWebUserResolvers.Query,
    ...databaseConnectionResolvers.Query,
    ...migrationResolvers.Query,
    ...coreBankingConnectionResolvers.Query,
    ...coreBankingEndpointResolvers.Query,
    ...beneficiaryResolvers.Query,
    ...backupResolvers.Query,
    ...passkeyResolvers.Query,
    ...mobileUserAccountResolvers.Query,
    ...loginAttemptResolvers.Query,
    ...accountCategoryResolvers.Query,
    ...formsResolvers.Query,
    ...appScreenResolvers.Query,
    ...tokenRotationResolvers.Query,
    ...mobileResolvers.Query,
    ...transactionResolvers.Query,
    ...accountAlertResolvers.Query,
    ...workflowResolvers.Query,
    ...workflowStepResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...adminWebUserResolvers.Mutation,
    ...mobileUserResolvers.Mutation,
    ...databaseConnectionResolvers.Mutation,
    ...migrationResolvers.Mutation,
    ...coreBankingConnectionResolvers.Mutation,
    ...coreBankingEndpointResolvers.Mutation,
    ...beneficiaryResolvers.Mutation,
    ...passkeyResolvers.Mutation,
    ...backupResolvers.Mutation,
    ...migrationSchedulingResolvers.Mutation,
    ...mobileUserAccountResolvers.Mutation,
    ...deviceVerificationResolvers.Mutation,
    ...accountCategoryResolvers.Mutation,
    ...mobileUserProfileResolvers.Mutation,
    ...tokenRotationResolvers.Mutation,
    ...formsResolvers.Mutation,
    ...appScreenResolvers.Mutation,
    ...mobileResolvers.Mutation,
    ...passwordResetResolvers.Mutation,
    ...accountAlertResolvers.Mutation,
    ...workflowResolvers.Mutation,
    ...workflowStepResolvers.Mutation,
  },
  CoreBankingConnection: {
    ...coreBankingEndpointResolvers.CoreBankingConnection,
  },
  AppScreenPage: {
    ...appScreenResolvers.AppScreenPage,
  },
  Workflow: {
    ...workflowResolvers.Workflow,
  },
  WorkflowStep: {
    ...workflowStepResolvers.WorkflowStep,
  },
  AppScreenPageWorkflow: {
    ...workflowResolvers.AppScreenPageWorkflow,
  },
  Subscription: {
    ...subscriptionResolvers.Subscription,
  },
};
