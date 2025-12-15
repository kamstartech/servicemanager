import { prisma } from "@/lib/db/prisma";
import { GraphQLContext } from "../context";
import { CheckbookRequestStatus } from "@prisma/client";

export const checkbookRequestResolvers = {
  CheckbookRequest: {
    // Field resolver for mobile user
    async mobileUser(parent: any) {
      const user = await prisma.mobileUser.findUnique({
        where: { id: parent.mobileUserId },
      });

      if (!user) return null;

      return {
        id: user.id,
        context: user.context,
        username: user.username,
        phoneNumber: user.phoneNumber,
        customerNumber: user.customerNumber,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    },

    // Field resolver for approved by user
    async approvedByUser(parent: any) {
      if (!parent.approvedBy) return null;

      const user = await prisma.adminWebUser.findUnique({
        where: { id: parent.approvedBy },
      });

      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    },
  },

  Query: {
    // Mobile user: Get their own checkbook requests
    async myCheckbookRequests(
      _: unknown,
      args: { status?: string; page?: number; pageSize?: number },
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      const page = args.page || 1;
      const pageSize = args.pageSize || 20;

      const where: any = { mobileUserId: context.userId };

      if (args.status) {
        where.status = args.status;
      }

      const [requests, total] = await Promise.all([
        prisma.checkbookRequest.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.checkbookRequest.count({ where }),
      ]);

      return {
        requests: requests.map((r) => ({
          ...r,
          id: r.id.toString(),
          requestedAt: r.requestedAt.toISOString(),
          approvedAt: r.approvedAt?.toISOString(),
          readyAt: r.readyAt?.toISOString(),
          collectedAt: r.collectedAt?.toISOString(),
          cancelledAt: r.cancelledAt?.toISOString(),
          rejectedAt: r.rejectedAt?.toISOString(),
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },

    // Mobile user: Get specific request (only if it's theirs)
    async myCheckbookRequest(
      _: unknown,
      args: { id: string },
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      const request = await prisma.checkbookRequest.findFirst({
        where: {
          id: parseInt(args.id),
          mobileUserId: context.userId,
        },
      });

      if (!request) {
        return null;
      }

      return {
        ...request,
        id: request.id.toString(),
        requestedAt: request.requestedAt.toISOString(),
        approvedAt: request.approvedAt?.toISOString(),
        readyAt: request.readyAt?.toISOString(),
        collectedAt: request.collectedAt?.toISOString(),
        cancelledAt: request.cancelledAt?.toISOString(),
        rejectedAt: request.rejectedAt?.toISOString(),
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
      };
    },

    // Admin: Get all checkbook requests with filters
    async checkbookRequests(
      _: unknown,
      args: {
        filter?: {
          status?: string;
          accountNumber?: string;
          mobileUserId?: number;
        };
        page?: number;
        pageSize?: number;
      }
    ) {
      const page = args.page || 1;
      const pageSize = args.pageSize || 20;

      const where: any = {};

      if (args.filter?.status) {
        where.status = args.filter.status;
      }

      if (args.filter?.accountNumber) {
        where.accountNumber = args.filter.accountNumber;
      }

      if (args.filter?.mobileUserId) {
        where.mobileUserId = args.filter.mobileUserId;
      }

      const [requests, total] = await Promise.all([
        prisma.checkbookRequest.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.checkbookRequest.count({ where }),
      ]);

      return {
        requests: requests.map((r) => ({
          ...r,
          id: r.id.toString(),
          requestedAt: r.requestedAt.toISOString(),
          approvedAt: r.approvedAt?.toISOString(),
          readyAt: r.readyAt?.toISOString(),
          collectedAt: r.collectedAt?.toISOString(),
          cancelledAt: r.cancelledAt?.toISOString(),
          rejectedAt: r.rejectedAt?.toISOString(),
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },

    // Admin: Get specific checkbook request
    async checkbookRequest(_: unknown, args: { id: string }) {
      const request = await prisma.checkbookRequest.findUnique({
        where: { id: parseInt(args.id) },
      });

      if (!request) {
        return null;
      }

      return {
        ...request,
        id: request.id.toString(),
        requestedAt: request.requestedAt.toISOString(),
        approvedAt: request.approvedAt?.toISOString(),
        readyAt: request.readyAt?.toISOString(),
        collectedAt: request.collectedAt?.toISOString(),
        cancelledAt: request.cancelledAt?.toISOString(),
        rejectedAt: request.rejectedAt?.toISOString(),
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
      };
    },

    // Admin: Get checkbook request statistics
    async checkbookRequestStats() {
      const [total, ...statusCounts] = await Promise.all([
        prisma.checkbookRequest.count(),
        prisma.checkbookRequest.count({
          where: { status: CheckbookRequestStatus.PENDING },
        }),
        prisma.checkbookRequest.count({
          where: { status: CheckbookRequestStatus.APPROVED },
        }),
        prisma.checkbookRequest.count({
          where: { status: CheckbookRequestStatus.READY_FOR_COLLECTION },
        }),
        prisma.checkbookRequest.count({
          where: { status: CheckbookRequestStatus.COLLECTED },
        }),
        prisma.checkbookRequest.count({
          where: { status: CheckbookRequestStatus.CANCELLED },
        }),
        prisma.checkbookRequest.count({
          where: { status: CheckbookRequestStatus.REJECTED },
        }),
      ]);

      return {
        total,
        PENDING: statusCounts[0],
        APPROVED: statusCounts[1],
        READY_FOR_COLLECTION: statusCounts[2],
        COLLECTED: statusCounts[3],
        CANCELLED: statusCounts[4],
        REJECTED: statusCounts[5],
      };
    },
  },

  Mutation: {
    // Mobile user: Create a checkbook request
    async createCheckbookRequest(
      _: unknown,
      args: {
        input: {
          accountNumber: string;
          numberOfCheckbooks?: number;
          collectionPoint: string;
          notes?: string;
        };
      },
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      // Verify the account belongs to the user
      const account = await prisma.mobileUserAccount.findFirst({
        where: {
          mobileUserId: context.userId,
          accountNumber: args.input.accountNumber,
        },
      });

      if (!account) {
        throw new Error("Account not found or does not belong to you");
      }

      const request = await prisma.checkbookRequest.create({
        data: {
          mobileUserId: context.userId,
          accountNumber: args.input.accountNumber,
          numberOfCheckbooks: args.input.numberOfCheckbooks || 1,
          collectionPoint: args.input.collectionPoint,
          notes: args.input.notes,
          status: CheckbookRequestStatus.PENDING,
        },
      });

      return {
        ...request,
        id: request.id.toString(),
        requestedAt: request.requestedAt.toISOString(),
        approvedAt: request.approvedAt?.toISOString(),
        readyAt: request.readyAt?.toISOString(),
        collectedAt: request.collectedAt?.toISOString(),
        cancelledAt: request.cancelledAt?.toISOString(),
        rejectedAt: request.rejectedAt?.toISOString(),
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
      };
    },

    // Mobile user: Cancel their own checkbook request
    async cancelMyCheckbookRequest(
      _: unknown,
      args: { id: string },
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      const existingRequest = await prisma.checkbookRequest.findFirst({
        where: {
          id: parseInt(args.id),
          mobileUserId: context.userId,
        },
      });

      if (!existingRequest) {
        throw new Error("Checkbook request not found");
      }

      // Only allow cancellation if status is PENDING
      if (existingRequest.status !== CheckbookRequestStatus.PENDING) {
        throw new Error("Can only cancel pending requests");
      }

      const updated = await prisma.checkbookRequest.update({
        where: { id: parseInt(args.id) },
        data: {
          status: CheckbookRequestStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      return {
        ...updated,
        id: updated.id.toString(),
        requestedAt: updated.requestedAt.toISOString(),
        approvedAt: updated.approvedAt?.toISOString(),
        readyAt: updated.readyAt?.toISOString(),
        collectedAt: updated.collectedAt?.toISOString(),
        cancelledAt: updated.cancelledAt?.toISOString(),
        rejectedAt: updated.rejectedAt?.toISOString(),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    },

    // Admin: Update checkbook request
    async updateCheckbookRequest(
      _: unknown,
      args: {
        id: string;
        input: {
          status?: string;
          numberOfCheckbooks?: number;
          collectionPoint?: string;
          notes?: string;
          rejectionReason?: string;
        };
      },
      context: GraphQLContext
    ) {
      const existingRequest = await prisma.checkbookRequest.findUnique({
        where: { id: parseInt(args.id) },
      });

      if (!existingRequest) {
        throw new Error("Checkbook request not found");
      }

      const updateData: any = {};

      if (args.input.status !== undefined) {
        updateData.status = args.input.status;

        // Set timestamp fields based on status
        if (args.input.status === CheckbookRequestStatus.APPROVED) {
          updateData.approvedAt = new Date();
          // Set approvedBy if context has adminId
          if (context.adminId) {
            updateData.approvedBy = context.adminId;
          }
        } else if (
          args.input.status === CheckbookRequestStatus.READY_FOR_COLLECTION
        ) {
          updateData.readyAt = new Date();
        } else if (args.input.status === CheckbookRequestStatus.COLLECTED) {
          updateData.collectedAt = new Date();
        } else if (args.input.status === CheckbookRequestStatus.CANCELLED) {
          updateData.cancelledAt = new Date();
        } else if (args.input.status === CheckbookRequestStatus.REJECTED) {
          updateData.rejectedAt = new Date();
        }
      }

      if (args.input.numberOfCheckbooks !== undefined) {
        updateData.numberOfCheckbooks = args.input.numberOfCheckbooks;
      }

      if (args.input.collectionPoint !== undefined) {
        updateData.collectionPoint = args.input.collectionPoint;
      }

      if (args.input.notes !== undefined) {
        updateData.notes = args.input.notes;
      }

      if (args.input.rejectionReason !== undefined) {
        updateData.rejectionReason = args.input.rejectionReason;
      }

      const updated = await prisma.checkbookRequest.update({
        where: { id: parseInt(args.id) },
        data: updateData,
      });

      return {
        ...updated,
        id: updated.id.toString(),
        requestedAt: updated.requestedAt.toISOString(),
        approvedAt: updated.approvedAt?.toISOString(),
        readyAt: updated.readyAt?.toISOString(),
        collectedAt: updated.collectedAt?.toISOString(),
        cancelledAt: updated.cancelledAt?.toISOString(),
        rejectedAt: updated.rejectedAt?.toISOString(),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    },

    // Admin: Delete checkbook request
    async deleteCheckbookRequest(_: unknown, args: { id: string }) {
      await prisma.checkbookRequest.delete({
        where: { id: parseInt(args.id) },
      });

      return true;
    },
  },
};
