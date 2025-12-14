import { prisma } from "@/lib/db/prisma";
import { BeneficiaryType } from "@prisma/client";

export const beneficiaryResolvers = {
  Query: {
    beneficiaries: async (
      _: unknown,
      { userId, type }: { userId: string; type?: BeneficiaryType }
    ) => {
      const where: any = {
        userId: parseInt(userId),
      };

      if (type) {
        where.beneficiaryType = type;
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
    createBeneficiary: async (_: unknown, { input }: { input: any }) => {
      // Validate type-specific required fields
      const validation = validateBeneficiaryInput(input);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Create beneficiary
      return await prisma.beneficiary.create({
        data: {
          userId: input.userId,
          name: input.name.trim(),
          beneficiaryType: input.beneficiaryType,
          phoneNumber: input.phoneNumber?.trim() || null,
          accountNumber: input.accountNumber?.trim() || null,
          bankCode: input.bankCode?.trim() || null,
          bankName: input.bankName?.trim() || null,
          branch: input.branch?.trim() || null,
          description: input.description?.trim() || null,
          isActive: input.isActive ?? true,
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
    case "WALLET":
      if (!phoneNumber || phoneNumber.trim() === "") {
        return {
          valid: false,
          error: "Phone number is required for WALLET beneficiaries",
        };
      }
      break;

    case "BANK_INTERNAL":
      if (!accountNumber || accountNumber.trim() === "") {
        return {
          valid: false,
          error: "Account number is required for BANK_INTERNAL beneficiaries",
        };
      }
      break;

    case "BANK_EXTERNAL":
      if (!accountNumber || accountNumber.trim() === "") {
        return {
          valid: false,
          error: "Account number is required for BANK_EXTERNAL beneficiaries",
        };
      }
      if (!bankCode || bankCode.trim() === "") {
        return {
          valid: false,
          error: "Bank code is required for BANK_EXTERNAL beneficiaries",
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
