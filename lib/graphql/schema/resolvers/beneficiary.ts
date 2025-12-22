import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { GraphQLError } from "graphql";
import { GraphQLContext } from "../../context";
import { pubsub, EVENTS } from "../../pubsub";
import { publishBeneficiariesUpdate } from "../../publish-beneficiaries-update";

export const beneficiaryResolvers = {
  Query: {
    beneficiaries: async (
      _: unknown,
      { userId, type }: { userId: string; type?: string },
      context: GraphQLContext
    ) => {
      if (!context.userId && !context.adminId) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      // Authorization
      const requestedUserId = parseInt(userId);
      if (!context.adminUser && Number(context.userId) !== requestedUserId) {
        throw new GraphQLError("Forbidden", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const where: any = {
        userId: requestedUserId,
      };

      if (type && type.toUpperCase() !== 'ALL') {
        if (type === "BANK") {
          where.beneficiaryType = {
            in: ["FDH_BANK", "EXTERNAL_BANK"],
          };
        } else if (type === "WALLET") {
          where.beneficiaryType = {
            in: ["FDH_WALLET", "EXTERNAL_WALLET"],
          };
        } else {
          where.beneficiaryType = type;
        }
      }

      const beneficiaries = await prisma.beneficiary.findMany({
        where,
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return beneficiaries.map((b: any) => ({
        id: b.id.toString(),
        userId: b.userId,
        name: b.name,
        beneficiaryType: b.beneficiaryType,
        phoneNumber: b.phoneNumber,
        accountNumber: b.accountNumber,
        bankCode: b.bankCode,
        bankName: b.bankName,
        branch: b.branch,
        description: b.description,
        isActive: b.isActive,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
        user: b.user ? {
          ...b.user,
          id: b.user.id.toString(),
          createdAt: b.user.createdAt.toISOString(),
          updatedAt: b.user.updatedAt.toISOString(),
        } : null,
      }));
    },

    allBeneficiaries: async (
      _: unknown,
      { type }: { type?: string },
      context: GraphQLContext
    ) => {
      if (!context.adminId && !context.adminUser) {
        throw new GraphQLError("Forbidden: Admin access required", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const where: any = {};

      if (type && type.toUpperCase() !== 'ALL') {
        if (type === "BANK") {
          where.beneficiaryType = { in: ["FDH_BANK", "EXTERNAL_BANK"] };
        } else if (type === "WALLET") {
          where.beneficiaryType = { in: ["FDH_WALLET", "EXTERNAL_WALLET"] };
        } else {
          where.beneficiaryType = type;
        }
      }

      const beneficiaries = await prisma.beneficiary.findMany({
        where,
        include: { user: true },
        orderBy: { createdAt: "desc" },
      });

      return beneficiaries.map((b: any) => ({
        id: b.id.toString(),
        userId: b.userId,
        name: b.name,
        beneficiaryType: b.beneficiaryType,
        phoneNumber: b.phoneNumber,
        accountNumber: b.accountNumber,
        bankCode: b.bankCode,
        bankName: b.bankName,
        branch: b.branch,
        description: b.description,
        isActive: b.isActive,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
        user: b.user ? {
          ...b.user,
          id: b.user.id.toString(),
          createdAt: b.user.createdAt.toISOString(),
          updatedAt: b.user.updatedAt.toISOString(),
        } : null,
      }));
    },

    beneficiary: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      if (!context.userId && !context.adminId) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const beneficiary = await prisma.beneficiary.findUnique({
        where: { id: parseInt(id) },
        include: {
          user: true,
        },
      });

      if (!beneficiary) return null;

      // Authorization
      if (!context.adminUser && Number(context.userId) !== beneficiary.userId) {
        throw new GraphQLError("Forbidden", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      return {
        id: beneficiary.id.toString(),
        userId: beneficiary.userId,
        name: beneficiary.name,
        beneficiaryType: beneficiary.beneficiaryType,
        phoneNumber: beneficiary.phoneNumber,
        accountNumber: beneficiary.accountNumber,
        bankCode: beneficiary.bankCode,
        bankName: beneficiary.bankName,
        branch: beneficiary.branch,
        description: beneficiary.description,
        isActive: beneficiary.isActive,
        createdAt: beneficiary.createdAt.toISOString(),
        updatedAt: beneficiary.updatedAt.toISOString(),
        user: beneficiary.user ? {
          ...beneficiary.user,
          id: beneficiary.user.id.toString(),
          createdAt: beneficiary.user.createdAt.toISOString(),
          updatedAt: beneficiary.user.updatedAt.toISOString(),
        } : null,
      };
    },
  },

  Mutation: {
    createBeneficiary: async (
      _: unknown,
      { input }: { input: any },
      context: GraphQLContext
    ) => {
      // Authentication
      if (!context.userId && !context.adminId && !context.mobileUser) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      // Authorization & Input preparation
      let actualUserId: number;
      if (context.mobileUser) {
        actualUserId = context.mobileUser.id;
      } else if (context.adminUser) {
        actualUserId = parseInt(input.userId);
      } else {
        actualUserId = Number(context.userId);
        if (actualUserId !== Number(input.userId)) {
          throw new GraphQLError("Forbidden", {
            extensions: { code: "FORBIDDEN" },
          });
        }
      }

      const actualInput = {
        ...input,
        userId: actualUserId,
      };

      // Validate type-specific required fields
      const validation = validateBeneficiaryInput(actualInput);
      if (!validation.valid) {
        throw new GraphQLError(validation.error || "Invalid input", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      // Pre-check for duplicates to avoid SQL Server unique constraint issues with NULLs
      const existing = await prisma.beneficiary.findFirst({
        where: {
          userId: actualInput.userId,
          beneficiaryType: actualInput.beneficiaryType,
          phoneNumber: actualInput.phoneNumber?.trim() || null,
          accountNumber: actualInput.accountNumber?.trim() || null,
          bankCode: actualInput.bankCode?.trim() || null,
        },
      });

      if (existing) {
        throw new GraphQLError("A beneficiary with these details already exists for your account.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      // Create beneficiary
      try {
        const beneficiary = await prisma.beneficiary.create({
          data: {
            userId: actualInput.userId,
            name: actualInput.name.trim(),
            beneficiaryType: actualInput.beneficiaryType,
            phoneNumber: actualInput.phoneNumber?.trim() || null,
            accountNumber: actualInput.accountNumber?.trim() || null,
            bankCode: actualInput.bankCode?.trim() || null,
            bankName: actualInput.bankName?.trim() || null,
            branch: actualInput.branch?.trim() || null,
            description: actualInput.description?.trim() || null,
            isActive: actualInput.isActive ?? true,
          },
          include: {
            user: true,
          },
        });

        // Publish update to subscribers
        await publishBeneficiariesUpdate(actualInput.userId);

        return {
          id: beneficiary.id.toString(),
          userId: beneficiary.userId,
          name: beneficiary.name,
          beneficiaryType: beneficiary.beneficiaryType,
          phoneNumber: beneficiary.phoneNumber,
          accountNumber: beneficiary.accountNumber,
          bankCode: beneficiary.bankCode,
          bankName: beneficiary.bankName,
          branch: beneficiary.branch,
          description: beneficiary.description,
          isActive: beneficiary.isActive,
          createdAt: beneficiary.createdAt.toISOString(),
          updatedAt: beneficiary.updatedAt.toISOString(),
          user: beneficiary.user ? {
            ...beneficiary.user,
            id: beneficiary.user.id.toString(),
            createdAt: beneficiary.user.createdAt.toISOString(),
            updatedAt: beneficiary.user.updatedAt.toISOString(),
          } : null,
        };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === "P2002") {
            throw new GraphQLError("A beneficiary with these details already exists.", {
              extensions: { code: "BAD_USER_INPUT" },
            });
          }
        }
        throw error;
      }
    },

    updateBeneficiary: async (
      _: unknown,
      { id, input }: { id: string; input: any },
      context: GraphQLContext
    ) => {
      if (!context.userId && !context.adminId) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const existing = await prisma.beneficiary.findUnique({
        where: { id: parseInt(id) },
      });

      if (!existing) {
        throw new GraphQLError("Beneficiary not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      // Authorization
      if (!context.adminUser && Number(context.userId) !== existing.userId) {
        throw new GraphQLError("Forbidden", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      // Validate type-specific required fields
      const validation = validateBeneficiaryInput(input);
      if (!validation.valid) {
        throw new GraphQLError(validation.error || "Invalid input", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const beneficiary = await prisma.beneficiary.update({
        where: { id: parseInt(id) },
        data: {
          name: input.name?.trim(),
          beneficiaryType: input.beneficiaryType,
          phoneNumber: input.phoneNumber?.trim() || null,
          accountNumber: input.accountNumber?.trim() || null,
          bankCode: input.bankCode?.trim() || null,
          bankName: input.bankName?.trim() || null,
          branch: input.branch?.trim() || null,
          description: input.description?.trim() || null,
          isActive: input.isActive,
        },
        include: {
          user: true,
        },
      });

      // Publish update to subscribers
      await publishBeneficiariesUpdate(beneficiary.userId);

      return {
        id: beneficiary.id.toString(),
        userId: beneficiary.userId,
        name: beneficiary.name,
        beneficiaryType: beneficiary.beneficiaryType,
        phoneNumber: beneficiary.phoneNumber,
        accountNumber: beneficiary.accountNumber,
        bankCode: beneficiary.bankCode,
        bankName: beneficiary.bankName,
        branch: beneficiary.branch,
        description: beneficiary.description,
        isActive: beneficiary.isActive,
        createdAt: beneficiary.createdAt.toISOString(),
        updatedAt: beneficiary.updatedAt.toISOString(),
        user: beneficiary.user ? {
          ...beneficiary.user,
          id: beneficiary.user.id.toString(),
          createdAt: beneficiary.user.createdAt.toISOString(),
          updatedAt: beneficiary.user.updatedAt.toISOString(),
        } : null,
      };
    },

    deleteBeneficiary: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      if (!context.userId && !context.adminId) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const existing = await prisma.beneficiary.findUnique({
        where: { id: parseInt(id) },
      });

      if (!existing) {
        throw new GraphQLError("Beneficiary not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      // Authorization
      if (!context.adminUser && Number(context.userId) !== existing.userId) {
        throw new GraphQLError("Forbidden", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      await prisma.beneficiary.delete({
        where: { id: parseInt(id) },
      });

      // Publish update to subscribers
      await publishBeneficiariesUpdate(existing.userId);

      return true;
    },

    toggleBeneficiaryStatus: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      if (!context.userId && !context.adminId) {
        throw new GraphQLError("Authentication required", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const beneficiary = await prisma.beneficiary.findUnique({
        where: { id: parseInt(id) },
      });

      if (!beneficiary) {
        throw new GraphQLError("Beneficiary not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      // Authorization
      if (!context.adminUser && Number(context.userId) !== beneficiary.userId) {
        throw new GraphQLError("Forbidden", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const updated = await prisma.beneficiary.update({
        where: { id: parseInt(id) },
        data: {
          isActive: !beneficiary.isActive,
        },
        include: {
          user: true,
        },
      });

      // Publish update to subscribers
      await publishBeneficiariesUpdate(updated.userId);

      return {
        id: updated.id.toString(),
        userId: updated.userId,
        name: updated.name,
        beneficiaryType: updated.beneficiaryType,
        phoneNumber: updated.phoneNumber,
        accountNumber: updated.accountNumber,
        bankCode: updated.bankCode,
        bankName: updated.bankName,
        branch: updated.branch,
        description: updated.description,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        user: updated.user ? {
          ...updated.user,
          id: updated.user.id.toString(),
          createdAt: updated.user.createdAt.toISOString(),
          updatedAt: updated.user.updatedAt.toISOString(),
        } : null,
      };
    },
  },
  Subscription: {
    beneficiariesUpdated: {
      subscribe: (_parent: any, { userId }: { userId: string }) =>
        pubsub.subscribe(EVENTS.BENEFICIARIES_UPDATED, userId),
      resolve: (payload: any) => payload,
    },
  },
};

// Validation helper
function validateBeneficiaryInput(input: any): {
  valid: boolean;
  error?: string;
} {
  const { beneficiaryType, phoneNumber, accountNumber, bankCode } = input;

  switch (beneficiaryType) {
    case "FDH_WALLET":
    case "EXTERNAL_WALLET":
      if (!phoneNumber || phoneNumber.trim() === "") {
        return {
          valid: false,
          error: `Phone number is required for ${beneficiaryType} beneficiaries`,
        };
      }
      break;

    case "FDH_BANK":
      if (!accountNumber || accountNumber.trim() === "") {
        return {
          valid: false,
          error: "Account number is required for FDH_BANK beneficiaries",
        };
      }
      break;

    case "EXTERNAL_BANK":
      if (!accountNumber || accountNumber.trim() === "") {
        return {
          valid: false,
          error: "Account number is required for EXTERNAL_BANK beneficiaries",
        };
      }
      if (!bankCode || bankCode.trim() === "") {
        return {
          valid: false,
          error: "Bank code is required for EXTERNAL_BANK beneficiaries",
        };
      }
      break;
    default:
      return {
        valid: false,
        error: "Invalid beneficiary type",
      };
  }

  return { valid: true };
}

// Ensure Query and Mutation are already defined in beneficiaryResolvers before this point or merge them correctly
// The previous structure was export const beneficiaryResolvers = { Query: { ... }, Mutation: { ... } };
// I should add Subscription to the existing object if possible, but since I'm at the end of the file, 
// I'll just append it to the exported object structure.

// Wait, the original code had everything inside beneficiaryResolvers.
// Let's just fix the end of the existing beneficiaryResolvers object.
