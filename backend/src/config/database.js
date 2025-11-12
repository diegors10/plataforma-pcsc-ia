import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis.prisma || {};

const prisma =
  globalForPrisma.client ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = { client: prisma };
}

export default prisma;
