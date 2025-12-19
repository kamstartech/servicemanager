import { prisma } from "@/lib/db/prisma";

export const loginAttemptResolvers = {
  Query: {
    async loginAttempts(
      _parent: unknown,
      args: {
        limit?: number;
        offset?: number;
        status?: string;
        username?: string;
      }
    ) {
      const { limit = 50, offset = 0, status, username } = args;

      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (username) {
        where.username = {
          contains: username,
          mode: "insensitive",
        };
      }

      const [attempts, total] = await Promise.all([
        prisma.deviceLoginAttempt.findMany({
          where,
          include: {
            mobileUser: {
              select: {
                id: true,
                username: true,
                phoneNumber: true,
                customerNumber: true,
                context: true,
              },
            },
          },
          orderBy: {
            attemptedAt: "desc",
          },
          take: limit,
          skip: offset,
        }),
        prisma.deviceLoginAttempt.count({ where }),
      ]);

      return {
        attempts: attempts.map((attempt) => ({
          ...attempt,
          attemptedAt: attempt.attemptedAt.toISOString(),
          otpSentAt: attempt.otpSentAt?.toISOString(),
          otpExpiresAt: attempt.otpExpiresAt?.toISOString(),
          otpVerifiedAt: attempt.otpVerifiedAt?.toISOString(),
        })),
        total,
      };
    },
  },
};
