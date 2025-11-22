import { randomBytes } from 'crypto';
import type { Session } from '@prisma/client';
import { prisma } from '../db/prisma';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const generateSessionToken = (): string => randomBytes(32).toString('hex');

export const getSessionExpiryDate = (): Date => new Date(Date.now() + SESSION_TTL_MS);

export const isSessionExpired = (session: Session): boolean =>
  session.expiresAt.getTime() <= Date.now();

export async function createSession(
  userId: string,
  token: string,
  expiresAt: Date,
  metadata?: { userAgent?: string; ipAddress?: string },
): Promise<Session> {
  return prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
    },
  });
}

export async function findSessionByToken(token: string): Promise<Session | null> {
  return prisma.session.findUnique({
    where: { token },
  });
}

export async function updateSessionLastUsedAt(sessionId: string): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { lastUsedAt: new Date() },
  });
}


