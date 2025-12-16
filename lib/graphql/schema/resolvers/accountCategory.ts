import { prisma } from "@/lib/db/prisma";

export const accountCategoryResolvers = {
  Query: {
    accountCategories: async () => {
      const categories = await prisma.accountCategory.findMany({
        orderBy: { category: "asc" },
      });

      // Fetch category names from accounts table
      const categoriesWithNames = await Promise.all(
        categories.map(async (cat: any) => {
          const account = await prisma.mobileUserAccount.findFirst({
            where: { categoryId: cat.category },
            select: { categoryName: true },
          });
          
          return {
            ...cat,
            categoryName: account?.categoryName || null,
          };
        })
      );

      return categoriesWithNames;
    },
    accountCategory: async (_: unknown, { id }: { id: string }) => {
      const category = await prisma.accountCategory.findUnique({
        where: { id: parseInt(id) },
      });

      if (!category) return null;

      // Fetch category name from accounts table
      const account = await prisma.mobileUserAccount.findFirst({
        where: { categoryId: category.category },
        select: { categoryName: true },
      });

      return {
        ...category,
        categoryName: account?.categoryName || null,
      };
    },
  },
  Mutation: {
    createAccountCategory: async (
      _: unknown,
      {
        input,
      }: {
        input: { category: string; displayToMobile?: boolean };
      }
    ) => {
      return await prisma.accountCategory.create({
        data: {
          category: input.category,
          displayToMobile: input.displayToMobile ?? true,
        },
      });
    },
    updateAccountCategory: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          id: string;
          category?: string;
          displayToMobile?: boolean;
        };
      }
    ) => {
      const data: { category?: string; displayToMobile?: boolean } = {};
      
      if (input.category !== undefined) {
        data.category = input.category;
      }
      if (input.displayToMobile !== undefined) {
        data.displayToMobile = input.displayToMobile;
      }

      return await prisma.accountCategory.update({
        where: { id: parseInt(input.id) },
        data,
      });
    },
    deleteAccountCategory: async (_: unknown, { id }: { id: string }) => {
      await prisma.accountCategory.delete({
        where: { id: parseInt(id) },
      });
      return true;
    },
  },
};
