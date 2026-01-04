
export interface BillerDefinition {
    type: string;
    name: string;
    displayName: string;
    description: string;
    isActive: boolean;
    features: {
        supportsInvoice: boolean;
        supportsBalanceCheck: boolean;
        requiresTwoStep: boolean;
        supportsAccountLookup: boolean;
        isBundleBased: boolean;
        validationOnly: boolean;
        requiresAccountType: boolean;
    };
    validationRules: {
        accountNumberFormat: string;
        minAmount: number;
        maxAmount: number;
    };
    supportedCurrencies: string[];
    defaultCurrency: string;
    baseUrl?: string; // For factory usage if needed
    endpoints?: Record<string, string>; // For factory usage if needed
}

export const BILLER_DEFINITIONS: BillerDefinition[] = [
    {
        type: "LWB_POSTPAID",
        name: "Lilongwe Water Board",
        displayName: "LWB Water Bill",
        description: "Lilongwe Water Board postpaid water bills",
        isActive: true,
        features: {
            supportsInvoice: false,
            supportsBalanceCheck: false,
            requiresTwoStep: false,
            supportsAccountLookup: true,
            isBundleBased: false,
            validationOnly: false,
            requiresAccountType: false,
        },
        validationRules: {
            accountNumberFormat: "^[0-9]{6,12}$",
            minAmount: 100,
            maxAmount: 1000000,
        },
        supportedCurrencies: ["MWK"],
        defaultCurrency: "MWK",
    },
    {
        type: "BWB_POSTPAID",
        name: "Blantyre Water Board",
        displayName: "BWB Water Bill",
        description: "Blantyre Water Board postpaid water bills",
        isActive: true,
        features: {
            supportsInvoice: false,
            supportsBalanceCheck: false,
            requiresTwoStep: false,
            supportsAccountLookup: true,
            isBundleBased: false,
            validationOnly: false,
            requiresAccountType: false,
        },
        validationRules: {
            accountNumberFormat: "^[0-9]{6,12}$",
            minAmount: 100,
            maxAmount: 1000000,
        },
        supportedCurrencies: ["MWK"],
        defaultCurrency: "MWK",
    },
    {
        type: "SRWB_POSTPAID",
        name: "Southern Region Water Board",
        displayName: "SRWB Water Bill",
        description: "Southern Region Water Board postpaid water bills",
        isActive: true,
        features: {
            supportsInvoice: false,
            supportsBalanceCheck: false,
            requiresTwoStep: false,
            supportsAccountLookup: true,
            isBundleBased: false,
            validationOnly: false,
            requiresAccountType: false,
        },
        validationRules: {
            accountNumberFormat: "^[0-9]{6,12}$",
            minAmount: 100,
            maxAmount: 1000000,
        },
        supportedCurrencies: ["MWK"],
        defaultCurrency: "MWK",
    },
    {
        type: "MASM",
        name: "MASM Electricity",
        displayName: "MASM Electricity",
        description: "Electricity bill payments and tokens",
        isActive: true,
        features: {
            supportsInvoice: false,
            supportsBalanceCheck: false,
            requiresTwoStep: false,
            supportsAccountLookup: true,
            isBundleBased: false,
            validationOnly: false,
            requiresAccountType: true,
        },
        validationRules: {
            accountNumberFormat: "^[0-9]{6,12}$",
            minAmount: 100,
            maxAmount: 1000000,
        },
        supportedCurrencies: ["MWK"],
        defaultCurrency: "MWK",
    },
    {
        type: "REGISTER_GENERAL",
        name: "Register General",
        displayName: "Register General",
        description: "Government payments",
        isActive: true,
        features: {
            supportsInvoice: true,
            supportsBalanceCheck: false,
            requiresTwoStep: true,
            supportsAccountLookup: true,
            isBundleBased: false,
            validationOnly: false,
            requiresAccountType: false,
        },
        validationRules: {
            accountNumberFormat: "^[0-9]+$",
            minAmount: 100,
            maxAmount: 1000000,
        },
        supportedCurrencies: ["MWK"],
        defaultCurrency: "MWK",
    },
    {
        type: "SRWB_PREPAID",
        name: "Southern Region Water Board (Prepaid)",
        displayName: "SRWB Prepaid",
        description: "Southern Region Water Board prepaid token purchase",
        isActive: true,
        features: {
            supportsInvoice: true,
            supportsBalanceCheck: false,
            requiresTwoStep: true,
            supportsAccountLookup: true,
            isBundleBased: false,
            validationOnly: false,
            requiresAccountType: false,
        },
        validationRules: {
            accountNumberFormat: "^[0-9]{6,12}$",
            minAmount: 100,
            maxAmount: 1000000,
        },
        supportedCurrencies: ["MWK"],
        defaultCurrency: "MWK",
    },
    {
        type: "TNM_AIRTIME",
        name: "TNM Airtime",
        displayName: "TNM Airtime",
        description: "TNM Airtime Topup",
        isActive: true,
        features: {
            supportsInvoice: false,
            supportsBalanceCheck: false,
            requiresTwoStep: false,
            supportsAccountLookup: false,
            isBundleBased: false,
            validationOnly: false,
            requiresAccountType: false,
        },
        validationRules: {
            accountNumberFormat: "^(088|099)[0-9]{7}$",
            minAmount: 50,
            maxAmount: 100000,
        },
        supportedCurrencies: ["MWK"],
        defaultCurrency: "MWK",
    },
    {
        type: "AIRTEL_AIRTIME",
        name: "Airtel Airtime",
        displayName: "Airtel Airtime",
        description: "Airtel Airtime Topup",
        isActive: true,
        features: {
            supportsInvoice: false,
            supportsBalanceCheck: false,
            requiresTwoStep: false,
            supportsAccountLookup: false,
            isBundleBased: false,
            validationOnly: false,
            requiresAccountType: false,
        },
        validationRules: {
            accountNumberFormat: "^(099)[0-9]{7}$",
            minAmount: 50,
            maxAmount: 100000,
        },
        supportedCurrencies: ["MWK"],
        defaultCurrency: "MWK",
    }
];

export function getBillerDefinition(type: string): BillerDefinition | undefined {
    return BILLER_DEFINITIONS.find(b => b.type === type);
}
