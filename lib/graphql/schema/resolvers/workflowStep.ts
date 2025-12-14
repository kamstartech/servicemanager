import { prisma } from "@/lib/db/prisma";

type CreateWorkflowStepInput = {
  workflowId: string;
  type: string;
  label: string;
  order?: number;
  config: any;
  validation?: any;
  isActive?: boolean;
};

type UpdateWorkflowStepInput = {
  type?: string;
  label?: string;
  order?: number;
  config?: any;
  validation?: any;
  isActive?: boolean;
};

export const workflowStepResolvers = {
  Query: {
    async workflowSteps(_parent: unknown, args: { workflowId: string }) {
      const steps = await prisma.workflowStep.findMany({
        where: { workflowId: args.workflowId },
        orderBy: { order: "asc" },
      });

      return steps.map((step) => ({
        ...step,
        createdAt: step.createdAt.toISOString(),
        updatedAt: step.updatedAt.toISOString(),
      }));
    },

    async workflowStep(_parent: unknown, args: { id: string }) {
      const step = await prisma.workflowStep.findUnique({
        where: { id: args.id },
      });

      if (!step) {
        throw new Error("Workflow step not found");
      }

      return {
        ...step,
        createdAt: step.createdAt.toISOString(),
        updatedAt: step.updatedAt.toISOString(),
      };
    },
  },

  Mutation: {
    async createWorkflowStep(
      _parent: unknown,
      args: { input: CreateWorkflowStepInput }
    ) {
      const { input } = args;

      // Verify workflow exists
      const workflow = await prisma.workflow.findUnique({
        where: { id: input.workflowId },
      });

      if (!workflow) {
        throw new Error("Workflow not found");
      }

      const step = await prisma.workflowStep.create({
        data: {
          workflowId: input.workflowId,
          type: input.type as any,
          label: input.label,
          order: input.order ?? 0,
          config: input.config,
          validation: input.validation,
          isActive: input.isActive ?? true,
        },
      });

      // Increment workflow version
      await prisma.workflow.update({
        where: { id: input.workflowId },
        data: { version: { increment: 1 } },
      });

      return {
        ...step,
        createdAt: step.createdAt.toISOString(),
        updatedAt: step.updatedAt.toISOString(),
      };
    },

    async updateWorkflowStep(
      _parent: unknown,
      args: { id: string; input: UpdateWorkflowStepInput }
    ) {
      const { id, input } = args;

      const step = await prisma.workflowStep.findUnique({
        where: { id },
      });

      if (!step) {
        throw new Error("Workflow step not found");
      }

      const updated = await prisma.workflowStep.update({
        where: { id },
        data: {
          ...(input.type && { type: input.type as any }),
          ...(input.label && { label: input.label }),
          ...(input.order !== undefined && { order: input.order }),
          ...(input.config && { config: input.config }),
          ...(input.validation !== undefined && { validation: input.validation }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
      });

      // Increment workflow version
      await prisma.workflow.update({
        where: { id: step.workflowId },
        data: { version: { increment: 1 } },
      });

      return {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    },

    async deleteWorkflowStep(_parent: unknown, args: { id: string }) {
      const step = await prisma.workflowStep.findUnique({
        where: { id: args.id },
      });

      if (!step) {
        throw new Error("Workflow step not found");
      }

      await prisma.workflowStep.delete({
        where: { id: args.id },
      });

      // Increment workflow version
      await prisma.workflow.update({
        where: { id: step.workflowId },
        data: { version: { increment: 1 } },
      });

      return true;
    },

    async reorderWorkflowSteps(
      _parent: unknown,
      args: { workflowId: string; stepIds: string[] }
    ) {
      const { workflowId, stepIds } = args;

      // Update order for each step
      await Promise.all(
        stepIds.map((id, index) =>
          prisma.workflowStep.update({
            where: { id },
            data: { order: index },
          })
        )
      );

      // Increment workflow version
      await prisma.workflow.update({
        where: { id: workflowId },
        data: { version: { increment: 1 } },
      });

      // Fetch updated steps
      const steps = await prisma.workflowStep.findMany({
        where: { workflowId },
        orderBy: { order: "asc" },
      });

      return steps.map((step) => ({
        ...step,
        createdAt: step.createdAt.toISOString(),
        updatedAt: step.updatedAt.toISOString(),
      }));
    },
  },

  WorkflowStep: {
    workflow: async (parent: any) => {
      if (parent.workflow) return parent.workflow;

      const workflow = await prisma.workflow.findUnique({
        where: { id: parent.workflowId },
      });

      if (!workflow) throw new Error("Workflow not found");

      return {
        ...workflow,
        createdAt: workflow.createdAt.toISOString(),
        updatedAt: workflow.updatedAt.toISOString(),
      };
    },
  },
};
