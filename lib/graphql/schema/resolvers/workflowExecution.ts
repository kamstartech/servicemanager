import { workflowExecutor } from '@/lib/services/workflow/workflow-executor';
import { prisma } from '@/lib/db/prisma';
import type { TriggerTiming } from '@prisma/client';

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
      // Get userId from context (assumes auth middleware sets this)
      const userId = context.userId || 'anonymous';
      
      // Generate session ID if not provided
      const sessionId = context.sessionId || crypto.randomUUID();

      const execution = await workflowExecutor.startWorkflow(
        args.workflowId,
        userId,
        sessionId,
        args.initialContext || {}
      );

      return {
        ...execution,
        startedAt: execution.startedAt.toISOString(),
        completedAt: execution.completedAt?.toISOString(),
        workflow: {
          ...execution.workflow,
          createdAt: execution.workflow.createdAt.toISOString(),
          updatedAt: execution.workflow.updatedAt.toISOString(),
          steps: execution.workflow.steps.map(step => ({
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
      }
    ) {
      const timing = args.timing as TriggerTiming;

      const result = await workflowExecutor.executeStep(
        args.executionId,
        args.stepId,
        args.input,
        timing
      );

      return result;
    },

    async completeWorkflowExecution(
      _parent: unknown,
      args: { executionId: string }
    ) {
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
