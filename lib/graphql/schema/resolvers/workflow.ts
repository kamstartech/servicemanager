import { prisma } from "@/lib/db/prisma";

type CreateWorkflowInput = {
  name: string;
  description?: string;
  isActive?: boolean;
};

type CreateWorkflowWithStepsInput = {
  name: string;
  description?: string;
  isActive?: boolean;
  steps: Array<{
    type: string;
    label: string;
    order: number;
    config: any;
    validation?: any;
    isActive?: boolean;
  }>;
};

type UpdateWorkflowInput = {
  name?: string;
  description?: string;
  isActive?: boolean;
};

type AttachWorkflowToPageInput = {
  pageId: string;
  workflowId: string;
  order?: number;
  isActive?: boolean;
  configOverride?: any;
};

type UpdatePageWorkflowInput = {
  order?: number;
  isActive?: boolean;
  configOverride?: any;
};

export const workflowResolvers = {
  Query: {
    async workflows(
      _parent: unknown,
      args: {
        page?: number;
        limit?: number;
        isActive?: boolean;
      }
    ) {
      const { page = 1, limit = 100, isActive } = args;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (isActive !== undefined) where.isActive = isActive;

      const [workflows, total] = await Promise.all([
        prisma.workflow.findMany({
          where,
          include: {
            steps: {
              orderBy: { order: "asc" },
            },
            screenPages: {
              include: {
                page: {
                  include: {
                    screen: true,
                  },
                },
              },
            },
          },
          orderBy: { name: "asc" },
          skip,
          take: limit,
        }),
        prisma.workflow.count({ where }),
      ]);

      return {
        workflows: workflows.map((workflow) => ({
          ...workflow,
          createdAt: workflow.createdAt.toISOString(),
          updatedAt: workflow.updatedAt.toISOString(),
          screenPages: workflow.screenPages.map((sp) => ({
            ...sp,
            createdAt: sp.createdAt.toISOString(),
            updatedAt: sp.updatedAt.toISOString(),
            page: sp.page ? {
              ...sp.page,
              createdAt: sp.page.createdAt.toISOString(),
              updatedAt: sp.page.updatedAt.toISOString(),
              screen: sp.page.screen ? {
                ...sp.page.screen,
                createdAt: sp.page.screen.createdAt.toISOString(),
                updatedAt: sp.page.screen.updatedAt.toISOString(),
              } : undefined,
            } : undefined,
          })),
        })),
        total,
      };
    },

    async workflow(_parent: unknown, args: { id: string }) {
      const workflow = await prisma.workflow.findUnique({
        where: { id: args.id },
        include: {
          steps: {
            orderBy: { order: "asc" },
          },
          screenPages: {
            include: {
              page: {
                include: {
                  screen: true,
                },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      });

      if (!workflow) {
        throw new Error("Workflow not found");
      }

      return {
        ...workflow,
        createdAt: workflow.createdAt.toISOString(),
        updatedAt: workflow.updatedAt.toISOString(),
        screenPages: workflow.screenPages.map((sp) => ({
          ...sp,
          createdAt: sp.createdAt.toISOString(),
          updatedAt: sp.updatedAt.toISOString(),
          page: sp.page ? {
            ...sp.page,
            createdAt: sp.page.createdAt.toISOString(),
            updatedAt: sp.page.updatedAt.toISOString(),
            screen: sp.page.screen ? {
              ...sp.page.screen,
              createdAt: sp.page.screen.createdAt.toISOString(),
              updatedAt: sp.page.screen.updatedAt.toISOString(),
            } : undefined,
          } : undefined,
        })),
      };
    },

    async pageWorkflows(_parent: unknown, args: { pageId: string }) {
      const workflows = await prisma.appScreenPageWorkflow.findMany({
        where: { pageId: args.pageId },
        include: {
          workflow: true,
          page: {
            include: {
              screen: true,
            },
          },
        },
        orderBy: { order: "asc" },
      });

      return workflows.map((pw) => ({
        ...pw,
        createdAt: pw.createdAt.toISOString(),
        updatedAt: pw.updatedAt.toISOString(),
        workflow: {
          ...pw.workflow,
          createdAt: pw.workflow.createdAt.toISOString(),
          updatedAt: pw.workflow.updatedAt.toISOString(),
        },
        page: {
          ...pw.page,
          createdAt: pw.page.createdAt.toISOString(),
          updatedAt: pw.page.updatedAt.toISOString(),
        },
      }));
    },
  },

  Mutation: {
    async createWorkflow(
      _parent: unknown,
      args: { input: CreateWorkflowInput }
    ) {
      const { input } = args;

      // Check if name already exists
      const existing = await prisma.workflow.findUnique({
        where: { name: input.name },
      });

      if (existing) {
        throw new Error(`Workflow "${input.name}" already exists`);
      }

      const workflow = await prisma.workflow.create({
        data: {
          name: input.name,
          description: input.description,
          isActive: input.isActive ?? true,
        },
      });

      return {
        ...workflow,
        createdAt: workflow.createdAt.toISOString(),
        updatedAt: workflow.updatedAt.toISOString(),
        steps: [],
        screenPages: [],
      };
    },

    async createWorkflowWithSteps(
      _parent: unknown,
      args: { input: CreateWorkflowWithStepsInput }
    ) {
      const { input } = args;

      // Check if name already exists
      const existing = await prisma.workflow.findUnique({
        where: { name: input.name },
      });

      if (existing) {
        throw new Error(`Workflow "${input.name}" already exists`);
      }

      // Create workflow with steps in a transaction
      const workflow = await prisma.$transaction(async (tx) => {
        const newWorkflow = await tx.workflow.create({
          data: {
            name: input.name,
            description: input.description,
            isActive: input.isActive ?? true,
          },
        });

        // Create all steps
        const steps = await Promise.all(
          input.steps.map((step) =>
            tx.workflowStep.create({
              data: {
                workflowId: newWorkflow.id,
                type: step.type as any,
                label: step.label,
                order: step.order,
                config: step.config,
                validation: step.validation,
                isActive: step.isActive ?? true,
              },
            })
          )
        );

        return { ...newWorkflow, steps };
      });

      return {
        ...workflow,
        createdAt: workflow.createdAt.toISOString(),
        updatedAt: workflow.updatedAt.toISOString(),
        steps: workflow.steps.map((step) => ({
          ...step,
          createdAt: step.createdAt.toISOString(),
          updatedAt: step.updatedAt.toISOString(),
        })),
        screenPages: [],
      };
    },

    async updateWorkflow(
      _parent: unknown,
      args: { id: string; input: UpdateWorkflowInput }
    ) {
      const { id, input } = args;

      // If updating name, check uniqueness
      if (input.name) {
        const existing = await prisma.workflow.findFirst({
          where: {
            name: input.name,
            id: { not: id },
          },
        });

        if (existing) {
          throw new Error(`Workflow "${input.name}" already exists`);
        }
      }

      const workflow = await prisma.workflow.findUnique({
        where: { id },
      });

      if (!workflow) {
        throw new Error("Workflow not found");
      }

      const updated = await prisma.workflow.update({
        where: { id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
        include: {
          steps: { orderBy: { order: "asc" } },
          screenPages: true,
        },
      });

      return {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        steps: updated.steps.map((step) => ({
          ...step,
          createdAt: step.createdAt.toISOString(),
          updatedAt: step.updatedAt.toISOString(),
        })),
        screenPages: updated.screenPages.map((sp) => ({
          ...sp,
          createdAt: sp.createdAt.toISOString(),
          updatedAt: sp.updatedAt.toISOString(),
        })),
      };
    },

    async deleteWorkflow(_parent: unknown, args: { id: string }) {
      await prisma.workflow.delete({
        where: { id: args.id },
      });

      return true;
    },

    async attachWorkflowToPage(
      _parent: unknown,
      args: { input: AttachWorkflowToPageInput }
    ) {
      const { input } = args;

      // Check if already attached
      const existing = await prisma.appScreenPageWorkflow.findUnique({
        where: {
          pageId_workflowId: {
            pageId: input.pageId,
            workflowId: input.workflowId,
          },
        },
      });

      if (existing) {
        throw new Error("Workflow already attached to this page");
      }

      const pageWorkflow = await prisma.appScreenPageWorkflow.create({
        data: {
          pageId: input.pageId,
          workflowId: input.workflowId,
          order: input.order ?? 0,
          isActive: input.isActive ?? true,
          configOverride: input.configOverride,
        },
        include: {
          workflow: true,
          page: {
            include: {
              screen: true,
            },
          },
        },
      });

      return {
        ...pageWorkflow,
        createdAt: pageWorkflow.createdAt.toISOString(),
        updatedAt: pageWorkflow.updatedAt.toISOString(),
        workflow: {
          ...pageWorkflow.workflow,
          createdAt: pageWorkflow.workflow.createdAt.toISOString(),
          updatedAt: pageWorkflow.workflow.updatedAt.toISOString(),
        },
        page: {
          ...pageWorkflow.page,
          createdAt: pageWorkflow.page.createdAt.toISOString(),
          updatedAt: pageWorkflow.page.updatedAt.toISOString(),
        },
      };
    },

    async detachWorkflowFromPage(_parent: unknown, args: { id: string }) {
      await prisma.appScreenPageWorkflow.delete({
        where: { id: args.id },
      });

      return true;
    },

    async updatePageWorkflow(
      _parent: unknown,
      args: { id: string; input: UpdatePageWorkflowInput }
    ) {
      const { id, input } = args;

      const updated = await prisma.appScreenPageWorkflow.update({
        where: { id },
        data: {
          ...(input.order !== undefined && { order: input.order }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...(input.configOverride !== undefined && { configOverride: input.configOverride }),
        },
        include: {
          workflow: true,
          page: {
            include: {
              screen: true,
            },
          },
        },
      });

      return {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        workflow: {
          ...updated.workflow,
          createdAt: updated.workflow.createdAt.toISOString(),
          updatedAt: updated.workflow.updatedAt.toISOString(),
        },
        page: {
          ...updated.page,
          createdAt: updated.page.createdAt.toISOString(),
          updatedAt: updated.page.updatedAt.toISOString(),
        },
      };
    },

    async reorderPageWorkflows(
      _parent: unknown,
      args: { pageId: string; workflowIds: string[] }
    ) {
      const { pageId, workflowIds } = args;

      // Update order for each workflow
      await Promise.all(
        workflowIds.map((id, index) =>
          prisma.appScreenPageWorkflow.update({
            where: { id },
            data: { order: index },
          })
        )
      );

      // Fetch updated workflows
      const workflows = await prisma.appScreenPageWorkflow.findMany({
        where: { pageId },
        include: {
          workflow: true,
          page: {
            include: {
              screen: true,
            },
          },
        },
        orderBy: { order: "asc" },
      });

      return workflows.map((pw) => ({
        ...pw,
        createdAt: pw.createdAt.toISOString(),
        updatedAt: pw.updatedAt.toISOString(),
        workflow: {
          ...pw.workflow,
          createdAt: pw.workflow.createdAt.toISOString(),
          updatedAt: pw.workflow.updatedAt.toISOString(),
        },
        page: {
          ...pw.page,
          createdAt: pw.page.createdAt.toISOString(),
          updatedAt: pw.page.updatedAt.toISOString(),
        },
      }));
    },
  },

  Workflow: {
    screenPages: async (parent: any) => {
      if (parent.screenPages) return parent.screenPages;
      
      const screenPages = await prisma.appScreenPageWorkflow.findMany({
        where: { workflowId: parent.id },
        include: {
          page: {
            include: {
              screen: true,
            },
          },
        },
        orderBy: { order: "asc" },
      });

      return screenPages.map((sp) => ({
        ...sp,
        createdAt: sp.createdAt.toISOString(),
        updatedAt: sp.updatedAt.toISOString(),
      }));
    },
  },

  AppScreenPageWorkflow: {
    page: async (parent: any) => {
      if (parent.page) return parent.page;

      const page = await prisma.appScreenPage.findUnique({
        where: { id: parent.pageId },
        include: { screen: true },
      });

      if (!page) throw new Error("Page not found");

      return {
        ...page,
        createdAt: page.createdAt.toISOString(),
        updatedAt: page.updatedAt.toISOString(),
      };
    },

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

  Workflow: {
    steps: async (parent: any) => {
      if (parent.steps) {
        return parent.steps.map((step: any) => ({
          ...step,
          createdAt: step.createdAt?.toISOString ? step.createdAt.toISOString() : step.createdAt,
          updatedAt: step.updatedAt?.toISOString ? step.updatedAt.toISOString() : step.updatedAt,
        }));
      }

      const steps = await prisma.workflowStep.findMany({
        where: { workflowId: parent.id },
        orderBy: { order: "asc" },
      });

      return steps.map((step) => ({
        ...step,
        createdAt: step.createdAt.toISOString(),
        updatedAt: step.updatedAt.toISOString(),
      }));
    },
  },
};
