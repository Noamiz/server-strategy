import type { NextFunction, Request, Response } from 'express';
import type { Result } from 'common-strategy';
import {
  findSessionByToken,
  isSessionExpired,
  updateSessionLastUsedAt,
} from '../auth/sessionRepository';
import { getUserById } from '../admin/usersRepository';

const unauthorizedResponse = (res: Response, message = 'Unauthorized'): Response => {
  const response: Result<never> = {
    ok: false,
    error: {
      code: 'UNAUTHORIZED',
      message,
    },
  };

  return res.status(401).json(response);
};

const internalServerError = (res: Response): Response => {
  const response: Result<never> = {
    ok: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unable to authenticate request.',
    },
  };

  return res.status(500).json(response);
};

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  const header = req.header('authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    return unauthorizedResponse(res, 'Missing or invalid Authorization header.');
  }

  const token = header.slice('bearer '.length).trim();
  if (!token) {
    return unauthorizedResponse(res, 'Missing or invalid Authorization header.');
  }

  try {
    const session = await findSessionByToken(token);
    if (!session || isSessionExpired(session)) {
      return unauthorizedResponse(res);
    }

    const user = await getUserById(session.userId);
    if (!user || !user.isActive) {
      return unauthorizedResponse(res);
    }

    req.user = user;
    req.session = session;

    updateSessionLastUsedAt(session.id).catch((error) => {
      console.error('Failed to update session lastUsedAt', error);
    });

    return next();
  } catch (error) {
    console.error('Failed to authenticate request', error);
    return internalServerError(res);
  }
};


