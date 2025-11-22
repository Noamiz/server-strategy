import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Result, User } from 'common-strategy';
import type { UsersListResponse } from '../types/admin';
import { app } from '../app';
import * as UsersRepository from '../admin/usersRepository';

const assertOkResult = <T>(body: Result<T>): T => {
  expect(body.ok).toBe(true);

  if (!body.ok) {
    throw new Error(`Expected ok result but received ${body.error.code}`);
  }

  return body.data;
};

const listUsersSpy = vi.spyOn(UsersRepository, 'listUsers');

const SEEDED_USERS: User[] = [
  {
    id: 'user-admin',
    email: 'admin@example.com',
    displayName: 'Admin One',
    isActive: true,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_100_000,
  },
  {
    id: 'user-editor',
    email: 'editor@example.com',
    displayName: 'Editor One',
    isActive: true,
    createdAt: 1_700_000_200_000,
    updatedAt: 1_700_000_300_000,
  },
  {
    id: 'user-viewer',
    email: 'viewer@example.com',
    displayName: 'Viewer One',
    isActive: true,
    createdAt: 1_700_000_400_000,
    updatedAt: 1_700_000_500_000,
  },
  {
    id: 'user-ops',
    email: 'ops@example.com',
    displayName: 'Operations One',
    isActive: true,
    createdAt: 1_700_000_600_000,
    updatedAt: 1_700_000_700_000,
  },
];

beforeEach(() => {
  listUsersSpy.mockReset();
});

afterAll(() => {
  listUsersSpy.mockRestore();
});

describe('GET /admin/users', () => {
  it('returns seeded admin users from the database', async () => {
    listUsersSpy.mockResolvedValue(SEEDED_USERS);

    const response = await request(app).get('/admin/users');

    expect(response.status).toBe(200);

    const body = response.body as Result<UsersListResponse>;
    const data = assertOkResult(body);
    const { items } = data;
    expect(Array.isArray(items)).toBe(true);
    expect(items).toHaveLength(SEEDED_USERS.length);
    expect(items).toEqual(SEEDED_USERS);
    expect(listUsersSpy).toHaveBeenCalledTimes(1);
  });

  it('propagates an ApiError when the repository throws', async () => {
    listUsersSpy.mockRejectedValue(new Error('DB offline'));

    const response = await request(app).get('/admin/users');

    expect(response.status).toBe(500);
    const body = response.body as Result<UsersListResponse>;
    expect(body.ok).toBe(false);
    if (!body.ok) {
      expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(body.error.message).toBe('Unable to load admin users.');
    }
  });
});


