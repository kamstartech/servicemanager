import { BillerConfig } from "@prisma/client";
import { BaseBillerService } from "./base";
import { SoapBillerService } from "./soap";
import { InvoiceBillerService } from "./invoice";
import { BundleBillerService } from "./bundle";
import { ValidationBillerService } from "./validation";
import { TnmBillerService } from "./providers/tnm-biller";
import { AirtelBillerService } from "./providers/airtel-biller";

// Enum surrogate
const BillerType = {
  TNM_BUNDLES: "tnm_bundles",
  AIRTEL_VALIDATION: "airtel_validation",
  REGISTER_GENERAL: "register_general",
  SRWB_PREPAID: "srwb_prepaid",
  LWB_POSTPAID: "lwb_postpaid",
  BWB_POSTPAID: "bwb_postpaid",
  SRWB_POSTPAID: "srwb_postpaid",
  MASM: "masm"
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

    // Specific providers take precedence
    if (config.billerType === BillerType.TNM_BUNDLES) {
      return new TnmBillerService(config);
    }

    if (config.billerType === BillerType.AIRTEL_VALIDATION) {
      return new AirtelBillerService(config);
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
