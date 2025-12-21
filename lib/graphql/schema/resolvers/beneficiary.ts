import { prisma } from "@/lib/db/prisma";
import { GraphQLError } from "graphql";
import { GraphQLContext } from "../../context";

export const beneficiaryResolvers = {
  Query: {
    beneficiaries: async (
      _: unknown,
      { userId, type }: { userId: string; type?: string }
    ) => {
      const where: any = {
        userId: parseInt(userId),
      };

      if (type) {
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

      return await prisma.beneficiary.findMany({
        where,
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    },

    beneficiary: async (_: unknown, { id }: { id: string }) => {
      return await prisma.beneficiary.findUnique({
        where: { id: parseInt(id) },
        include: {
          user: true,
        },
      });
    },
  },

  Mutation: {
    createBeneficiary: async (
      _: unknown,
      { input }: { input: any },
      context: GraphQLContext
    ) => {
      // Authentication: Ensure user is logged in
      if (!context.mobileUser) {
        throw new GraphQLError("Unauthorized", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      // Remove userId from input and use authenticated user's ID instead
      // This prevents users from creating beneficiaries for other users
      const { userId: _ignoredUserId, ...benInput } = input;
      const actualInput = {
        ...benInput,
        userId: context.mobileUser.id,
      };

      // Validate type-specific required fields
      const validation = validateBeneficiaryInput(actualInput);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Create beneficiary
      return await prisma.beneficiary.create({
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
    },

    updateBeneficiary: async (
      _: unknown,
      { id, input }: { id: string; input: any }
    ) => {
      // Validate type-specific required fields
      const validation = validateBeneficiaryInput(input);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      return await prisma.beneficiary.update({
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
    },

    deleteBeneficiary: async (_: unknown, { id }: { id: string }) => {
      await prisma.beneficiary.delete({
        where: { id: parseInt(id) },
      });
      return true;
    },

    toggleBeneficiaryStatus: async (_: unknown, { id }: { id: string }) => {
      const beneficiary = await prisma.beneficiary.findUnique({
        where: { id: parseInt(id) },
      });

      if (!beneficiary) {
        throw new Error("Beneficiary not found");
      }

      return await prisma.beneficiary.update({
        where: { id: parseInt(id) },
        data: {
          isActive: !beneficiary.isActive,
        },
        include: {
          user: true,
        },
      });
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
