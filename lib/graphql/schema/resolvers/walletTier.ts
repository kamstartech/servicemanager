import { prisma } from '@/lib/db/prisma';
import { GraphQLError } from 'graphql';

export const walletTierResolvers = {
  Query: {
    walletTiers: async () => {
      return await prisma.walletTier.findMany({
        orderBy: { position: 'asc' },
        include: {
          _count: {
            select: { kycRecords: true }
          }
        }
      });
    },
    
    walletTier: async (_: any, { id }: { id: number }) => {
      return await prisma.walletTier.findUnique({
        where: { id },
        include: {
          _count: {
            select: { kycRecords: true }
          }
        }
      });
    },
    
    defaultWalletTier: async () => {
      return await prisma.walletTier.findFirst({
        where: { isDefault: true }
      });
    },
    
    mobileUserKYC: async (_: any, { mobileUserId }: { mobileUserId: number }) => {
      return await prisma.mobileUserKYC.findUnique({
        where: { mobileUserId },
        include: {
          walletTier: true,
          mobileUser: true
        }
      });
    }
  },
  
  Mutation: {
    createWalletTier: async (_: any, { input }: any) => {
      // Validate limits
      if (input.minimumBalance > input.maximumBalance) {
        throw new GraphQLError('Minimum balance must be less than maximum balance');
      }
      
      if (input.minTransactionAmount > input.maxTransactionAmount) {
        throw new GraphQLError('Min transaction must be less than max transaction');
      }
      
      // If setting as default, unset current default
      if (input.isDefault) {
        await prisma.walletTier.updateMany({
          where: { isDefault: true },
          data: { isDefault: false }
        });
      }
      
      return await prisma.walletTier.create({
        data: {
          ...input,
          requiredKycFields: input.requiredKycFields || [],
          kycRules: input.kycRules || {}
        }
      });
    },
    
    updateWalletTier: async (_: any, { id, input }: any) => {
      // Similar validation as create
      if (input.isDefault) {
        await prisma.walletTier.updateMany({
          where: { isDefault: true, NOT: { id } },
          data: { isDefault: false }
        });
      }
      
      return await prisma.walletTier.update({
        where: { id },
        data: input
      });
    },
    
    deleteWalletTier: async (_: any, { id }: { id: number }) => {
      // Check if any users are assigned
      const count = await prisma.mobileUserKYC.count({
        where: { walletTierId: id }
      });
      
      if (count > 0) {
        throw new GraphQLError('Cannot delete tier with assigned users');
      }
      
      await prisma.walletTier.delete({ where: { id } });
      return true;
    },
    
    reorderWalletTiers: async (_: any, { positions }: any) => {
      // Update positions in transaction
      await prisma.$transaction(
        positions.map((p: any) =>
          prisma.walletTier.update({
            where: { id: p.id },
            data: { position: p.position }
          })
        )
      );
      
      return await prisma.walletTier.findMany({
        orderBy: { position: 'asc' }
      });
    },
    
    updateMobileUserKYC: async (_: any, { mobileUserId, input }: any) => {
      // Find or create KYC record
      const existing = await prisma.mobileUserKYC.findUnique({
        where: { mobileUserId }
      });
      
      if (existing) {
        return await prisma.mobileUserKYC.update({
          where: { mobileUserId },
          data: input,
          include: {
            walletTier: true,
            mobileUser: true
          }
        });
      } else {
        return await prisma.mobileUserKYC.create({
          data: {
            mobileUserId,
            ...input
          },
          include: {
            walletTier: true,
            mobileUser: true
          }
        });
      }
    },
    
    upgradeWalletUserTier: async (_: any, { mobileUserId, newTierId }: any) => {
      // Validate user and tier exist
      const [user, newTier] = await Promise.all([
        prisma.mobileUser.findUnique({
          where: { id: mobileUserId, context: 'WALLET' }
        }),
        prisma.walletTier.findUnique({
          where: { id: newTierId }
        })
      ]);
      
      if (!user) {
        throw new GraphQLError('Wallet user not found');
      }
      
      if (!newTier) {
        throw new GraphQLError('Tier not found');
      }
      
      // Find or create KYC record
      const existingKYC = await prisma.mobileUserKYC.findUnique({
        where: { mobileUserId }
      });
      
      if (existingKYC) {
        return await prisma.mobileUserKYC.update({
          where: { mobileUserId },
          data: { walletTierId: newTierId },
          include: {
            walletTier: true,
            mobileUser: true
          }
        });
      } else {
        return await prisma.mobileUserKYC.create({
          data: {
            mobileUserId,
            walletTierId: newTierId
          },
          include: {
            walletTier: true,
            mobileUser: true
          }
        });
      }
    }
  },
  
  WalletTier: {
    walletUsersCount: async (parent: any) => {
      if (parent._count?.kycRecords !== undefined) {
        return parent._count.kycRecords;
      }
      return await prisma.mobileUserKYC.count({
        where: { walletTierId: parent.id }
      });
    }
  }
};
