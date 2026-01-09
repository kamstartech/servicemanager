import { WorkflowStep, TriggerTiming } from '@prisma/client';

/**
 * Shared types for workflow execution
 */

export interface ExecutionContext {
  userId: string;
  sessionId: string;
  transferContext?: string; // MobileUserContext (MOBILE_BANKING or WALLET)
  source?: string; // TransactionSource (MOBILE_BANKING or WALLET)
  variables: Record<string, any>;
}

export interface StepExecutionRequest {
  step: WorkflowStep;
  executionId: string;
  context: ExecutionContext;
  input?: any;
  timing: TriggerTiming;
}

export interface WorkflowError {
  title?: string;
  message?: string;
  code?: string;
  type?: 'POPUP' | 'BANNER' | 'FIELD' | 'SNACKBAR';
  details?: any;
}

export interface StepExecutionResponse {
  success: boolean;
  output?: any;
  error?: string;
  structuredError?: WorkflowError;
  shouldProceed: boolean;
}

export interface T24TransferRequest {
  fromAccount: string;
  toAccount: string;
  amount: string;
  currency: string;
  description: string;
  reference: string;
  transferType: any;
  bankCode?: string;
  bankName?: string;
}
