import { servicePubSub, ServiceChannel } from "./pubsub";
import { RegistrationStatus } from "@prisma/client";

export interface RegistrationUpdate {
  registrationId: number;
  status: RegistrationStatus;
  timestamp: number;
  stage?: string;
  message?: string;
  details?: {
    updatedFields?: string[];
    accountsFound?: number;
    existingUserId?: number;
    error?: string;
  };
  processLog?: Array<{
    stage: string;
    status: string;
    timestamp: string;
    duration?: number;
    details?: string;
    error?: string;
  }>;
}

export class RegistrationPubSub {
  /**
   * Publish registration status update
   */
  async publishUpdate(update: RegistrationUpdate): Promise<void> {
    try {
      await servicePubSub.publishStatus(ServiceChannel.REGISTRATION_UPDATES, {
        service: "registration",
        timestamp: update.timestamp,
        status: update,
      });
      console.log(`📢 Published registration update for #${update.registrationId}:`, update.status);
    } catch (error) {
      console.error("Failed to publish registration update:", error);
    }
  }

  /**
   * Publish stage progress update
   */
  async publishStageUpdate(
    registrationId: number,
    stage: string,
    status: "started" | "completed" | "failed",
    details?: string
  ): Promise<void> {
    await this.publishUpdate({
      registrationId,
      status: RegistrationStatus.PENDING, // Current status remains PENDING during processing
      timestamp: Date.now(),
      stage,
      message: details || `${status}: ${stage}`,
    });
  }

  /**
   * Publish final status update
   */
  async publishFinalStatus(
    registrationId: number,
    status: RegistrationStatus,
    message: string,
    details?: RegistrationUpdate["details"],
    processLog?: RegistrationUpdate["processLog"]
  ): Promise<void> {
    await this.publishUpdate({
      registrationId,
      status,
      timestamp: Date.now(),
      message,
      details,
      processLog,
    });
  }

  /**
   * Subscribe to registration updates
   */
  async subscribe(
    callback: (update: RegistrationUpdate) => void
  ): Promise<void> {
    await servicePubSub.subscribe(
      [ServiceChannel.REGISTRATION_UPDATES],
      (channel, message) => {
        if (message.service === "registration" && message.status) {
          callback(message.status as RegistrationUpdate);
        }
      }
    );
  }

  /**
   * Unsubscribe from registration updates
   */
  async unsubscribe(): Promise<void> {
    // Note: This matches the old behavior of unsubscribing everything from this channel
    await servicePubSub.unsubscribe([ServiceChannel.REGISTRATION_UPDATES]);
  }
}

export const registrationPubSub = new RegistrationPubSub();
