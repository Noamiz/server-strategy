import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  type AuthMeResponse,
  type AuthSendCodeResponse,
  type AuthVerifyCodeSuccess,
  type Result,
} from 'common-strategy';
import { app } from '../app';

const assertOkResult = <T>(body: Result<T>): T => {
  expect(body.ok).toBe(true);

  if (!body.ok) {
    throw new Error(`Expected ok result but received ${body.error.code}`);
  }

  return body.data;
};

describe('auth routes', () => {
  it('responds with Result<AuthSendCodeResponse> on /auth/send-code', async () => {
    const response = await request(app)
      .post('/auth/send-code')
      .send({ email: 'user@example.com' });

    expect(response.status).toBe(200);
    const body = response.body as Result<AuthSendCodeResponse>;
    const data = assertOkResult(body);

    expect(typeof data.expiresAt).toBe('number');
    expect(typeof data.maskedDestination).toBe('string');
  });

  it('responds with Result<AuthVerifyCodeSuccess> on /auth/verify-code', async () => {
    const response = await request(app)
      .post('/auth/verify-code')
      .send({ email: 'user@example.com', code: '123456' });

    expect(response.status).toBe(200);
    const body = response.body as Result<AuthVerifyCodeSuccess>;
    const data = assertOkResult(body);

    expect(data.user.email).toBe('user@example.com');
    expect(typeof data.token.token).toBe('string');
    expect(typeof data.token.issuedAt).toBe('number');
    expect(typeof data.token.expiresAt).toBe('number');
  });

  it('responds with Result<AuthMeResponse> on /auth/me', async () => {
    const response = await request(app).get('/auth/me');

    expect(response.status).toBe(200);
    const body = response.body as Result<AuthMeResponse>;
    const data = assertOkResult(body);

    expect(typeof data.user.email).toBe('string');
    expect(typeof data.user.id).toBe('string');
    expect(typeof data.user.createdAt).toBe('number');
    expect(typeof data.user.updatedAt).toBe('number');
    expect(data.user.isActive).toBe(true);
  });
});

