import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { Result } from 'common-strategy';
import type { UsersListResponse } from '../types/admin';
import { app } from '../app';

const assertOkResult = <T>(body: Result<T>): T => {
  expect(body.ok).toBe(true);

  if (!body.ok) {
    throw new Error(`Expected ok result but received ${body.error.code}`);
  }

  return body.data;
};

describe('GET /admin/users', () => {
  it('returns a Result<UsersListResponse> with an array of users', async () => {
    const response = await request(app).get('/admin/users');

    expect(response.status).toBe(200);

    const body = response.body as Result<UsersListResponse>;
    const data = assertOkResult(body);
    const { items } = data;
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);

    const user = items[0];
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('displayName');
    expect(user).toHaveProperty('isActive');
    expect(user).toHaveProperty('createdAt');
    expect(user).toHaveProperty('updatedAt');
  });
});


