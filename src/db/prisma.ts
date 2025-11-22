import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var prismaSingleton: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prismaPool: Pool | undefined;
}

const getPrismaClient = (): PrismaClient => {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Create a .env file (see env.example) before running the server.',
    );
  }

  if (!globalThis.prismaSingleton) {
    globalThis.prismaPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const adapter = new PrismaPg(globalThis.prismaPool);
    globalThis.prismaSingleton = new PrismaClient({ adapter });
  }

  return globalThis.prismaSingleton;
};

export const prisma = getPrismaClient();

export const disconnectPrisma = async (): Promise<void> => {
  await globalThis.prismaSingleton?.$disconnect();
  await globalThis.prismaPool?.end();
};



