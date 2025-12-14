export type ProcessStageStatus = 'started' | 'completed' | 'failed' | 'skipped';

export interface ProcessStage {
  stage: string;
  status: ProcessStageStatus;
  timestamp: string;
  duration?: number;
  details?: string;
  error?: string;
}

export const VALIDATION_STAGES = {
  DUPLICATE_CHECK: 'duplicate_check',
  UPDATE_USER_INFO: 'update_user_info',
  T24_LOOKUP: 't24_lookup',
  ACCOUNT_VALIDATION: 'account_validation',
  STATUS_UPDATE: 'status_update',
} as const;

export const STAGE_LABELS: Record<string, string> = {
  duplicate_check: 'Duplicate Check',
  update_user_info: 'Update User Information',
  t24_lookup: 'T24 Account Lookup',
  account_validation: 'Account Validation',
  status_update: 'Status Update',
};
