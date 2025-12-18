import { BillerConfig } from "@prisma/client";
import { BaseBillerService } from "./base";
import { SoapBillerService } from "./soap";
import { InvoiceBillerService } from "./invoice";
import { BundleBillerService } from "./bundle";
import { ValidationBillerService } from "./validation";

// Enum surrogate
const BillerType = {
  TNM_BUNDLES: "TNM_BUNDLES",
  AIRTEL_VALIDATION: "AIRTEL_VALIDATION",
  REGISTER_GENERAL: "REGISTER_GENERAL",
  SRWB_PREPAID: "SRWB_PREPAID",
  LWB_POSTPAID: "LWB_POSTPAID",
  BWB_POSTPAID: "BWB_POSTPAID",
  SRWB_POSTPAID: "SRWB_POSTPAID",
  MASM: "MASM"
} as const;

/**
 * Factory for creating biller service instances
 */
export class BillerServiceFactory {
  /**
   * Create appropriate biller service based on config
   */
  static create(config: BillerConfig): BaseBillerService {
    const features = config.features as any;

    // Airtime topups are handled via dedicated services (Services Overview), not via billers.
    if (
      config.billerType === BillerType.TNM_BUNDLES ||
      config.billerType === BillerType.AIRTEL_VALIDATION
    ) {
      throw new Error(
        `Biller type ${config.billerType} is not supported via billers. Use the airtime services instead.`
      );
    }

    // Validation-only billers
    if (features?.validationOnly) {
      return new ValidationBillerService(config);
    }

    // Bundle-based billers (Generic)
    if (features?.isBundleBased) {
      return new BundleBillerService(config);
    }

    // Invoice-based billers (Register General, SRWB Prepaid)
    if (
      features?.requiresTwoStep &&
      features?.supportsInvoice &&
      (config.billerType === BillerType.REGISTER_GENERAL ||
        config.billerType === BillerType.SRWB_PREPAID)
    ) {
      return new InvoiceBillerService(config);
    }

    // SOAP/XML-based billers (Water boards, MASM)
    if (
      config.billerType === BillerType.LWB_POSTPAID ||
      config.billerType === BillerType.BWB_POSTPAID ||
      config.billerType === BillerType.SRWB_POSTPAID ||
      config.billerType === BillerType.MASM
    ) {
      return new SoapBillerService(config);
    }

    // Default to SOAP service
    return new SoapBillerService(config);
  }
}
