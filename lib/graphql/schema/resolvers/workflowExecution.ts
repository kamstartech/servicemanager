import { workflowExecutor } from '@/lib/services/workflow/workflow-executor';
import { prisma } from '@/lib/db/prisma';
import type { TriggerTiming } from '@prisma/client';
import crypto from 'crypto';

async function hydrateFormStepsForClient(
  steps: any[],
  options: { stripFormId: boolean }
): Promise<any[]> {
  if (!Array.isArray(steps) || steps.length === 0) {
    return steps;
  }

  const formIds = new Set<string>();

  for (const step of steps) {
    if (step?.type !== 'FORM') continue;
    const formId = step?.config?.formId;
    if (typeof formId === 'string' && formId.length > 0) {
      formIds.add(formId);
    }
  }

  if (formIds.size === 0) {
    return steps;
  }

  const forms = await prisma.form.findMany({
    where: { id: { in: Array.from(formIds) } },
    select: { id: true, schema: true, name: true, description: true, version: true },
  });

  const formById = new Map<string, (typeof forms)[number]>();
  for (const form of forms) {
    formById.set(form.id, form);
  }

  return steps.map((step) => {
    if (step?.type !== 'FORM') return step;

    const formId = step?.config?.formId;
    const form = typeof formId === 'string' ? formById.get(formId) : undefined;
    if (!form) {
      return step;
    }

    const { formId: _formId, ...restConfig } = (step.config ?? {}) as Record<string, any>;

    const nextConfig: Record<string, any> = {
      ...(restConfig ?? {}),
      schema: form.schema,
      formMeta: {
        name: form.name,
        description: form.description,
        version: form.version,
      },
    };

    if (!options.stripFormId) {
      nextConfig.formId = formId;
    }

    return {
      ...step,
      config: nextConfig,
    };
  });
}

function requireAuthenticatedUserId(context: any): string {
  const userId = context?.userId;
  if (userId === null || userId === undefined) {
    throw new Error('Unauthorized');
  }
  return String(userId);
}

async function assertExecutionOwnership(executionId: string, userId: string) {
  const execution = await prisma.workflowExecution.findUnique({
    where: { id: executionId },
    select: { userId: true },
  });

  if (!execution) {
    throw new Error('Workflow execution not found');
  }

  if (execution.userId !== userId) {
    throw new Error('Forbidden');
  }
}

export const workflowExecutionResolvers = {
  Query: {
    async workflowExecution(_parent: unknown, args: { id: string }) {
      const execution = await prisma.workflowExecution.findUnique({
        where: { id: args.id },
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

      return {
        ...execution,
        startedAt: execution.startedAt.toISOString(),
        completedAt: execution.completedAt?.toISOString(),
      };
    },

    async userWorkflowExecutions(
      _parent: unknown,
      args: { userId: string; status?: string; limit?: number }
    ) {
      const executions = await prisma.workflowExecution.findMany({
        where: {
          userId: args.userId,
          ...(args.status && { status: args.status as any })
        },
        include: {
          workflow: true
        },
        orderBy: { startedAt: 'desc' },
        take: args.limit || 50
      });

      return executions.map(execution => ({
        ...execution,
        startedAt: execution.startedAt.toISOString(),
        completedAt: execution.completedAt?.toISOString(),
      }));
    }
  },

  Mutation: {
    async startWorkflowExecution(
      _parent: unknown,
      args: {
        workflowId: string;
        pageId: string;
        initialContext?: any;
      },
      context: any
    ) {
      const userId = requireAuthenticatedUserId(context);
      
      // Generate session ID if not provided
      const sessionId = context.sessionId || crypto.randomUUID();

      const execution = await workflowExecutor.startWorkflow(
        args.workflowId,
        userId,
        sessionId,
        args.initialContext || {}
      );

      const isAdminRequest = !!context?.adminUser || !!context?.adminId;
      const hydratedSteps = await hydrateFormStepsForClient(
        execution.workflow.steps,
        { stripFormId: !isAdminRequest }
      );

      return {
        ...execution,
        startedAt: execution.startedAt.toISOString(),
        completedAt: execution.completedAt?.toISOString(),
        workflow: {
          ...execution.workflow,
          createdAt: execution.workflow.createdAt.toISOString(),
          updatedAt: execution.workflow.updatedAt.toISOString(),
          steps: hydratedSteps.map(step => ({
            ...step,
            createdAt: step.createdAt.toISOString(),
            updatedAt: step.updatedAt.toISOString(),
          }))
        }
      };
    },

    async executeWorkflowStep(
      _parent: unknown,
      args: {
        executionId: string;
        stepId: string;
        input?: any;
        timing: string;
      },
      context: any
    ) {
      const userId = requireAuthenticatedUserId(context);
      await assertExecutionOwnership(args.executionId, userId);

      const timing = args.timing as TriggerTiming;

      const result = await workflowExecutor.executeStep(
        args.executionId,
        args.stepId,
        args.input,
        timing
      );

      // workflowExecutor returns { output }, but GraphQL schema exposes this as { result }
      return {
        success: result.success,
        result: (result as any).output,
        shouldProceed: result.shouldProceed,
        error: result.error,
      };
    },

    async completeWorkflowExecution(
      _parent: unknown,
      args: { executionId: string },
      context: any
    ) {
      const userId = requireAuthenticatedUserId(context);
      await assertExecutionOwnership(args.executionId, userId);

      const result = await workflowExecutor.completeWorkflow(args.executionId);

      return {
        success: result.success,
        result: result.result,
        executionId: args.executionId
      };
    },

    async cancelWorkflowExecution(
      _parent: unknown,
      args: { executionId: string; reason?: string }
    ) {
      await workflowExecutor.cancelWorkflow(args.executionId, args.reason);

      const execution = await prisma.workflowExecution.findUnique({
        where: { id: args.executionId },
        include: { workflow: true }
      });

      if (!execution) {
        throw new Error('Workflow execution not found');
      }

      return {
        ...execution,
        startedAt: execution.startedAt.toISOString(),
        completedAt: execution.completedAt?.toISOString(),
      };
    }
  },

  WorkflowExecution: {
    workflow: async (parent: any) => {
      if (parent.workflow) {
        return {
          ...parent.workflow,
          createdAt: parent.workflow.createdAt?.toISOString 
            ? parent.workflow.createdAt.toISOString() 
            : parent.workflow.createdAt,
          updatedAt: parent.workflow.updatedAt?.toISOString 
            ? parent.workflow.updatedAt.toISOString() 
            : parent.workflow.updatedAt,
        };
      }

      const workflow = await prisma.workflow.findUnique({
        where: { id: parent.workflowId },
        include: {
          steps: {
            orderBy: { order: 'asc' }
          }
        }
      });

      if (!workflow) return null;

      return {
        ...workflow,
        createdAt: workflow.createdAt.toISOString(),
        updatedAt: workflow.updatedAt.toISOString(),
      };
    }
  }
};
