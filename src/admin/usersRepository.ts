import type { User } from 'common-strategy';
import type { User as PrismaUser } from '@prisma/client';
import { prisma } from '../db/prisma';

export const mapUserFromRecord = (record: PrismaUser): User => {
  const base: User = {
    id: record.id,
    email: record.email,
    isActive: record.isActive,
    createdAt: record.createdAt.getTime(),
    updatedAt: record.updatedAt.getTime(),
  };

  if (record.displayName !== null && record.displayName !== undefined) {
    base.displayName = record.displayName;
  }

  return base;
};

export async function listUsers(): Promise<User[]> {
  const records = await prisma.user.findMany({
    orderBy: { email: 'asc' },
  });

  return records.map(mapUserFromRecord);
}

export async function getUserById(id: string): Promise<User | null> {
  const record = await prisma.user.findUnique({
    where: { id },
  });

  return record ? mapUserFromRecord(record) : null;
}

export async function ensureUserByEmail(email: string, displayName?: string): Promise<User> {
  const record = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      displayName,
      isActive: true,
    },
  });

  return mapUserFromRecord(record);
}

