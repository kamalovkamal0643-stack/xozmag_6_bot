import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

export async function connectDatabase() {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
