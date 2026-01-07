import { prisma } from "@/lib/db/prisma";

type CreateFormInput = {
  name: string;
  description?: string;
  category?: string;
  schema: any;
  isActive?: boolean;
};

type UpdateFormInput = {
  name?: string;
  description?: string;
  category?: string;
  schema?: any;
  isActive?: boolean;
};

export const formsResolvers = {
  Query: {
    async forms(
      _parent: unknown,
      args: {
        isActive?: boolean;
        category?: string;
        page?: number;
        limit?: number;
      }
    ) {
      const { isActive, category, page = 1, limit = 10 } = args;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (isActive !== undefined) where.isActive = isActive;
      if (category) where.category = category;

      const [forms, total] = await Promise.all([
        prisma.form.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.form.count({ where }),
      ]);

      return {
        forms: forms.map((form: any) => ({
          ...form,
          createdAt: form.createdAt.toISOString(),
          updatedAt: form.updatedAt.toISOString(),
        })),
        total,
      };
    },

    async form(_parent: unknown, args: { id: string }) {
      const form = await prisma.form.findUnique({
        where: { id: args.id },
      });

      if (!form) {
        throw new Error("Form not found");
      }

      return {
        ...form,
        createdAt: form.createdAt.toISOString(),
        updatedAt: form.updatedAt.toISOString(),
      };
    },
  },

  Mutation: {
    async createForm(
      _parent: unknown,
      args: { input: CreateFormInput },
      context: { userId?: number }
    ) {
      const { input } = args;

      // TODO: Get actual user ID from auth context
      const userId = context.userId || 1;

      const form = await prisma.form.create({
        data: {
          name: input.name,
          description: input.description,
          category: input.category,
          schema: input.schema,
          isActive: input.isActive ?? true,
          createdBy: userId,
        },
      });

      return {
        ...form,
        createdAt: form.createdAt.toISOString(),
        updatedAt: form.updatedAt.toISOString(),
      };
    },

    async updateForm(
      _parent: unknown,
      args: { id: string; input: UpdateFormInput }
    ) {
      const { id, input } = args;

      const form = await prisma.form.update({
        where: { id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
          ...(input.category !== undefined && { category: input.category }),
          ...(input.schema && { schema: input.schema }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
      });

      return {
        ...form,
        createdAt: form.createdAt.toISOString(),
        updatedAt: form.updatedAt.toISOString(),
      };
    },

    async deleteForm(_parent: unknown, args: { id: string }) {
      await prisma.form.delete({
        where: { id: args.id },
      });

      return true;
    },

    async toggleFormActive(_parent: unknown, args: { id: string }) {
      const form = await prisma.form.findUnique({
        where: { id: args.id },
      });

      if (!form) {
        throw new Error("Form not found");
      }

      const updated = await prisma.form.update({
        where: { id: args.id },
        data: { isActive: !form.isActive },
      });

      return {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    },

    async duplicateForm(
      _parent: unknown,
      args: { id: string; name: string },
      context: { userId?: number }
    ) {
      const { id, name } = args;
      // TODO: Get actual user ID from auth context
      const userId = context.userId || 1;

      const form = await prisma.form.findUnique({
        where: { id },
      });

      if (!form) {
        throw new Error("Form not found");
      }

      const newForm = await prisma.form.create({
        data: {
          name: name,
          description: form.description,
          category: form.category,
          schema: form.schema as any,
          isActive: false,
          createdBy: userId,
        },
      });

      return {
        ...newForm,
        createdAt: newForm.createdAt.toISOString(),
        updatedAt: newForm.updatedAt.toISOString(),
      };
    },
  },
};
