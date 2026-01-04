import { BillerDefinition } from "@/lib/config/biller-constants";
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
  static create(config: BillerDefinition): BaseBillerService {
    const features = config.features;

    // Airtime topups are handled via dedicated services (Services Overview), not via billers.
    if (
      config.type === BillerType.TNM_BUNDLES ||
      config.type === BillerType.AIRTEL_VALIDATION
    ) {
      throw new Error(
        `Biller type ${config.type} is not supported via billers. Use the airtime services instead.`
      );
    }

    // Validation-only billers
    if (features?.validationOnly) {
      return new ValidationBillerService(config as any);
    }

    // Bundle-based billers (Generic)
    if (features?.isBundleBased) {
      return new BundleBillerService(config as any);
    }

    // Invoice-based billers (Register General, SRWB Prepaid)
    if (
      features?.requiresTwoStep &&
      features?.supportsInvoice &&
      (config.type === BillerType.REGISTER_GENERAL ||
        config.type === BillerType.SRWB_PREPAID)
    ) {
      return new InvoiceBillerService(config as any);
    }

    // SOAP/XML-based billers (Water boards, MASM)
    if (
      config.type === BillerType.LWB_POSTPAID ||
      config.type === BillerType.BWB_POSTPAID ||
      config.type === BillerType.SRWB_POSTPAID ||
      config.type === BillerType.MASM
    ) {
      return new SoapBillerService(config as any);
    }

    // Default to SOAP service
    return new SoapBillerService(config as any);
  }
}
