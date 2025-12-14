import { BillerConfig, BillerType } from "@prisma/client";
import { BaseBillerService } from "./base";
import { SoapBillerService } from "./soap";
import { InvoiceBillerService } from "./invoice";
import { BundleBillerService } from "./bundle";
import { ValidationBillerService } from "./validation";

/**
 * Factory for creating biller service instances
 */
export class BillerServiceFactory {
  /**
   * Create appropriate biller service based on config
   */
  static create(config: BillerConfig): BaseBillerService {
    const features = config.features as any;

    // Validation-only billers
    if (features?.validationOnly) {
      return new ValidationBillerService(config);
    }

    // Bundle-based billers (TNM)
    if (features?.isBundleBased || config.billerType === BillerType.TNM_BUNDLES) {
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
