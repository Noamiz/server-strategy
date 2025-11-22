import { Router } from 'express';
import type { Result } from 'common-strategy';
import type { UsersListResponse } from '../types/admin';
import { listUsers } from '../admin/usersRepository';

export const adminRouter = Router();

adminRouter.get('/users', async (_req, res) => {
  try {
    const users = await listUsers();

    const response: Result<UsersListResponse> = {
      ok: true,
      data: { items: users },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Failed to fetch admin users', error);

    const response: Result<UsersListResponse> = {
      ok: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to load admin users.',
      },
    };

    return res.status(500).json(response);
  }
});


