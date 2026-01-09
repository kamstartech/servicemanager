import { workflowSessionStore } from './session-store';
import { prisma } from '@/lib/db/prisma';
import { ESBSMSService } from '@/lib/services/sms/sms-service';
import { emailService } from '@/lib/services/email';
import { t24Service } from '@/lib/services/t24-service';
import { billerEsbService } from '@/lib/services/billers/biller-esb-service';
import { FundReservationService } from '@/lib/services/fund-reservation-service';
import { airtimeService } from '@/lib/services/airtime/airtime-service';
import { billerTransactionService } from "../billers/transactions";
import { getBillerDefinition } from "@/lib/config/biller-constants";
import { configurationService } from '@/lib/services/configuration-service';
import {
  WorkflowStep,
  TriggerTiming,
  TransferType
} from '@prisma/client';

interface ExecutionContext {
  userId: string;
  sessionId: string;
  transferContext?: string; // MobileUserContext (MOBILE_BANKING or WALLET)
  source?: string; // TransactionSource (MOBILE_BANKING or WALLET)
  variables: Record<string, any>;
}

interface StepExecutionRequest {
  step: WorkflowStep;
  executionId: string;
  context: ExecutionContext;
  input?: any;
  timing: TriggerTiming;
}

interface WorkflowError {
  title?: string;
  message?: string;
  code?: string;
  type?: 'POPUP' | 'BANNER' | 'FIELD' | 'SNACKBAR';
  details?: any;
}

interface StepExecutionResponse {
  success: boolean;
  output?: any;
  error?: string;
  structuredError?: WorkflowError;
  shouldProceed: boolean;
}

export class WorkflowExecutor {

  private async getNextActiveStepId(
    workflowId: string,
    currentStepId: string
  ): Promise<string | null> {
    const steps = await prisma.workflowStep.findMany({
      where: {
        workflowId,
        isActive: true,
      },
      orderBy: { order: 'asc' },
      select: { id: true },
    });

    const index = steps.findIndex((s) => s.id === currentStepId);
    if (index < 0) {
      return null;
    }

    return steps[index + 1]?.id ?? null;
  }

  /**
   * Start a new workflow execution
   */
  async startWorkflow(
    workflowId: string,
    userId: string,
    sessionId: string,
    initialContext: any = {}
  ) {
    // Verify workflow exists and is active
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        steps: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (!workflow.isActive) {
      throw new Error('Workflow is not active');
    }

    // Create execution record
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId,
        userId,
        sessionId,
        status: 'IN_PROGRESS',
        currentStepId: workflow.steps[0]?.id
      },
      include: {
        workflow: {
          include: {
            steps: {
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });

    // Initialize Redis session context
    await workflowSessionStore.setContext(sessionId, {
      userId,
      workflowId,
      executionId: execution.id,
      ...initialContext
    });

    return execution;
  }

  /**
   * Execute a workflow step
   */
  async executeStep(
    executionId: string,
    stepId: string,
    stepInput: any,
    timing: TriggerTiming
  ): Promise<StepExecutionResponse> {
    console.log(`[WorkflowExecutor] executeStep starting: executionId=${executionId}, stepId=${stepId}, timing=${timing}`);
    console.log(`[WorkflowExecutor] executeStep input:`, JSON.stringify(stepInput, null, 2));

    // Get execution details
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId }
    });

    if (!execution) {
      throw new Error('Workflow execution not found');
    }

    if (execution.status !== 'IN_PROGRESS') {
      throw new Error(`Workflow execution is ${execution.status}`);
    }

    // Get step details
    const step = await prisma.workflowStep.findUnique({
      where: { id: stepId }
    });

    if (step) {
      console.log(`[WorkflowExecutor] Step Details: type=${step.type}, mode=${step.executionMode}, timing=${step.triggerTiming}`);
    }

    if (!step) {
      throw new Error('Workflow step not found');
    }

    // Get current context from Redis
    const context = await workflowSessionStore.getContext(execution.sessionId);

    // OTP step: handled internally (no triggerEndpoint required)
    if (step.type === 'OTP') {
      const otpKey = `otp_${stepId}`;
      const otpState = (context?.[otpKey] ?? null) as
        | {
          code: string;
          expiresAt: string;
          attempts: number;
          sentTo?: string;
          sentAt?: string;
        }
        | null;

      if (timing === 'BEFORE_STEP') {
        // Resolve destinations based on preferences and availability
        const userIdInt = parseInt(String(execution.userId), 10);
        const user = await prisma.mobileUser.findUnique({
          where: { id: userIdInt },
          select: { phoneNumber: true, username: true, smsNotifications: true, emailNotifications: true },
        });
        const profile = await prisma.mobileUserProfile.findUnique({
          where: { mobileUserId: userIdInt },
          select: { email: true },
        });

        const phone = user?.phoneNumber?.toString();
        const email = profile?.email?.toString();

        const sendSMS = !!(phone && user?.smsNotifications);
        const sendEmail = !!(email && user?.emailNotifications);

        if (!sendSMS && !sendEmail) {
          return {
            success: false,
            shouldProceed: false,
            error: 'No phone number or email is enabled for OTP delivery on this account',
          };
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        const sentToDetails: string[] = [];
        if (sendSMS) sentToDetails.push(phone!);
        if (sendEmail) sentToDetails.push(email!);
        const sentTo = sentToDetails.join(", ");

        await workflowSessionStore.updateContext(execution.sessionId, {
          [otpKey]: {
            code,
            expiresAt: expiresAt.toISOString(),
            attempts: 0,
            sentTo,
            sentAt: new Date().toISOString(),
          },
        });

        if (sendEmail) {
          await emailService.sendOTP(
            email!,
            code,
            user?.username?.toString() || String(execution.userId)
          ).catch(err => console.error("Workflow Email OTP failed:", err));
        }

        if (sendSMS) {
          const smsResult = await ESBSMSService.sendOTP(phone!, code, userIdInt);
          if (!smsResult.success && !sendEmail) {
            return {
              success: false,
              shouldProceed: false,
              error: smsResult.error || 'Failed to send OTP via SMS',
            };
          }
        }

        return {
          success: true,
          shouldProceed: true,
          output: {
            sentTo: sendSMS && sendEmail ? 'phone and email' : sendSMS ? 'phone' : 'email',
            expiresInSeconds: 600,
          },
        };
      }

      if (timing === 'AFTER_STEP') {
        const submitted =
          stepInput?.otpCode?.toString() ??
          stepInput?.code?.toString() ??
          stepInput?.otp?.toString() ??
          '';

        if (!otpState) {
          return {
            success: false,
            shouldProceed: false,
            error: 'OTP session not initialized. Please request a new code.',
          };
        }

        if (!submitted) {
          return {
            success: false,
            shouldProceed: false,
            error: 'OTP code is required',
          };
        }

        const attempts = typeof otpState.attempts === 'number' ? otpState.attempts : 0;
        if (attempts >= 5) {
          return {
            success: false,
            shouldProceed: false,
            error: 'Too many failed attempts. Please request a new code.',
          };
        }

        const expiresAt = otpState.expiresAt ? new Date(otpState.expiresAt) : null;
        if (expiresAt && new Date() > expiresAt) {
          return {
            success: false,
            shouldProceed: false,
            error: 'OTP expired. Please request a new code.',
          };
        }

        if (otpState.code !== submitted) {
          await workflowSessionStore.updateContext(execution.sessionId, {
            [otpKey]: {
              ...otpState,
              attempts: attempts + 1,
            },
          });

          return {
            success: false,
            shouldProceed: false,
            error: 'Invalid OTP code',
          };
        }

        // OTP verified: clear OTP state to prevent reuse
        await workflowSessionStore.updateContext(execution.sessionId, {
          [otpKey]: null,
        });

        const nextStepId = await this.getNextActiveStepId(
          execution.workflowId,
          stepId
        );

        await prisma.workflowExecution.update({
          where: { id: executionId },
          data: { currentStepId: nextStepId },
        });

        return {
          success: true,
          shouldProceed: true,
          output: { verified: true },
        };
      }
    }

    // Check if this step requires trigger at this timing
    if (
      step.executionMode === 'CLIENT_ONLY' ||
      (step.triggerTiming !== timing && step.triggerTiming !== 'BOTH' && !(step.triggerTiming === 'IMMEDIATE' && timing === 'BEFORE_STEP'))
    ) {
      // No trigger needed, just store input if provided
      if (timing === 'AFTER_STEP' && stepInput) {
        const stepKey = this.getStepKey(step);
        await workflowSessionStore.updateContext(execution.sessionId, {
          [stepKey]: stepInput,
          [`${stepKey}_result`]: stepInput // Store alias for consistency with server steps
        });
      }

      if (timing === 'AFTER_STEP') {
        const nextStepId = await this.getNextActiveStepId(
          execution.workflowId,
          stepId
        );

        if (nextStepId) {
          await prisma.workflowExecution.update({
            where: { id: executionId },
            data: { currentStepId: nextStepId },
          });
        } else {
          // No more steps, complete workflow
          await this.completeWorkflow(executionId);
        }
      }

      // Extend session TTL
      await workflowSessionStore.extendSession(execution.sessionId);

      return {
        success: true,
        shouldProceed: true
      };
    }

    // Store input in context if provided
    if (timing === 'AFTER_STEP' && stepInput) {
      const stepKey = this.getStepKey(step);
      context[stepKey] = stepInput;
      await workflowSessionStore.updateContext(execution.sessionId, context);
    }

    // Execute backend trigger
    try {
      // Look up user's account context for transaction tracking
      let transferContext: string | undefined;
      try {
        const userIdInt = parseInt(execution.userId);
        const primaryAccount = await prisma.mobileUserAccount.findFirst({
          where: {
            mobileUserId: userIdInt,
            isPrimary: true
          },
          select: { context: true }
        });

        if (primaryAccount) {
          transferContext = primaryAccount.context;
        }
      } catch (e) {
        console.warn(`[WorkflowExecutor] Could not determine transferContext for user ${execution.userId}:`, e);
      }

      const executionContext: ExecutionContext = {
        userId: execution.userId,
        sessionId: execution.sessionId,
        transferContext,
        source: transferContext === 'WALLET' ? 'WALLET' : 'MOBILE_BANKING',
        variables: context
      };

      console.log(`[WorkflowExecutor] Executing backend trigger for step ${stepId}`);
      console.log(`[WorkflowExecutor] ExecutionContext variables keys:`, Object.keys(context));

      const result = await this.executeTrigger({
        step,
        executionId,
        context: executionContext,
        input: stepInput,
        timing
      });

      // Store trigger result in context
      if (result.output) {
        const stepKey = this.getStepKey(step);
        await workflowSessionStore.updateContext(execution.sessionId, {
          [`${stepKey}_result`]: result.output
        });
      }

      // Extend session TTL
      await workflowSessionStore.extendSession(execution.sessionId);

      if (timing === 'AFTER_STEP' && result.shouldProceed) {
        const nextStepId = await this.getNextActiveStepId(
          execution.workflowId,
          stepId
        );

        if (nextStepId) {
          await prisma.workflowExecution.update({
            where: { id: executionId },
            data: { currentStepId: nextStepId },
          });
        } else {
          // No more steps, complete workflow
          // Note: Trigger return value will be the step result, not the workflow completion result
          // But completeWorkflow is called side-effectually here
          await this.completeWorkflow(executionId);
        }
      }

      return result;

    } catch (error: any) {
      console.error(`[WorkflowExecutor] Step execution failed for step ${stepId}:`, error);


      // Check if retry is configured
      if (step.retryConfig) {
        const retryConfig = step.retryConfig as any;
        // TODO: Implement retry logic
      }

      return {
        success: false,
        error: error.message || 'Step execution failed',
        shouldProceed: false
      };
    }
  }

  /**
   * Complete workflow execution
   */
  async completeWorkflow(executionId: string) {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: {
        workflow: {
          include: {
            steps: {
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });

    if (!execution) {
      throw new Error('Workflow execution not found');
    }

    // Get final accumulated context from Redis
    const finalContext = await workflowSessionStore.getContext(execution.sessionId);

    // Map data according to workflow configuration
    const mappedData = this.mapContextToAPI(execution.workflow, finalContext);

    // Find final API step or Transaction step to determine result validation
    const sortedSteps = execution.workflow.steps.sort((a, b) => b.order - a.order);
    const finalStep = sortedSteps[0];
    const finalApiStep = sortedSteps.find(s => s.type === 'API_CALL');

    let finalResult: any = null;

    // Submit to final API if configured
    if (finalApiStep && finalApiStep.triggerEndpoint) {
      try {
        finalResult = await this.submitToAPI(finalApiStep, mappedData);
        console.log('✅ POST_TRANSACTION response:', JSON.stringify(finalResult, null, 2));
      } catch (error: any) {
        console.error('Final API submission failed:', error);

        // Update execution as failed
        const errorMsg = error.message || 'API submission failed';
        await prisma.workflowExecution.update({
          where: { id: executionId },
          data: {
            status: 'FAILED',
            error: errorMsg,
            completedAt: new Date()
          }
        });

        return {
          success: false,
          result: mappedData,
          executionId,
          error: errorMsg,
          structuredError: {
            title: 'Submission Failed',
            message: errorMsg,
            code: 'API_ERROR',
            type: 'POPUP'
          }
        };
      }
    }

    // If no final API call, try to use the result of the last step
    if (!finalResult && finalStep) {
      const stepKey = this.getStepKey(finalStep);
      // Results are stored with _result suffix
      const stepResult = finalContext[`${stepKey}_result`];

      if (stepResult) {
        console.log(`✅ Using result from last step (${finalStep.type}):`, JSON.stringify(stepResult, null, 2));
        finalResult = {
          success: true,
          result: stepResult,
          transaction: stepResult?.transaction || stepResult // Fallback
        };
      }
    }

    // Update execution with final result
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        finalResult: finalResult || mappedData
      }
    });

    // Clean up Redis session data
    await workflowSessionStore.clearSession(execution.sessionId);

    console.log('✅ POST_TRANSACTION response:', JSON.stringify(finalResult, null, 2));

    // Transform the result into a display-ready format for mobile
    // Pass the final step so we can use configured success/failure messages
    const displayResult = this.formatForDisplay(finalResult || mappedData, finalStep);

    console.log('🎯 Workflow completion - display result:', JSON.stringify(displayResult, null, 2));

    return {
      success: true,
      result: displayResult
    };
  }

  /**
   * Format transaction result for mobile display
   */
  private formatForDisplay(apiResult: any, finalStep?: any): any {
    // Extract configured messages from workflow step config
    const configuredSuccessMsg = finalStep?.config?.successMessage as string | undefined;
    const configuredFailureMsg = finalStep?.config?.failureMessage as string | undefined;

    // Check if this is a POST_TRANSACTION response
    if (apiResult && typeof apiResult === 'object') {
      const transactionSuccess = apiResult.success === true;
      const transaction = apiResult.transaction;
      const result = apiResult.result || {};

      if (transactionSuccess) {
        return {
          displayType: 'SUCCESS',
          title: 'Transaction Successful',
          // Priority: configured message > API response > default
          message: configuredSuccessMsg || result.message || apiResult.message || 'Your transaction was completed successfully',
          transactionReference: transaction?.ourTransactionId || transaction?.id || result.transactionId || 'N/A',
          rawData: apiResult // Include raw data for debugging
        };
      } else {
        return {
          displayType: 'FAILURE',
          title: 'Transaction Failed',
          // Priority: configured message > API error > default
          message: configuredFailureMsg || apiResult.error || result.error || apiResult.message || 'Transaction could not be completed. Please try again.',
          transactionReference: transaction?.ourTransactionId || transaction?.id || null,
          rawData: apiResult // Include raw data for debugging
        };
      }
    }

    // Fallback for unknown format
    return {
      displayType: 'FAILURE',
      title: 'Transaction Status Unknown',
      message: configuredFailureMsg || 'Unable to determine transaction status. Please contact support.',
      transactionReference: null,
      rawData: apiResult
    };
  }

  /**
   * Cancel workflow execution
   */
  async cancelWorkflow(executionId: string, reason?: string) {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId }
    });

    if (!execution) {
      throw new Error('Workflow execution not found');
    }

    // Update execution status
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'CANCELLED',
        error: reason,
        completedAt: new Date()
      }
    });

    // Clean up Redis session data
    await workflowSessionStore.clearSession(execution.sessionId);

    return true;
  }

  /**
   * Execute trigger for a step
   */
  private async executeTrigger(
    request: StepExecutionRequest
  ): Promise<StepExecutionResponse> {
    const { step, context, input } = request;

    // Support built-in POST_TRANSACTION if no endpoint is configured
    if (step.type === 'POST_TRANSACTION' && !step.triggerEndpoint) {
      console.log(`[WorkflowExecutor] Handling POST_TRANSACTION step ${step.id}`);
      return this.handlePostTransactionStep(step, context, input);
    }

    if (step.type === 'BILL_TRANSACTION') {
      return this.handleBillTransactionStep(step, context, input);
    }

    // Handle different execution modes
    switch (step.executionMode) {
      case 'SERVER_SYNC':
        return this.handleServerSyncStep(step, context, input);

      case 'SERVER_ASYNC':
        return this.handleServerAsyncStep(step, context, input);

      case 'SERVER_VALIDATION':
        return this.handleServerValidationStep(step, context, input);

      default:
        return {
          success: true,
          shouldProceed: true
        };
    }
  }

  /**
   * Handle synchronous server step
   */
  private async handleServerSyncStep(
    step: WorkflowStep,
    context: ExecutionContext,
    input: any
  ): Promise<StepExecutionResponse> {
    if (!step.triggerEndpoint) {
      return {
        success: false,
        error: 'Trigger endpoint not configured for sync step',
        structuredError: {
          title: 'Configuration Error',
          message: 'Server trigger is not configured for this step.',
          code: 'CONFIG_ERROR',
          type: 'BANNER'
        },
        shouldProceed: false
      };
    }

    const result = await this.makeAPICall(
      step.triggerEndpoint,
      step.triggerConfig,
      context,
      input,
      step.timeoutMs || 30000
    );

    return {
      success: result.success,
      output: result.data,
      error: result.error,
      shouldProceed: result.success
    };
  }

  /**
   * Handle asynchronous server step (fire and forget)
   */
  private async handleServerAsyncStep(
    step: WorkflowStep,
    context: ExecutionContext,
    input: any
  ): Promise<StepExecutionResponse> {
    if (!step.triggerEndpoint) {
      throw new Error('Trigger endpoint not configured for async step');
    }

    // Fire and forget - don't wait for response
    this.makeAPICall(
      step.triggerEndpoint,
      step.triggerConfig,
      context,
      input,
      step.timeoutMs || 30000
    ).catch(error => {
      console.error('Async step trigger failed:', error);
    });

    return {
      success: true,
      shouldProceed: true,
      output: { message: 'Async trigger initiated' }
    };
  }

  /**
   * Handle validation step
   */
  private async handleServerValidationStep(
    step: WorkflowStep,
    context: ExecutionContext,
    input: any
  ): Promise<StepExecutionResponse> {
    if (!step.triggerEndpoint) {
      return {
        success: false,
        error: 'Trigger endpoint not configured for validation step',
        structuredError: {
          title: 'Configuration Error',
          message: 'Validation endpoint is missing for this step.',
          code: 'CONFIG_ERROR',
          type: 'BANNER'
        },
        shouldProceed: false
      };
    }

    const result = await this.makeAPICall(
      step.triggerEndpoint,
      step.triggerConfig,
      context,
      input,
      step.timeoutMs || 10000
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Validation failed',
        shouldProceed: false
      };
    }

    return {
      success: true,
      output: result.data,
      shouldProceed: true
    };
  }

  /**
   * Handle built-in transaction processing for POST_TRANSACTION step
   */
  private async handlePostTransactionStep(
    step: WorkflowStep,
    context: ExecutionContext,
    input: any
  ): Promise<StepExecutionResponse> {
    const config = (step.config as any) || {};
    const mapping = config.parameterMapping || {};

    // Debug logging for variable resolution
    console.log(`[WorkflowExecutor] POST_TRANSACTION Debug:`);
    console.log(`  Step ID: ${step.id}`);
    console.log(`  Context variables keys:`, Object.keys(context.variables || {}));
    console.log(`  Context variables (full):`, JSON.stringify(context.variables, null, 2));
    console.log(`  Parameter mapping (raw templates):`, JSON.stringify(mapping, null, 2));
    console.log(`  Step input:`, JSON.stringify(input, null, 2));

    if (Object.keys(mapping).length === 0) {
      return {
        success: false,
        error: 'Parameter mapping missing for transaction step',
        shouldProceed: false
      };
    }

    // Resolve variables in mapping
    const resolvedParams: Record<string, any> = {};
    for (const [key, template] of Object.entries(mapping)) {
      if (typeof template === 'string') {
        const resolved = this.resolveVariables(template, context, input);
        resolvedParams[key] = resolved;
        // Log if template wasn't resolved (still contains {{ }})
        if (resolved.includes('{{') || resolved.includes('}}')) {
          console.warn(`  ⚠️ UNRESOLVED: ${key} = "${template}" → "${resolved}"`);
        } else {
          console.log(`  ✓ RESOLVED: ${key} = "${template}" → "${resolved}"`);
        }
      } else {
        resolvedParams[key] = template;
      }
    }

    console.log(`[WorkflowExecutor] Resolved params for transaction:`, JSON.stringify(resolvedParams, null, 2));

    // Determine transfer type from config or resolved params
    let transferType: TransferType = TransferType.FDH_BANK; // default
    const configTransferType = config.transferType || config.transactionType;

    if (configTransferType === 'EXTERNAL_BANK' || resolvedParams.transferType === 'EXTERNAL_BANK') {
      transferType = TransferType.EXTERNAL_BANK;
    } else if (configTransferType === 'FDH_WALLET' || configTransferType === 'WALLET') {
      transferType = TransferType.FDH_WALLET;
    } else if (configTransferType === 'EXTERNAL_WALLET') {
      transferType = TransferType.EXTERNAL_WALLET;
    } else if (configTransferType === 'SELF') {
      transferType = TransferType.SELF;
    }

    // Map resolved params to T24TransferRequest
    const transferRequest: any = {
      fromAccount: resolvedParams.fromAccountNumber || resolvedParams.fromAccount,
      toAccount: resolvedParams.toAccountNumber || resolvedParams.toAccount,
      amount: resolvedParams.amount?.toString(),
      currency: resolvedParams.currency || 'MWK',
      description: resolvedParams.description || step.label || 'Workflow Transaction',
      reference: resolvedParams.reference || `WF-${context.sessionId.slice(-8)}`,
      transferType
    };

    // Add external bank fields if applicable
    if (transferType === TransferType.EXTERNAL_BANK) {
      transferRequest.bankCode = resolvedParams.bankCode;
      // bankName will be looked up from ExternalBank table during transaction creation
    }

    if (!transferRequest.fromAccount || !transferRequest.toAccount || !transferRequest.amount) {
      return {
        success: false,
        error: `Missing required transaction data: ${!transferRequest.fromAccount ? 'Source Account, ' : ''}${!transferRequest.toAccount ? 'Destination Account, ' : ''}${!transferRequest.amount ? 'Amount' : ''}`,
        shouldProceed: false
      };
    }

    // Validate bankCode for EXTERNAL_BANK transfers
    if (transferType === TransferType.EXTERNAL_BANK && !transferRequest.bankCode) {
      return {
        success: false,
        error: 'Missing required field: Bank Code',
        shouldProceed: false
      };
    }

    try {
      console.log(`[WorkflowExecutor] Executing transfer for step: ${step.id}, type: ${transferType}`);

      // FDH_BANK internal transfers: Direct T24 call
      if (transferType === TransferType.FDH_BANK) {
        console.log(`[WorkflowExecutor] FDH-to-FDH: Direct T24 transfer`);
        const result = await t24Service.transfer(transferRequest);

        if (!result.success) {
          const errorMessage = this.extractT24ErrorMessage(result);
          console.log('[WorkflowExecutor] T24 transaction failed:', errorMessage);

          return {
            success: false,
            error: errorMessage,
            structuredError: {
              title: 'Transaction Error',
              message: errorMessage,
              code: result.errorCode || 'T24_ERROR',
              type: 'POPUP',
              details: result.message
            },
            shouldProceed: false
          };
        }

        // Save successful transfer to FdhTransaction table
        const reference = result.t24Reference || `WF-${context.sessionId.slice(-8)}`;
        const amountNum = parseFloat(transferRequest.amount);

        try {
          const transaction = await prisma.fdhTransaction.create({
            data: {
              type: 'TRANSFER',
              source: (context.source || 'MOBILE_BANKING') as any,
              reference,
              status: 'COMPLETED',
              transferType: transferType,
              transferContext: (context.transferContext || 'MOBILE_BANKING') as any,
              amount: amountNum,
              currency: transferRequest.currency,
              description: transferRequest.description,
              fromAccountNumber: transferRequest.fromAccount,
              toAccountNumber: transferRequest.toAccount,
              initiatedByUserId: context.userId ? parseInt(context.userId) : null,
              t24Reference: result.t24Reference,
              t24Response: result as any,
              completedAt: new Date()
            }
          });
          console.log(`[WorkflowExecutor] FdhTransaction saved: ${transaction.id}`);
        } catch (e) {
          console.error('[WorkflowExecutor] Failed to save FdhTransaction:', e);
          // Don't fail the workflow - transfer already succeeded
        }

        return {
          success: true,
          output: {
            t24Reference: result.t24Reference,
            externalReference: result.externalReference,
            status: 'COMPLETED',
            message: result.message
          },
          shouldProceed: true
        };
      }

      // External transfers (EXTERNAL_BANK, EXTERNAL_WALLET, etc): Fund reservation flow
      console.log(`[WorkflowExecutor] External transfer: Using fund reservation flow`);
      const amount = parseFloat(transferRequest.amount);
      const description = transferRequest.description; // Use description as-is without prefix

      // Step 1: Hold funds (debit user → suspense account)
      console.log(`[WorkflowExecutor] Holding funds: ${amount} from ${transferRequest.fromAccount}`);
      const holdResult = await FundReservationService.holdFunds(
        amount,
        transferRequest.fromAccount,
        transferRequest.reference,
        description
      );

      if (!holdResult.success) {
        return {
          success: false,
          error: `Failed to debit account: ${holdResult.error}`,
          structuredError: {
            title: 'Debit Failed',
            message: holdResult.error || 'Could not debit your account',
            code: 'HOLD_FAILED',
            type: 'POPUP'
          },
          shouldProceed: false
        };
      }

      const holdReference = holdResult.transactionReference || '';
      console.log(`[WorkflowExecutor] Funds held with reference: ${holdReference}`);

      // Step 2: Lookup external bank details if bankCode provided
      let bankName = null;
      if (transferRequest.bankCode) {
        try {
          const externalBank = await prisma.externalBank.findUnique({
            where: { code: transferRequest.bankCode }
          });
          if (externalBank) {
            bankName = externalBank.name;
            console.log(`[WorkflowExecutor] Looked up bank: ${bankName} (${transferRequest.bankCode})`);
          } else {
            console.warn(`[WorkflowExecutor] Bank code ${transferRequest.bankCode} not found in ExternalBank table`);
          }
        } catch (e) {
          console.error(`[WorkflowExecutor] Failed to lookup external bank:`, e);
          // Continue without bank name - not critical
        }
      }

      // Step 3: Record transaction as COMPLETED after successful hold
      console.log(`[WorkflowExecutor] Recording transaction for ${transferType}`);
      try {
        const transaction = await prisma.fdhTransaction.create({
          data: {
            type: 'TRANSFER',
            source: (context.source || 'MOBILE_BANKING') as any,
            reference: holdReference,
            status: 'COMPLETED',
            transferType: transferType,
            transferContext: (context.transferContext || 'MOBILE_BANKING') as any,
            amount: amount,
            currency: transferRequest.currency,
            description: description,
            fromAccountNumber: transferRequest.fromAccount,
            toAccountNumber: transferRequest.toAccount,
            toBankCode: transferRequest.bankCode || null,
            toBankName: bankName,
            initiatedByUserId: context.userId ? parseInt(context.userId) : null,
            t24Reference: holdReference,
            t24Response: holdResult as any,
            completedAt: new Date()
          }
        });
        console.log(`[WorkflowExecutor] FdhTransaction saved: ${transaction.id}`);

        return {
          success: true,
          output: {
            t24Reference: holdReference,
            transactionId: transaction.id,
            status: 'COMPLETED',
            message: 'Transfer completed successfully'
          },
          shouldProceed: true
        };
      } catch (e) {
        console.error('[WorkflowExecutor] Failed to save FdhTransaction:', e);
        // If DB fails after hold, release the funds
        await FundReservationService.releaseFunds(
          amount,
          transferRequest.fromAccount,
          holdReference,
          `Reversal: DB Failure - ${description}`
        );
        return {
          success: false,
          error: 'System error: Could not record transaction',
          structuredError: {
            title: 'System Error',
            message: 'Could not record transaction. Funds have been returned.',
            code: 'DB_ERROR',
            type: 'POPUP'
          },
          shouldProceed: false
        };
      }
    } catch (error: any) {
      console.error('Transfer execution failed:', error);
      return {
        success: false,
        error: error.message || 'Transfer failed',
        shouldProceed: false
      };
    }
  }

  /**
   * Handle BILL_TRANSACTION step
   */
  private async handleBillTransactionStep(
    step: WorkflowStep,
    context: ExecutionContext,
    input: any
  ): Promise<StepExecutionResponse> {
    console.log(`[WorkflowExecutor] handleBillTransactionStep input:`, JSON.stringify(input, null, 2));
    const config = (step.config as any) || {};
    const mapping = config.parameterMapping || {};
    const billerType = config.billerType;

    if (!billerType) {
      return {
        success: false,
        error: 'Biller type not configured',
        shouldProceed: false
      };
    }

    if (Object.keys(mapping).length === 0) {
      return {
        success: false,
        error: 'Parameter mapping missing for bill transaction',
        shouldProceed: false
      };
    }

    // Resolve variables in mapping
    const resolvedParams: Record<string, any> = {};
    for (const [key, template] of Object.entries(mapping)) {
      if (typeof template === 'string') {
        resolvedParams[key] = this.resolveVariables(template, context, input);
      } else {
        resolvedParams[key] = template;
      }
    }

    try {
      console.log(`[WorkflowExecutor] Executing bill payment for ${billerType}`);

      // Hybrid Flow Logic:
      // 1. Airtime (Airtel/TNM): Transactional Flow (Debit User -> Audit/Suspense -> Topup API -> [Fail? Reverse])
      //    Reason: Topup API is Agent-based and doesn't accept debitAccount override.
      // 2. Others (Water, Govt): Direct Flow (Debit User via API)
      //    Reason: API accepts debitAccount override.

      if (billerType === 'AIRTEL_AIRTIME' || billerType === 'TNM_AIRTIME') {
        return this.handleAirtimeTransaction(billerType, resolvedParams, context);
      } else {
        return this.handleDirectBillerTransaction(billerType, resolvedParams, context);
      }

    } catch (error: any) {
      console.error('Bill payment failed:', error);
      return {
        success: false,
        error: error.message || 'Bill payment failed',
        shouldProceed: false
      };
    }
  }

  /**
   * Handle Airtime Transaction (Hold -> Topup -> [Reverse])
   */
  public async handleAirtimeTransaction(
    billerType: string,
    params: any,
    context: ExecutionContext
  ): Promise<StepExecutionResponse> {
    const amount = parseFloat(params.amount);
    const sourceAccount = params.debitAccount;
    const msisdn = params.phoneNumber || params.accountNumber;

    if (!sourceAccount) {
      return { success: false, error: "Debit account required for Airtime", shouldProceed: false };
    }

    let transaction: any; // FDH Transaction (Financial)
    let billerTransaction: any; // Biller Audit Transaction
    let reference = '';
    let description = '';

    // Create description for T24 call
    const billerDefinition = getBillerDefinition(billerType);
    const billerTypeName = billerDefinition?.name ||
      billerType.split('_').map(word =>
        word.charAt(0) + word.slice(1).toLowerCase()
      ).join(' ');
    description = `${billerTypeName} - MWK ${amount.toLocaleString()} to ${msisdn} from ${sourceAccount}`;

    // 1. Hold Funds (Debit User -> Suspense) - DO THIS FIRST to get T24 Reference
    console.log(`[WorkflowExecutor] Holding funds for airtime (T24-first): ${amount} from ${sourceAccount}`);
    const holdResult = await FundReservationService.holdFunds(
      amount,
      sourceAccount,
      '', // No internal reference yet
      description
    );

    if (!holdResult.success) {
      return {
        success: false,
        error: `Failed to debit account: ${holdResult.error}`,
        shouldProceed: false
      };
    }

    // Now we have the T24 Reference (FT...)
    reference = holdResult.transactionReference || '';

    // 2. Create Transaction Records using T24 Reference
    try {
      // Create Biller Audit Record
      billerTransaction = await billerTransactionService.createTransaction({
        billerType,
        billerName: billerDefinition?.name || billerType,
        accountNumber: msisdn,
        amount: amount,
        currency: 'MWK',
        transactionType: 'AIRTIME',
        debitAccount: sourceAccount,
        debitAccountType: params.debitAccountType,
        initiatedBy: context.userId,
        ourTransactionId: reference, // Use T24 Reference as our ID
        metadata: {
          context: 'WORKFLOW_AIRTIME',
          t24HoldReference: reference
        }
      });

      // Create Financial Record
      transaction = await prisma.fdhTransaction.create({
        data: {
          type: 'AIRTIME',
          source: (context.source || 'MOBILE_BANKING') as any,
          reference, // Use T24 Reference as primary key
          status: 'PENDING',
          transferContext: (context.transferContext || 'MOBILE_BANKING') as any,
          amount: amount,
          currency: 'MWK',
          description,
          fromAccountNumber: sourceAccount,
          toAccountNumber: msisdn,
          initiatedByUserId: context.userId ? parseInt(context.userId) : null,
          t24Reference: reference
        }
      });

    } catch (e: any) {
      console.error("Failed to create transaction record after fund hold:", e);
      // IF DB fails after hold, we MUST release the funds
      await FundReservationService.releaseFunds(
        amount,
        sourceAccount,
        reference,
        `Reversal: DB Failure - ${description}`
      );
      return { success: false, error: "System error: Could not record transaction", shouldProceed: false };
    }

    // 3. Execute Topup
    console.log(`[WorkflowExecutor] Executing Airtime Topup for ${msisdn} via ${billerType}`);
    // Use the T24 reference for the provider call for perfect end-to-end traceability

    const airtimeParams = {
      msisdn,
      amount,
      externalTxnId: reference // This is already the FT reference from holdFunds result
    };

    let topupResult: any = { ok: false, error: "Unsupported biller type" };
    try {
      if (billerType === 'AIRTEL_AIRTIME') {
        topupResult = await airtimeService.airtelRecharge(airtimeParams);
      } else if (billerType === 'TNM_AIRTIME') {
        topupResult = await airtimeService.tnmRecharge(airtimeParams);
      }

      // Update Biller Transaction logic moved to final block for parallel execution
    } catch (e: any) {
      topupResult = { ok: false, error: e.message };
    }

    // 3. Handle Result
    if (topupResult.ok) {
      console.log(`[WorkflowExecutor] Airtime Topup Successful: ${holdResult.transactionReference}`);

      const updatePromises: Promise<any>[] = [
        // Update FDH Transaction
        prisma.fdhTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'COMPLETED',
            t24Reference: holdResult.transactionReference,
            t24Response: topupResult.data,
            completedAt: new Date()
          }
        })
      ];

      // Update Biller Transaction (Parallel)
      if (billerTransaction) {
        updatePromises.push(
          billerTransactionService.completeTransaction(
            billerTransaction.id,
            topupResult.data,
            airtimeParams.externalTxnId
          )
        );
      }

      await Promise.all(updatePromises);

      return {
        success: true,
        output: {
          transactionId: holdResult.transactionReference,
          message: "Airtime purchase successful",
          ...topupResult.data,
          transaction: transaction, // FDH Transaction
          billerTransaction: billerTransaction, // Biller Audit
        },
        shouldProceed: true
      };
    } else {
      // 4. Failure: Refund (Reverse Hold)
      console.error(`[WorkflowExecutor] Airtime Topup Failed. Reversing funds for ${sourceAccount}`);
      const errorMsg = topupResult.error || topupResult.statusText || 'Unknown error';

      const failurePromises: Promise<any>[] = [];

      // 1. Fail Biller Transaction
      if (billerTransaction) {
        failurePromises.push(
          billerTransactionService.failTransaction(billerTransaction.id, errorMsg || "Topup Exception", String(topupResult.status || 'UNKNOWN'))
            .catch(e => console.error("Failed to update biller transaction status:", e))
        );
      }

      // 2. Release Funds (Critical, so we might want to await this explicitly or let it run in parallel)
      // Parallel is fine as they are independent systems (DB vs T24)
      const refundPromise = FundReservationService.releaseFunds(
        amount,
        sourceAccount, // Send back to user
        reference,
        `Refund for failed Airtime: ${msisdn}`
      );
      failurePromises.push(refundPromise);

      // Execute all failure actions in parallel
      const [refundRes, ..._] = await Promise.all([
        refundPromise,
        ...failurePromises.slice(0, -1) // biller update promises
      ]);

      const errorMessage = `Airtime failed: ${errorMsg}. Refund status: ${refundRes.success ? 'Success' : 'Failed'}`;

      // Update FDH Transaction (Final step)
      const finalFdhTx = await prisma.fdhTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          errorMessage: errorMessage,
          errorCode: topupResult.code || 'PROVIDER_ERROR'
        }
      });

      return {
        success: false,
        error: errorMessage,
        output: {
          transactionId: reference,
          transaction: finalFdhTx,
          billerTransaction: billerTransaction
        },
        shouldProceed: false
      };
    }
  }

  /**
   * Handle Direct Biller Transaction (Water, Govt, etc.) with Hold-Execute-Release Pattern
   */
  private async handleDirectBillerTransaction(
    billerType: string,
    resolvedParams: any,
    context: ExecutionContext
  ): Promise<StepExecutionResponse> {
    // Step 0: Extract parameters
    const amount = parseFloat(resolvedParams.amount);
    const sourceAccount = resolvedParams.debitAccount;
    const billerAccountNumber = resolvedParams.accountNumber || resolvedParams.account;

    if (!sourceAccount) {
      return { success: false, error: "Debit account required for bill payment", shouldProceed: false };
    }

    let billerTransaction: any;
    let fdhTransaction: any;
    let reference = '';
    let description = '';

    // Create description for T24 call
    const billerDefinition = getBillerDefinition(billerType);
    const billerTypeName = billerDefinition?.name ||
      billerType.split('_').map(word =>
        word.charAt(0) + word.slice(1).toLowerCase()
      ).join(' ');
    description = `${billerTypeName} - ${billerAccountNumber}`;

    // Step 1: Hold Funds (Debit User → Suspense)
    console.log(`[WorkflowExecutor] Holding funds for bill payment: ${amount} from ${sourceAccount}`);
    const holdResult = await FundReservationService.holdFunds(
      amount,
      sourceAccount,
      '', // No internal reference yet
      description
    );

    if (!holdResult.success) {
      return {
        success: false,
        error: `Failed to debit account: ${holdResult.error}`,
        shouldProceed: false
      };
    }

    // Now we have the T24 Reference
    reference = holdResult.transactionReference || '';
    console.log(`[WorkflowExecutor] Funds held with reference: ${reference}`);

    // Step 2: Get suspense account for biller API call
    const suspenseAccount = await configurationService.getInboundSuspenseAccount();

    // Step 3: Create Transaction Records using T24 Reference
    try {
      // Create Biller Audit Record
      billerTransaction = await billerTransactionService.createTransaction({
        billerType,
        billerName: billerDefinition?.name || billerType,
        accountNumber: billerAccountNumber,
        amount: amount,
        currency: resolvedParams.currency || 'MWK',
        transactionType: 'BILL_PAYMENT',
        debitAccount: sourceAccount, // Original user account for audit
        debitAccountType: resolvedParams.debitAccountType,
        initiatedBy: context.userId,
        ourTransactionId: reference, // Use T24 Reference as our ID
        metadata: {
          context: 'WORKFLOW_BILL_PAYMENT',
          t24HoldReference: reference
        },
        status: 'PENDING'
      });

      // Create Financial Record
      fdhTransaction = await prisma.fdhTransaction.create({
        data: {
          type: 'BILL_PAYMENT',
          source: (context.source || 'MOBILE_BANKING') as any,
          reference, // Use T24 Reference as primary key
          status: 'PENDING',
          transferContext: (context.transferContext || 'MOBILE_BANKING') as any,
          amount: amount,
          currency: resolvedParams.currency || 'MWK',
          description,
          fromAccountNumber: sourceAccount,
          toAccountNumber: billerAccountNumber,
          initiatedByUserId: context.userId ? parseInt(context.userId) : null,
          t24Reference: reference
        }
      });

    } catch (e: any) {
      console.error("Failed to create transaction record after fund hold:", e);
      // IF DB fails after hold, we MUST release the funds
      await FundReservationService.releaseFunds(
        amount,
        sourceAccount,
        reference,
        `Reversal: DB Failure - ${description}`
      );
      return { success: false, error: "System error: Could not record transaction", shouldProceed: false };
    }

    // Step 4: Call biller API with SUSPENSE account as debitAccount
    console.log(`[WorkflowExecutor] Executing Bill Payment for ${billerAccountNumber} via ${billerType}`);
    const paymentParams: any = {
      accountNumber: billerAccountNumber,
      amount: amount.toString(),
      phoneNumber: resolvedParams.phoneNumber,
      invoiceNumber: resolvedParams.invoiceNumber,
      bundleId: resolvedParams.bundleId,
      currency: resolvedParams.currency || 'MWK',
      customerNumber: resolvedParams.customerNumber,
      debitAccount: suspenseAccount,        // Use suspense account (where funds are)
      debitAccountType: 'SUSPENSE',         // Mark as suspense type
      externalTxnId: reference              // Use T24 reference for traceability
    };

    let billerResult: any = { ok: false, error: "Unknown error" };
    try {
      billerResult = await billerEsbService.processPayment(billerType, paymentParams);
    } catch (e: any) {
      billerResult = { ok: false, error: e.message };
    }

    // Step 5: Handle Result
    if (billerResult.ok) {
      console.log(`[WorkflowExecutor] Bill Payment Successful: ${reference}`);

      const updatePromises: Promise<any>[] = [
        // Update FDH Transaction
        prisma.fdhTransaction.update({
          where: { id: fdhTransaction.id },
          data: {
            status: 'COMPLETED',
            t24Response: billerResult.data,
            completedAt: new Date()
          }
        })
      ];

      // Update Biller Transaction (Parallel)
      if (billerTransaction) {
        updatePromises.push(
          billerTransactionService.completeTransaction(
            billerTransaction.id,
            billerResult.data,
            billerResult.data?.externalReference || billerResult.data?.id
          )
        );
      }

      await Promise.all(updatePromises);

      return {
        success: true,
        output: {
          transactionId: reference,
          message: billerResult.data?.message || 'Payment successful',
          ...billerResult.data,
          transaction: fdhTransaction,
          billerTransaction: billerTransaction,
        },
        shouldProceed: true
      };
    } else {
      // Failure: Refund (Reverse Hold)
      console.error(`[WorkflowExecutor] Bill Payment Failed. Reversing funds for ${sourceAccount}`);
      const errorMsg = billerResult.error || billerResult.statusText || 'Unknown error';

      const failurePromises: Promise<any>[] = [];

      // 1. Fail Biller Transaction
      if (billerTransaction) {
        failurePromises.push(
          billerTransactionService.failTransaction(billerTransaction.id, errorMsg || "Bill payment exception", String(billerResult.status || 'UNKNOWN'))
            .catch(e => console.error("Failed to update biller transaction status:", e))
        );
      }

      // 2. Release Funds (Critical)
      const refundPromise = FundReservationService.releaseFunds(
        amount,
        sourceAccount, // Send back to user
        reference,
        `Refund for failed bill payment: ${billerAccountNumber}`
      );
      failurePromises.push(refundPromise);

      // Execute all failure actions in parallel
      const [refundRes, ..._] = await Promise.all([
        refundPromise,
        ...failurePromises.slice(0, -1) // biller update promises
      ]);

      const errorMessage = `Bill payment failed: ${errorMsg}. Refund status: ${refundRes.success ? 'Success' : 'Failed'}`;

      // Update FDH Transaction (Final step)
      const finalFdhTx = await prisma.fdhTransaction.update({
        where: { id: fdhTransaction.id },
        data: {
          status: 'FAILED',
          errorMessage: errorMessage,
          errorCode: billerResult.status?.toString() || 'BILLER_ERROR'
        }
      });

      return {
        success: false,
        error: errorMessage,
        output: {
          transactionId: reference,
          transaction: finalFdhTx,
          billerTransaction: billerTransaction
        },
        shouldProceed: false
      };
    }
  }


  /**
   * Make API call to trigger endpoint
   */
  private async makeAPICall(
    endpoint: string,
    config: any,
    context: ExecutionContext,
    input: any,
    timeoutMs: number
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Resolve variables in endpoint
      const resolvedEndpoint = this.resolveVariables(endpoint, context, input);

      // Parse config
      const triggerConfig = config || {};

      // Build request body from parameter mapping if configured
      let requestBody = input;
      if (triggerConfig.parameterMapping && Object.keys(triggerConfig.parameterMapping).length > 0) {
        requestBody = this.buildRequestFromMapping(
          triggerConfig.parameterMapping,
          context.variables
        );
      }

      // Make request
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(resolvedEndpoint, {
          method: triggerConfig.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': context.userId,
            'X-Session-Id': context.sessionId,
            ...triggerConfig.headers
          },
          body: requestBody ? JSON.stringify(requestBody) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeout);

        const responseData = await response.json();

        if (!response.ok) {
          return {
            success: false,
            error: responseData.error || responseData.message || `HTTP ${response.status}`
          };
        }

        return {
          success: true,
          data: responseData
        };

      } catch (fetchError: any) {
        clearTimeout(timeout);
        throw fetchError;
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.name === 'AbortError' ? 'Request timeout' : error.message
      };
    }
  }

  /**
   * Build request body from parameter mapping
   */
  private buildRequestFromMapping(
    mapping: Record<string, string>,
    contextData: any
  ): any {
    const result: any = {};

    for (const [paramPath, dataPath] of Object.entries(mapping)) {
      if (!dataPath) continue; // Skip empty mappings

      const value = this.getNestedValue(contextData, dataPath);
      if (value !== undefined) {
        this.setNestedValue(result, paramPath, value);
      }
    }

    return result;
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Submit final data to API
   */
  private async submitToAPI(step: WorkflowStep, data: any): Promise<any> {
    if (!step.triggerEndpoint) {
      throw new Error('API endpoint not configured');
    }

    const config = step.triggerConfig as any || {};

    const response = await fetch(step.triggerEndpoint, {
      method: config.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(step.timeoutMs || 30000)
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error || responseData.message || 'API submission failed');
    }

    return responseData;
  }

  /**
   * Map context data to API format
   */
  private mapContextToAPI(workflow: any, context: any): any {
    const mapping = workflow.config?.apiMapping || {};

    if (Object.keys(mapping).length === 0) {
      // No mapping configured, return context as-is
      return context;
    }

    const mapped: any = {};

    for (const [targetField, sourcePath] of Object.entries(mapping)) {
      const value = this.getNestedValue(context, sourcePath as string);
      if (value !== undefined) {
        mapped[targetField] = value;
      }
    }

    return mapped;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  /**
   * Get step key for storing data in context
   */
  private getStepKey(step: WorkflowStep): string {
    const config = step.config as any;
    return config?.dataKey || `step_${step.order}`;
  }

  /**
   * Extract human-readable error message from T24 response
   */
  private extractT24ErrorMessage(result: { message?: any; error?: string }): string {
    let errorMessage = 'Transaction failed';

    if (typeof result.message === 'string') {
      errorMessage = result.message;
    } else if (result.message && typeof result.message === 'object') {
      // Handle T24 business error format: { type: 'BUSINESS', errorDetails: [...] }
      const errorDetails = (result.message as any).errorDetails;
      if (Array.isArray(errorDetails) && errorDetails.length > 0) {
        errorMessage = errorDetails[0].message || errorDetails[0].errorMessage || errorMessage;
      } else if ((result.message as any).message) {
        errorMessage = (result.message as any).message;
      }
    } else if (result.error) {
      errorMessage = result.error;
    }

    return errorMessage;
  }

  /**
   * Resolve variables in template string
   */
  public resolveVariables(
    template: string,
    context: ExecutionContext,
    input: any
  ): string {
    if (!template) return template;

    // Support both {key} and {{key}} syntax
    return template.replace(/\{\{?([^{}]+)\}?\}|(\{[^{}]+\})/g, (match, p1, p2) => {
      const path = (p1 || p2 || match).replace(/^\{\{?/, '').replace(/\}?\}$/, '').trim();

      // Try to find in context.variables first
      const contextValue = this.getNestedValue(context.variables, path);
      if (contextValue !== undefined) {
        return String(contextValue);
      }

      // Then try input if path starts with input.
      if (path.startsWith('input.') && input) {
        const inputPath = path.replace('input.', '');
        const inputValue = this.getNestedValue(input, inputPath);
        if (inputValue !== undefined) {
          return String(inputValue);
        }
      }

      // Then try context. if path starts with context.
      if (path.startsWith('context.') && context.variables) {
        const contextPath = path.replace('context.', '');
        const contextValue = this.getNestedValue(context.variables, contextPath);
        if (contextValue !== undefined) {
          return String(contextValue);
        }
      }

      // Default to original match if not found
      return match;
    });
  }
}

export const workflowExecutor = new WorkflowExecutor();
