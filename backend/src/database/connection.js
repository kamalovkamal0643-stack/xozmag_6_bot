import { PrismaClient } from '@prisma/client';
import { isChannelBindingError, normalizeDatabaseUrl } from './url.js';

if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

function createClient(relaxChannelBinding = false) {
  const url = normalizeDatabaseUrl(process.env.DATABASE_URL, { relaxChannelBinding });
  return new PrismaClient({
    log: ['warn', 'error'],
    ...(url ? { datasources: { db: { url } } } : {}),
  });
}

export let prisma = createClient();

async function ping() {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
}

export async function connectDatabase() {
  try {
    await ping();
  } catch (err) {
    if (!isChannelBindingError(err)) throw err;
    console.warn('⚠️  channel_binding=require ishlamadi — prefer rejimida qayta ulanilmoqda');
    await prisma.$disconnect().catch(() => {});
    prisma = createClient(true);
    await ping();
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
