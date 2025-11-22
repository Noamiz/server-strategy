import { Router } from 'express';
import type { Result, User } from 'common-strategy';
import type { UsersListResponse } from '../types/admin';
import { listUsers } from '../admin/inMemoryUsersStore';

export const adminRouter = Router();

adminRouter.get('/users', (_req, res) => {
  const users: User[] = listUsers();

  const response: Result<UsersListResponse> = {
    ok: true,
    data: { items: users },
  };

  return res.status(200).json(response);
});


