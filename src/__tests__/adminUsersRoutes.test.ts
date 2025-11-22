import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Result, User } from 'common-strategy';
import type { Session } from '@prisma/client';
import type { UsersListResponse } from '../types/admin';
import { app } from '../app';
import * as UsersRepository from '../admin/usersRepository';
import * as SessionRepository from '../auth/sessionRepository';

const assertOkResult = <T>(body: Result<T>): T => {
  expect(body.ok).toBe(true);

  if (!body.ok) {
    throw new Error(`Expected ok result but received ${body.error.code}`);
  }

  return body.data;
};

const listUsersSpy = vi.spyOn(UsersRepository, 'listUsers');
const getUserByIdSpy = vi.spyOn(UsersRepository, 'getUserById');
const findSessionByTokenSpy = vi.spyOn(SessionRepository, 'findSessionByToken');

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

const AUTH_USER: User = {
  id: 'auth-user-id',
  email: 'admin@example.com',
  displayName: 'Admin One',
  isActive: true,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_100_000,
};

const AUTH_SESSION: Session = {
  id: 'session-id',
  token: 'valid-token',
  userId: AUTH_USER.id,
  createdAt: new Date(1_700_000_200_000),
  expiresAt: new Date(Date.now() + 60_000),
  lastUsedAt: null,
  userAgent: null,
  ipAddress: null,
};

beforeEach(() => {
  listUsersSpy.mockReset();
  getUserByIdSpy.mockReset();
  findSessionByTokenSpy.mockReset();
  findSessionByTokenSpy.mockResolvedValue(AUTH_SESSION);
  getUserByIdSpy.mockResolvedValue(AUTH_USER);
});

afterAll(() => {
  listUsersSpy.mockRestore();
  getUserByIdSpy.mockRestore();
  findSessionByTokenSpy.mockRestore();
});

describe('GET /admin/users', () => {
  it('rejects requests without Authorization header', async () => {
    const response = await request(app).get('/admin/users');

    expect(response.status).toBe(401);
    const body = response.body as Result<UsersListResponse>;
    expect(body.ok).toBe(false);
    if (!body.ok) {
      expect(body.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('rejects requests with invalid tokens', async () => {
    findSessionByTokenSpy.mockResolvedValue(null);

    const response = await request(app)
      .get('/admin/users')
      .set('Authorization', 'Bearer invalid');

    expect(response.status).toBe(401);
    const body = response.body as Result<UsersListResponse>;
    expect(body.ok).toBe(false);
    if (!body.ok) {
      expect(body.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('returns seeded admin users from the database when authenticated', async () => {
    listUsersSpy.mockResolvedValue(SEEDED_USERS);

    const response = await request(app)
      .get('/admin/users')
      .set('Authorization', 'Bearer valid-token');

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

    const response = await request(app)
      .get('/admin/users')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(500);
    const body = response.body as Result<UsersListResponse>;
    expect(body.ok).toBe(false);
    if (!body.ok) {
      expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(body.error.message).toBe('Unable to load admin users.');
    }
  });
});


