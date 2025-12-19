import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const devices = await prisma.mobileDevice.findMany({
    select: {
      id: true,
      deviceId: true,
      mobileUserId: true,
      fcmToken: true,
      isActive: true,
      pushEnabled: true,
    }
  });
  console.log(JSON.stringify(devices, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
