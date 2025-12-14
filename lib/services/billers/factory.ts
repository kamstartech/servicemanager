import { BillerConfig, BillerType } from "@prisma/client";
import { BaseBillerService } from "./base";

// Placeholder service for not-yet-implemented billers
class PlaceholderBillerService extends BaseBillerService {
  async lookupAccount(accountNumber: string) {
    throw new Error(`${this.config.billerName} integration not yet implemented`);
  }

  async processPayment(params: any) {
    throw new Error(`${this.config.billerName} integration not yet implemented`);
  }
}

/**
 * Factory for creating biller service instances
 */
export class BillerServiceFactory {
  /**
   * Create appropriate biller service based on config
   */
  static create(config: BillerConfig): BaseBillerService {
    switch (config.billerType) {
      case BillerType.LWB_POSTPAID:
      case BillerType.BWB_POSTPAID:
      case BillerType.SRWB_POSTPAID:
      case BillerType.SRWB_PREPAID:
      case BillerType.MASM:
      case BillerType.TNM_BUNDLES:
      case BillerType.REGISTER_GENERAL:
      case BillerType.AIRTEL_VALIDATION:
        // For now, return placeholder services
        // We'll implement these in subsequent phases
        return new PlaceholderBillerService(config);

      default:
        throw new Error(`Unknown biller type: ${config.billerType}`);
    }
  }
}
