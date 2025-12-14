/**
 * Available KYC fields
 */
export const AVAILABLE_KYC_FIELDS = [
  'date_of_birth',
  'occupation',
  'employer_name',
  'source_of_funds',
  'id_number',
  'id_image',
  'nrb_validation'
] as const;

export type KYCField = typeof AVAILABLE_KYC_FIELDS[number];

/**
 * Available KYC rules
 */
export const AVAILABLE_KYC_RULES = [
  { key: 'minimum_age', label: 'Minimum Age (years)', type: 'number' },
  { key: 'id_required', label: 'ID Required', type: 'boolean' },
  { key: 'employment_verification', label: 'Employment Verification', type: 'boolean' },
  { key: 'source_of_funds_required', label: 'Source of Funds Required', type: 'boolean' },
  { key: 'nrb_verification', label: 'NRB Verification', type: 'boolean' }
] as const;

/**
 * Validate tier limits
 */
export function validateTierLimits(input: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Balance validations
  if (input.minimumBalance !== undefined && input.maximumBalance !== undefined) {
    if (Number(input.minimumBalance) > Number(input.maximumBalance)) {
      errors.push('Minimum balance must be less than or equal to maximum balance');
    }
  }

  // Transaction amount validations
  if (input.minTransactionAmount !== undefined && input.maxTransactionAmount !== undefined) {
    if (Number(input.minTransactionAmount) > Number(input.maxTransactionAmount)) {
      errors.push('Minimum transaction amount must be less than or equal to maximum transaction amount');
    }
  }

  // Transaction limit validations
  if (input.dailyTransactionLimit !== undefined && input.monthlyTransactionLimit !== undefined) {
    if (Number(input.dailyTransactionLimit) > Number(input.monthlyTransactionLimit)) {
      errors.push('Daily transaction limit cannot exceed monthly transaction limit');
    }
  }

  // Transaction count validations
  if (input.dailyTransactionCount !== undefined && input.monthlyTransactionCount !== undefined) {
    if (input.dailyTransactionCount > input.monthlyTransactionCount) {
      errors.push('Daily transaction count cannot exceed monthly transaction count');
    }
  }

  // Credit/Debt limits
  if (input.maximumCreditLimit !== undefined && input.monthlyTransactionLimit !== undefined) {
    if (Number(input.maximumCreditLimit) > Number(input.monthlyTransactionLimit)) {
      errors.push('Maximum credit limit cannot exceed monthly transaction limit');
    }
  }

  if (input.maximumDebtLimit !== undefined && input.monthlyTransactionLimit !== undefined) {
    if (Number(input.maximumDebtLimit) > Number(input.monthlyTransactionLimit)) {
      errors.push('Maximum debt limit cannot exceed monthly transaction limit');
    }
  }

  // Max transaction vs daily limit
  if (input.maxTransactionAmount !== undefined && input.dailyTransactionLimit !== undefined) {
    if (Number(input.maxTransactionAmount) > Number(input.dailyTransactionLimit)) {
      errors.push('Maximum transaction amount cannot exceed daily transaction limit');
    }
  }

  // Negative values check
  const numericFields = [
    'minimumBalance',
    'maximumBalance',
    'maximumCreditLimit',
    'maximumDebtLimit',
    'minTransactionAmount',
    'maxTransactionAmount',
    'dailyTransactionLimit',
    'monthlyTransactionLimit'
  ];

  for (const field of numericFields) {
    if (input[field] !== undefined && Number(input[field]) < 0) {
      errors.push(`${field} cannot be negative`);
    }
  }

  const intFields = ['dailyTransactionCount', 'monthlyTransactionCount'];
  for (const field of intFields) {
    if (input[field] !== undefined && input[field] < 0) {
      errors.push(`${field} cannot be negative`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate KYC fields
 */
export function validateKYCFields(fields: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const field of fields) {
    if (!AVAILABLE_KYC_FIELDS.includes(field as KYCField)) {
      errors.push(`Invalid KYC field: ${field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate KYC rules
 */
export function validateKYCRules(rules: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof rules !== 'object' || rules === null) {
    return { valid: true, errors: [] };
  }

  const validRuleKeys = AVAILABLE_KYC_RULES.map(r => r.key);

  for (const [key, value] of Object.entries(rules)) {
    if (!validRuleKeys.includes(key)) {
      errors.push(`Invalid KYC rule: ${key}`);
      continue;
    }

    const rule = AVAILABLE_KYC_RULES.find(r => r.key === key);
    
    if (rule?.type === 'number' && typeof value !== 'number') {
      errors.push(`${key} must be a number`);
    }

    if (rule?.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`${key} must be a boolean`);
    }

    // Specific validations
    if (key === 'minimum_age' && typeof value === 'number') {
      if (value < 0 || value > 150) {
        errors.push('Minimum age must be between 0 and 150');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Format currency (MWK)
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  return new Intl.NumberFormat('en-MW', {
    style: 'currency',
    currency: 'MWK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(num);
}

/**
 * Format large numbers with K, M suffixes
 */
export function formatCompactNumber(num: number | string): string {
  const value = typeof num === 'number' ? num : parseFloat(num);
  
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Get KYC field display name
 */
export function getKYCFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    date_of_birth: 'Date of Birth',
    occupation: 'Occupation',
    employer_name: 'Employer Name',
    source_of_funds: 'Source of Funds',
    id_number: 'ID Number',
    id_image: 'ID Image',
    nrb_validation: 'NRB Validation'
  };

  return labels[field] || field;
}

/**
 * Get KYC rule display name
 */
export function getKYCRuleLabel(rule: string): string {
  const ruleObj = AVAILABLE_KYC_RULES.find(r => r.key === rule);
  return ruleObj?.label || rule;
}

/**
 * Calculate percentage of limit used
 */
export function calculateLimitPercentage(
  used: number | string,
  limit: number | string
): number {
  const usedNum = typeof used === 'number' ? used : parseFloat(used);
  const limitNum = typeof limit === 'number' ? limit : parseFloat(limit);

  if (limitNum === 0) return 0;
  return Math.round((usedNum / limitNum) * 100);
}

/**
 * Get tier color based on position
 */
export function getTierColor(position: number): string {
  const colors = [
    'slate',    // Position 1
    'blue',     // Position 2
    'amber',    // Position 3
    'purple',   // Position 4
    'emerald',  // Position 5
    'rose'      // Position 6+
  ];

  return colors[position - 1] || colors[colors.length - 1];
}

/**
 * Get tier badge variant
 */
export function getTierBadgeVariant(position: number): 'default' | 'secondary' | 'outline' {
  if (position === 1) return 'outline';
  if (position === 2) return 'secondary';
  return 'default';
}
