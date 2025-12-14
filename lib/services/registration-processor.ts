import { prisma } from "@/lib/db/prisma";
import { RegistrationStatus } from "@prisma/client";
import { t24AccountsService } from "@/lib/services/t24/accounts";
import { registrationPubSub } from "@/lib/redis/registration-pubsub";
import type { ProcessStage } from "@/types/process-stages";
import { VALIDATION_STAGES } from "@/types/process-stages";

/**
 * Auto-process a registration request
 * This runs validation and prepares the registration for user creation
 */
export async function autoProcessRegistration(registrationId: number) {
  const processLog: ProcessStage[] = [];
  const startTime = Date.now();

  function logStage(
    stage: string,
    status: "started" | "completed" | "failed",
    details?: string,
    error?: string
  ) {
    const timestamp = new Date().toISOString();
    const lastStage = processLog[processLog.length - 1];
    const duration =
      lastStage &&
      lastStage.stage === stage &&
      lastStage.status === "started"
        ? Date.now() - new Date(lastStage.timestamp).getTime()
        : undefined;

    processLog.push({
      stage,
      status,
      timestamp,
      duration,
      details,
      error,
    });

    // Publish stage update to Redis
    registrationPubSub
      .publishStageUpdate(registrationId, stage, status, details || error)
      .catch((err) => console.error("Failed to publish stage update:", err));
  }

  try {
    // Get the registration request
    const registration = await prisma.requestedRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      console.error(`Registration ${registrationId} not found`);
      return { success: false, error: "Registration not found" };
    }

    if (registration.status !== RegistrationStatus.PENDING) {
      console.log(
        `Registration ${registrationId} is already ${registration.status}`
      );
      return {
        success: false,
        error: `Registration is already ${registration.status}`,
      };
    }

    console.log(
      `🚀 Auto-processing registration ${registrationId} for customer ${registration.customerNumber}...`
    );

    // Stage 1: Duplicate Check
    logStage(VALIDATION_STAGES.DUPLICATE_CHECK, "started");

    const existingUser = await prisma.mobileUser.findFirst({
      where: {
        OR: [
          { customerNumber: registration.customerNumber },
          { phoneNumber: registration.phoneNumber },
        ],
      },
      include: {
        profile: true,
      },
    });

    if (existingUser) {
      logStage(
        VALIDATION_STAGES.DUPLICATE_CHECK,
        "completed",
        "User found - checking for updates"
      );

      // Check if information has changed
      const hasChanges =
        (registration.phoneNumber &&
          registration.phoneNumber !== existingUser.phoneNumber) ||
        (registration.emailAddress &&
          registration.emailAddress !== existingUser.profile?.email) ||
        (registration.firstName &&
          registration.firstName !== existingUser.profile?.firstName) ||
        (registration.lastName &&
          registration.lastName !== existingUser.profile?.lastName);

      if (hasChanges) {
        logStage(
          "update_user_info",
          "started",
          "Updating user information"
        );

        // Update MobileUser phone if changed
        if (
          registration.phoneNumber &&
          registration.phoneNumber !== existingUser.phoneNumber
        ) {
          await prisma.mobileUser.update({
            where: { id: existingUser.id },
            data: { phoneNumber: registration.phoneNumber },
          });
        }

        // Update or create profile
        const profileData: any = {};
        if (registration.emailAddress)
          profileData.email = registration.emailAddress;
        if (registration.firstName)
          profileData.firstName = registration.firstName;
        if (registration.lastName)
          profileData.lastName = registration.lastName;
        if (registration.phoneNumber)
          profileData.phone = registration.phoneNumber;

        if (Object.keys(profileData).length > 0) {
          if (existingUser.profile) {
            await prisma.mobileUserProfile.update({
              where: { mobileUserId: existingUser.id },
              data: profileData,
            });
          } else {
            await prisma.mobileUserProfile.create({
              data: {
                mobileUserId: existingUser.id,
                ...profileData,
              },
            });
          }
        }

        logStage(
          "update_user_info",
          "completed",
          "User information updated successfully"
        );

        // Mark registration as COMPLETED
        await prisma.requestedRegistration.update({
          where: { id: registrationId },
          data: {
            status: RegistrationStatus.COMPLETED,
            mobileUserId: existingUser.id,
            processedAt: new Date(),
            notes: "User already existed - information updated automatically",
            processLog: processLog as any,
          },
        });

        await registrationPubSub.publishFinalStatus(
          registrationId,
          RegistrationStatus.COMPLETED,
          "User already exists - information updated",
          {
            updatedFields: Object.keys(profileData),
            existingUserId: existingUser.id,
          },
          processLog
        );

        console.log(
          `✅ Auto-processed: Updated existing user ${existingUser.id}`
        );
        return {
          success: true,
          status: "COMPLETED",
          message: "User already exists - information updated",
        };
      } else {
        // No changes - mark as duplicate
        logStage(
          VALIDATION_STAGES.DUPLICATE_CHECK,
          "completed",
          "User exists with same information - no updates needed"
        );

        await prisma.requestedRegistration.update({
          where: { id: registrationId },
          data: {
            status: RegistrationStatus.DUPLICATE,
            mobileUserId: existingUser.id,
            errorMessage: "User already exists with identical information",
            processedAt: new Date(),
            processLog: processLog as any,
          },
        });

        await registrationPubSub.publishFinalStatus(
          registrationId,
          RegistrationStatus.DUPLICATE,
          "User already exists with identical information",
          { existingUserId: existingUser.id },
          processLog
        );

        console.log(
          `ℹ️ Auto-processed: Duplicate user ${existingUser.id}`
        );
        return {
          success: false,
          status: "DUPLICATE",
          message: "User already exists with identical information",
        };
      }
    }

    logStage(VALIDATION_STAGES.DUPLICATE_CHECK, "completed", "No duplicate found");

    // Stage 2: T24 Account Lookup
    logStage(VALIDATION_STAGES.T24_LOOKUP, "started");

    const accountsResult = await t24AccountsService.getCustomerAccountsDetailed(
      registration.customerNumber
    );

    if (
      !accountsResult.ok ||
      !accountsResult.accounts ||
      accountsResult.accounts.length === 0
    ) {
      logStage(
        VALIDATION_STAGES.T24_LOOKUP,
        "failed",
        "No accounts found",
        accountsResult.error || "Customer has no accounts"
      );

      await prisma.requestedRegistration.update({
        where: { id: registrationId },
        data: {
          status: RegistrationStatus.FAILED,
          errorMessage:
            accountsResult.error || "No accounts found for customer",
          processedAt: new Date(),
          retryCount: registration.retryCount + 1,
          lastRetryAt: new Date(),
          processLog: processLog as any,
        },
      });

      await registrationPubSub.publishFinalStatus(
        registrationId,
        RegistrationStatus.FAILED,
        accountsResult.error || "No accounts found for customer",
        { error: accountsResult.error || "No accounts found" },
        processLog
      );

      console.log(
        `❌ Auto-processed: Failed - No accounts found for ${registration.customerNumber}`
      );
      return {
        success: false,
        status: "FAILED",
        message: accountsResult.error || "No accounts found for customer",
      };
    }

    logStage(
      VALIDATION_STAGES.T24_LOOKUP,
      "completed",
      `Found ${accountsResult.accounts.length} accounts`
    );

    // Stage 3: Account Validation
    logStage(VALIDATION_STAGES.ACCOUNT_VALIDATION, "started");
    logStage(
      VALIDATION_STAGES.ACCOUNT_VALIDATION,
      "completed",
      `Validated ${accountsResult.accounts.length} accounts`
    );

    // Stage 4: Status Update
    logStage(VALIDATION_STAGES.STATUS_UPDATE, "started");

    const validationData = {
      accounts: accountsResult.accounts,
      validatedAt: new Date().toISOString(),
      autoProcessed: true,
    };

    await prisma.requestedRegistration.update({
      where: { id: registrationId },
      data: {
        status: RegistrationStatus.APPROVED,
        validationData: validationData as any,
        processedAt: new Date(),
        notes: `Auto-processed successfully. Found ${accountsResult.accounts.length} accounts. Ready for cron processing.`,
        processLog: processLog as any,
      },
    });

    logStage(
      VALIDATION_STAGES.STATUS_UPDATE,
      "completed",
      "Status updated to APPROVED"
    );

    await registrationPubSub.publishFinalStatus(
      registrationId,
      RegistrationStatus.APPROVED,
      `Customer validated successfully. Found ${accountsResult.accounts.length} accounts.`,
      { accountsFound: accountsResult.accounts.length, autoProcessed: true },
      processLog
    );

    console.log(
      `✅ Auto-processed: Validated customer ${registration.customerNumber} with ${accountsResult.accounts.length} accounts`
    );
    return {
      success: true,
      status: "APPROVED",
      message: `Customer validated successfully. Found ${accountsResult.accounts.length} accounts.`,
      accountsFound: accountsResult.accounts.length,
    };
  } catch (error) {
    console.error("❌ Auto-processing error:", error);

    logStage(
      "error_handling",
      "failed",
      "Unexpected error",
      error instanceof Error ? error.message : "Unknown error"
    );

    try {
      await prisma.requestedRegistration.update({
        where: { id: registrationId },
        data: {
          retryCount: { increment: 1 },
          lastRetryAt: new Date(),
          errorMessage:
            error instanceof Error ? error.message : "Unknown validation error",
          processLog: processLog as any,
        },
      });
    } catch (updateError) {
      console.error("Failed to update retry count:", updateError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
