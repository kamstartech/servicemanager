import { workflowSessionStore } from './session-store';
import { prisma } from '@/lib/db/prisma';
import type {
  WorkflowStep,
  StepExecutionMode,
  TriggerTiming
} from '@prisma/client';

interface ExecutionContext {
  userId: string;
  sessionId: string;
  variables: Record<string, any>;
}

interface StepExecutionRequest {
  step: WorkflowStep;
  executionId: string;
  context: ExecutionContext;
  input?: any;
  timing: TriggerTiming;
}

interface StepExecutionResponse {
  success: boolean;
  output?: any;
  error?: string;
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

    if (!step) {
      throw new Error('Workflow step not found');
    }

    // Get current context from Redis
    const context = await workflowSessionStore.getContext(execution.sessionId);

    // Check if this step requires trigger at this timing
    if (
      step.executionMode === 'CLIENT_ONLY' ||
      (step.triggerTiming !== timing && step.triggerTiming !== 'BOTH')
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

        await prisma.workflowExecution.update({
          where: { id: executionId },
          data: { currentStepId: nextStepId },
        });
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
      const executionContext: ExecutionContext = {
        userId: execution.userId,
        sessionId: execution.sessionId,
        variables: context
      };

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

        await prisma.workflowExecution.update({
          where: { id: executionId },
          data: { currentStepId: nextStepId },
        });
      }

      return result;

    } catch (error: any) {
      console.error('Step execution failed:', error);

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

    // Find final API step
    const finalStep = execution.workflow.steps
      .filter(s => s.type === 'API_CALL')
      .sort((a, b) => b.order - a.order)[0];

    let finalResult: any = null;

    // Submit to final API if configured
    if (finalStep && finalStep.triggerEndpoint) {
      try {
        finalResult = await this.submitToAPI(finalStep, mappedData);
      } catch (error: any) {
        console.error('Final API submission failed:', error);

        // Update execution as failed
        await prisma.workflowExecution.update({
          where: { id: executionId },
          data: {
            status: 'FAILED',
            error: error.message || 'API submission failed',
            completedAt: new Date()
          }
        });

        throw error;
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

    return {
      success: true,
      result: finalResult || mappedData
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
      throw new Error('Trigger endpoint not configured for sync step');
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
      throw new Error('Trigger endpoint not configured for validation step');
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
   * Resolve variables in template string
   */
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
