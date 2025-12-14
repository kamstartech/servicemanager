import { prisma } from "@/lib/db/prisma";

export const mobileUserProfileResolvers = {
  Mutation: {
    createMobileUserProfile: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          mobileUserId: number;
          firstName?: string;
          lastName?: string;
          email?: string;
          phone?: string;
          address?: string;
          city?: string;
          country?: string;
          zip?: string;
        };
      }
    ) => {
      return await prisma.mobileUserProfile.create({
        data: {
          mobileUserId: input.mobileUserId,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          address: input.address,
          city: input.city,
          country: input.country,
          zip: input.zip,
        },
      });
    },
    updateMobileUserProfile: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          mobileUserId: number;
          firstName?: string;
          lastName?: string;
          email?: string;
          phone?: string;
          address?: string;
          city?: string;
          country?: string;
          zip?: string;
        };
      }
    ) => {
      const data: any = {};

      if (input.firstName !== undefined) data.firstName = input.firstName;
      if (input.lastName !== undefined) data.lastName = input.lastName;
      if (input.email !== undefined) data.email = input.email;
      if (input.phone !== undefined) data.phone = input.phone;
      if (input.address !== undefined) data.address = input.address;
      if (input.city !== undefined) data.city = input.city;
      if (input.country !== undefined) data.country = input.country;
      if (input.zip !== undefined) data.zip = input.zip;

      return await prisma.mobileUserProfile.update({
        where: { mobileUserId: input.mobileUserId },
        data,
      });
    },
    deleteMobileUserProfile: async (
      _: unknown,
      { mobileUserId }: { mobileUserId: string }
    ) => {
      await prisma.mobileUserProfile.delete({
        where: { mobileUserId: parseInt(mobileUserId) },
      });
      return true;
    },
  },
};
