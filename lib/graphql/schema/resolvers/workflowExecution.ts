import { workflowExecutor } from '@/lib/services/workflow/workflow-executor';
import { prisma } from '@/lib/db/prisma';
import type { TriggerTiming } from '@prisma/client';
import crypto from 'crypto';

async function getHiddenAccountCategoryIds(): Promise<string[]> {
  const hidden = await prisma.accountCategory.findMany({
    where: { displayToMobile: false },
    select: { category: true },
  });

  return hidden.map((c) => c.category);
}

async function hydrateFormStepsForClient(
  steps: any[],
  context: any,
  options: { stripFormId: boolean }
): Promise<any[]> {
  const userId = context.userId;
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

  const hydratedSteps = [];
  for (const step of steps) {
    if (step?.type !== 'FORM') {
      hydratedSteps.push(step);
      continue;
    }

    const formId = step?.config?.formId;
    const form = typeof formId === 'string' ? formById.get(formId) : undefined;
    if (!form) {
      hydratedSteps.push(step);
      continue;
    }

    const { formId: _formId, ...restConfig } = (step.config ?? {}) as Record<string, any>;

    let hydratedSchema = form.schema;

    // Handle account field hydration if userId is available
    if (userId && form.schema && (form.schema as any).fields) {
      const userIdInt = typeof userId === 'string' ? parseInt(userId) : userId;
      const schema = form.schema as any;

      const hasAccountField = schema.fields.some((f: any) => f.type === "account");
      const hasBeneficiaryField = schema.fields.some((f: any) => f.type === "beneficiary");

      if (hasAccountField || hasBeneficiaryField) {
        let accountOptions: any[] = [];
        let beneficiaryOptionsMap = new Map<string, any[]>();

        // Fetch accounts if needed
        if (hasAccountField) {
          const hiddenCategoryIds = await getHiddenAccountCategoryIds();
          const accounts = await prisma.mobileUserAccount.findMany({
            where: {
              mobileUserId: userIdInt,
              ...(hiddenCategoryIds.length > 0
                ? {
                  OR: [
                    { categoryId: null },
                    { categoryId: { notIn: hiddenCategoryIds } },
                  ],
                }
                : {}),
            },
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          });

          accountOptions = accounts.map(acc => ({
            label: `${acc.accountName || acc.accountType} - ${acc.accountNumber} (${acc.balance?.toString() || "0"} ${acc.currency})`,
            value: acc.accountNumber
          }));
        }

        // Fetch beneficiaries if needed
        if (hasBeneficiaryField) {
          const typeFilters = Array.from(new Set(schema.fields
            .filter((f: any) => f.type === "beneficiary")
            .map((f: any) => f.beneficiaryType || "ALL")
          )) as string[];

          for (const type of typeFilters) {
            const where: any = { mobileUserId: userIdInt };
            if (type !== "ALL") {
              if (type === "BANK") {
                where.beneficiaryType = { in: ["BANK_INTERNAL", "BANK_EXTERNAL"] };
              } else {
                where.beneficiaryType = type as any;
              }
            }

            const beneficiaries = await prisma.beneficiary.findMany({
              where,
              orderBy: { createdAt: "desc" },
            });

            const options = beneficiaries.map(b => ({
              label: `${b.name} - ${b.accountNumber || b.phoneNumber} (${b.beneficiaryType})`,
              value: b.accountNumber || b.phoneNumber,
              data: b
            }));

            beneficiaryOptionsMap.set(type, options);
          }
        }

        // Inject options into fields
        hydratedSchema = {
          ...schema,
          fields: schema.fields.map((f: any) => {
            if (f.type === "account") {
              return { ...f, options: accountOptions.map(opt => opt.label), accountOptions };
            }
            if (f.type === "beneficiary") {
              const type = f.beneficiaryType || "ALL";
              const options = beneficiaryOptionsMap.get(type) || [];
              return { ...f, options: options.map(opt => opt.label), beneficiaryOptions: options };
            }
            return f;
          })
        };
      }
    }

    const nextConfig: Record<string, any> = {
      ...(restConfig ?? {}),
      schema: hydratedSchema,
      formMeta: {
        name: form.name,
        description: form.description,
        version: form.version,
      },
    };

    if (!options.stripFormId) {
      nextConfig.formId = formId;
    }

    hydratedSteps.push({
      ...step,
      config: nextConfig,
    });
  }

  return hydratedSteps;
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
    async workflowExecution(_parent: unknown, args: { id: string }, context: any) {
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

      const isAdminRequest = !!context?.adminUser || !!context?.adminId;
      const hydratedSteps = await hydrateFormStepsForClient(
        execution.workflow.steps,
        context,
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
        context,
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
