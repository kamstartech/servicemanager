import { prisma } from "@/lib/db/prisma";
import { MobileUserContext } from "@prisma/client";
import { pubsub, EVENTS } from "../../pubsub";
import { publishAppStructureUpdate } from "../../publish-app-structure-update";

type CreateAppScreenInput = {
  name: string;
  context: MobileUserContext;
  icon: string;
  order?: number;
  isActive?: boolean;
  isTesting?: boolean;
};

type UpdateAppScreenInput = {
  name?: string;
  icon?: string;
  order?: number;
  isActive?: boolean;
  isTesting?: boolean;
};

type CreateAppScreenPageInput = {
  name: string;
  icon: string;
  order?: number;
  isActive?: boolean;
  isTesting?: boolean;
  screenId: string;
};

type UpdateAppScreenPageInput = {
  name?: string;
  icon?: string;
  order?: number;
  isActive?: boolean;
  isTesting?: boolean;
};

export const appScreenResolvers = {
  Query: {
    async appScreens(
      _parent: unknown,
      args: {
        context?: MobileUserContext;
        page?: number;
        limit?: number;
      },
      graphqlContext?: any
    ) {
      const { context, page = 1, limit = 100 } = args;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (context) where.context = context;

      // For mobile users, only return active screens
      const isMobileRequest = !graphqlContext?.adminUser && !graphqlContext?.adminId;
      if (isMobileRequest) {
        where.isActive = true;
      }

      const [screens, total] = await Promise.all([
        prisma.appScreen.findMany({
          where,
          include: {
            pages: {
              orderBy: { order: "asc" },
              ...(isMobileRequest ? { where: { isActive: true } } : {}),
            },
          },
          orderBy: [{ context: "asc" }, { order: "asc" }],
          skip,
          take: limit,
        }),
        prisma.appScreen.count({ where }),
      ]);

      return {
        screens: screens.map((screen) => ({
          ...screen,
          pages: screen.pages.map((page) => ({
            ...page,
            createdAt: page.createdAt.toISOString(),
            updatedAt: page.updatedAt.toISOString(),
          })),
          createdAt: screen.createdAt.toISOString(),
          updatedAt: screen.updatedAt.toISOString(),
        })),
        total,
      };
    },

    async appScreen(_parent: unknown, args: { id: string }, graphqlContext?: any) {
      const isMobileRequest = !graphqlContext?.adminUser && !graphqlContext?.adminId;
      
      const screen = await prisma.appScreen.findUnique({
        where: { id: args.id },
        include: {
          pages: {
            orderBy: { order: "asc" },
            ...(isMobileRequest ? { where: { isActive: true } } : {}),
          },
        },
      });

      if (!screen) {
        throw new Error("Screen not found");
      }

      // For mobile users, check if screen is active
      if (isMobileRequest && !screen.isActive) {
        throw new Error("Screen not found");
      }

      return {
        ...screen,
        pages: screen.pages.map((page) => ({
          ...page,
          createdAt: page.createdAt.toISOString(),
          updatedAt: page.updatedAt.toISOString(),
        })),
        createdAt: screen.createdAt.toISOString(),
        updatedAt: screen.updatedAt.toISOString(),
      };
    },

    async appScreenPages(_parent: unknown, args: { screenId: string }, graphqlContext?: any) {
      const isMobileRequest = !graphqlContext?.adminUser && !graphqlContext?.adminId;
      
      const where: any = { screenId: args.screenId };
      if (isMobileRequest) {
        where.isActive = true;
      }
      
      const pages = await prisma.appScreenPage.findMany({
        where,
        orderBy: { order: "asc" },
      });

      return pages.map((page) => ({
        ...page,
        createdAt: page.createdAt.toISOString(),
        updatedAt: page.updatedAt.toISOString(),
      }));
    },
  },

  Mutation: {
    async createAppScreen(
      _parent: unknown,
      args: { input: CreateAppScreenInput }
    ) {
      const { input } = args;

      // Check if name already exists for this context
      const existing = await prisma.appScreen.findUnique({
        where: {
          context_name: {
            context: input.context,
            name: input.name,
          },
        },
      });

      if (existing) {
        throw new Error(
          `Screen "${input.name}" already exists for ${input.context}`
        );
      }

      const screen = await prisma.appScreen.create({
        data: {
          name: input.name,
          context: input.context,
          icon: input.icon,
          order: input.order ?? 0,
          isActive: input.isActive ?? true,
          isTesting: input.isTesting ?? false,
        },
      });

      // Publish update to subscribers
      await publishAppStructureUpdate();

      return {
        ...screen,
        createdAt: screen.createdAt.toISOString(),
        updatedAt: screen.updatedAt.toISOString(),
      };
    },

    async updateAppScreen(
      _parent: unknown,
      args: { id: string; input: UpdateAppScreenInput }
    ) {
      const { id, input } = args;

      // If updating name, check uniqueness
      if (input.name) {
        const screen = await prisma.appScreen.findUnique({
          where: { id },
        });

        if (!screen) {
          throw new Error("Screen not found");
        }

        const existing = await prisma.appScreen.findFirst({
          where: {
            context: screen.context,
            name: input.name,
            id: { not: id },
          },
        });

        if (existing) {
          throw new Error(
            `Screen "${input.name}" already exists for ${screen.context}`
          );
        }
      }

      const updated = await prisma.appScreen.update({
        where: { id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.icon && { icon: input.icon }),
          ...(input.order !== undefined && { order: input.order }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...(input.isTesting !== undefined && { isTesting: input.isTesting }),
        },
      });

      // Publish update to subscribers
      await publishAppStructureUpdate();

      return {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    },

    async deleteAppScreen(_parent: unknown, args: { id: string }) {
      await prisma.appScreen.delete({
        where: { id: args.id },
      });

      // Publish update to subscribers
      await publishAppStructureUpdate();

      return true;
    },

    async reorderAppScreens(
      _parent: unknown,
      args: { context: MobileUserContext; screenIds: string[] }
    ) {
      const { context, screenIds } = args;

      // Update order for each screen
      await Promise.all(
        screenIds.map((id, index) =>
          prisma.appScreen.update({
            where: { id },
            data: { order: index },
          })
        )
      );

      // Fetch updated screens
      const screens = await prisma.appScreen.findMany({
        where: { context },
        orderBy: { order: "asc" },
      });

      // Publish update to subscribers
      await publishAppStructureUpdate();

      return screens.map((screen) => ({
        ...screen,
        createdAt: screen.createdAt.toISOString(),
        updatedAt: screen.updatedAt.toISOString(),
      }));
    },

    // Page mutations
    async createAppScreenPage(
      _parent: unknown,
      args: { input: CreateAppScreenPageInput }
    ) {
      const { input } = args;

      // Check if page name already exists for this screen
      const existing = await prisma.appScreenPage.findUnique({
        where: {
          screenId_name: {
            screenId: input.screenId,
            name: input.name,
          },
        },
      });

      if (existing) {
        throw new Error(`Page "${input.name}" already exists for this screen`);
      }

      const page = await prisma.appScreenPage.create({
        data: {
          name: input.name,
          icon: input.icon,
          order: input.order ?? 0,
          isActive: input.isActive ?? true,
          isTesting: input.isTesting ?? false,
          screenId: input.screenId,
        },
      });

      // Publish update to subscribers
      await publishAppStructureUpdate();

      return {
        ...page,
        createdAt: page.createdAt.toISOString(),
        updatedAt: page.updatedAt.toISOString(),
      };
    },

    async updateAppScreenPage(
      _parent: unknown,
      args: { id: string; input: UpdateAppScreenPageInput }
    ) {
      const { id, input } = args;

      // If updating name, check uniqueness
      if (input.name) {
        const page = await prisma.appScreenPage.findUnique({
          where: { id },
        });

        if (!page) {
          throw new Error("Page not found");
        }

        const existing = await prisma.appScreenPage.findFirst({
          where: {
            screenId: page.screenId,
            name: input.name,
            id: { not: id },
          },
        });

        if (existing) {
          throw new Error(`Page "${input.name}" already exists for this screen`);
        }
      }

      const updated = await prisma.appScreenPage.update({
        where: { id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.icon && { icon: input.icon }),
          ...(input.order !== undefined && { order: input.order }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...(input.isTesting !== undefined && { isTesting: input.isTesting }),
        },
      });

      // Publish update to subscribers
      await publishAppStructureUpdate();

      return {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    },

    async deleteAppScreenPage(_parent: unknown, args: { id: string }) {
      await prisma.appScreenPage.delete({
        where: { id: args.id },
      });

      // Publish update to subscribers
      await publishAppStructureUpdate();

      return true;
    },

    async reorderAppScreenPages(
      _parent: unknown,
      args: { screenId: string; pageIds: string[] }
    ) {
      const { screenId, pageIds } = args;

      // Update order for each page
      await Promise.all(
        pageIds.map((id, index) =>
          prisma.appScreenPage.update({
            where: { id },
            data: { order: index },
          })
        )
      );

      // Fetch updated pages
      const pages = await prisma.appScreenPage.findMany({
        where: { screenId },
        orderBy: { order: "asc" },
      });

      // Publish update to subscribers
      await publishAppStructureUpdate();

      return pages.map((page) => ({
        ...page,
        createdAt: page.createdAt.toISOString(),
        updatedAt: page.updatedAt.toISOString(),
      }));
    },
  },

  AppScreenPage: {
    screen: async (parent: any) => {
      if (parent.screen) return parent.screen;

      const screen = await prisma.appScreen.findUnique({
        where: { id: parent.screenId },
      });

      if (!screen) throw new Error("Screen not found");

      return {
        ...screen,
        createdAt: screen.createdAt.toISOString(),
        updatedAt: screen.updatedAt.toISOString(),
      };
    },
  },

  Subscription: {
    appStructureUpdated: {
      subscribe: () => pubsub.asyncIterator(EVENTS.APP_STRUCTURE_UPDATED),
      resolve: (payload: any) => payload,
    },
  },
};
