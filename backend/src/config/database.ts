import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const prismaClientSingleton = (): PrismaClient => {
  return new PrismaClient({
    log: ['query', 'error', 'warn'],
  });
};

export const prisma: PrismaClient =
  global.__prisma ?? prismaClientSingleton();

if (process.env['NODE_ENV'] !== 'production') {
  global.__prisma = prisma;
}
