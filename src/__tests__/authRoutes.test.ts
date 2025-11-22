import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type AuthMeResponse,
  type AuthSendCodeResponse,
  type AuthVerifyCodeSuccess,
  type Result,
  type User,
} from 'common-strategy';
import type { Session } from '@prisma/client';
import { app } from '../app';
import {
  MAX_ATTEMPTS,
  getVerificationRecord,
  resetStore,
} from '../auth/codeStore';
import * as SessionRepository from '../auth/sessionRepository';
import * as UsersRepository from '../admin/usersRepository';

const VALID_EMAIL = 'user@example.com';
const VALID_CODE = '123456';

const assertOkResult = <T>(body: Result<T>): T => {
  expect(body.ok).toBe(true);

  if (!body.ok) {
    throw new Error(`Expected ok result but received ${body.error.code}`);
  }

  return body.data;
};

const expectValidationError = (responseBody: Result<unknown>) => {
  expect(responseBody.ok).toBe(false);
  if (responseBody.ok) {
    throw new Error('Expected validation error');
  }
  expect(responseBody.error.code).toBe('VALIDATION_ERROR');
};

const MOCK_USER: User = {
  id: 'user-id-1',
  email: VALID_EMAIL,
  displayName: 'User',
  isActive: true,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_100_000,
};

const MOCK_SESSION: Session = {
  id: 'session-id-1',
  token: 'session-token',
  userId: MOCK_USER.id,
  createdAt: new Date(1_700_000_200_000),
  expiresAt: new Date(Date.now() + 10_000),
  lastUsedAt: null,
  userAgent: null,
  ipAddress: null,
};

const createSessionSpy = vi.spyOn(SessionRepository, 'createSession');
const findSessionByTokenSpy = vi.spyOn(SessionRepository, 'findSessionByToken');
const ensureUserByEmailSpy = vi.spyOn(UsersRepository, 'ensureUserByEmail');
const getUserByIdSpy = vi.spyOn(UsersRepository, 'getUserById');

beforeEach(() => {
  resetStore();
  vi.clearAllMocks();
  ensureUserByEmailSpy.mockResolvedValue(MOCK_USER);
  createSessionSpy.mockResolvedValue(MOCK_SESSION);
  findSessionByTokenSpy.mockResolvedValue(null);
  getUserByIdSpy.mockResolvedValue(MOCK_USER);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /auth/send-code', () => {
  it('returns verification metadata for valid email', async () => {
    const response = await request(app)
      .post('/auth/send-code')
      .send({ email: VALID_EMAIL });

    expect(response.status).toBe(200);
    const body = response.body as Result<AuthSendCodeResponse>;
    const data = assertOkResult(body);

    expect(typeof data.expiresAt).toBe('number');
    expect(data.maskedDestination).toContain('@');
  });

  it('rejects invalid body', async () => {
    const response = await request(app).post('/auth/send-code').send({});

    expect(response.status).toBe(400);
    expectValidationError(response.body as Result<unknown>);
  });
});

describe('POST /auth/verify-code', () => {
  const sendCode = async () => {
    await request(app).post('/auth/send-code').send({ email: VALID_EMAIL });
  };

  it('returns user and token when code matches', async () => {
    await sendCode();

    findSessionByTokenSpy.mockResolvedValue(null);

    const response = await request(app)
      .post('/auth/verify-code')
      .send({ email: VALID_EMAIL, code: VALID_CODE });

    expect(response.status).toBe(200);
    const body = response.body as Result<AuthVerifyCodeSuccess>;
    const data = assertOkResult(body);

    expect(data.user.email).toBe(VALID_EMAIL);
    expect(typeof data.token.token).toBe('string');
    expect(data.token.token.length).toBeGreaterThan(10);
    expect(createSessionSpy).toHaveBeenCalledTimes(1);
  });

  it('fails validation when payload malformed', async () => {
    const response = await request(app)
      .post('/auth/verify-code')
      .send({ email: VALID_EMAIL, code: '12' });

    expect(response.status).toBe(400);
    expectValidationError(response.body as Result<unknown>);
  });

  it('returns 401 for invalid code', async () => {
    await sendCode();

    const response = await request(app)
      .post('/auth/verify-code')
      .send({ email: VALID_EMAIL, code: '000000' });

    expect(response.status).toBe(401);
    const body = response.body as Result<unknown>;
    expect(body.ok).toBe(false);
    if (!body.ok) {
      expect(body.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('returns 400 when the code expired', async () => {
    await sendCode();

    const record = getVerificationRecord(VALID_EMAIL);
    expect(record).toBeDefined();
    if (!record) {
      throw new Error('Expected verification record for test');
    }
    record.expiresAt = Date.now() - 1;

    const response = await request(app)
      .post('/auth/verify-code')
      .send({ email: VALID_EMAIL, code: VALID_CODE });

    expect(response.status).toBe(400);
    const body = response.body as Result<unknown>;
    expect(body.ok).toBe(false);
    if (!body.ok) {
      expect(body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns 429 after too many attempts', async () => {
    await sendCode();

    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      const invalidResponse = await request(app)
        .post('/auth/verify-code')
        .send({ email: VALID_EMAIL, code: '000000' });
      expect(invalidResponse.status).toBe(401);
    }

    const throttled = await request(app)
      .post('/auth/verify-code')
      .send({ email: VALID_EMAIL, code: '000000' });

    expect(throttled.status).toBe(429);
    const body = throttled.body as Result<unknown>;
    expect(body.ok).toBe(false);
    if (!body.ok) {
      expect(body.error.code).toBe('TOO_MANY_REQUESTS');
    }
  });
});

describe('GET /auth/me', () => {
  it('returns 401 when auth header missing', async () => {
    const response = await request(app).get('/auth/me');

    expect(response.status).toBe(401);
    const body = response.body as Result<AuthMeResponse>;
    expect(body.ok).toBe(false);
    if (!body.ok) {
      expect(body.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('returns 401 when token invalid', async () => {
    findSessionByTokenSpy.mockResolvedValue(null);

    const response = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid');

    expect(response.status).toBe(401);
    const body = response.body as Result<AuthMeResponse>;
    expect(body.ok).toBe(false);
    if (!body.ok) {
      expect(body.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('returns the authenticated user when token valid', async () => {
    const validSession: Session = {
      ...MOCK_SESSION,
      token: 'valid-token',
      expiresAt: new Date(Date.now() + 60_000),
    };
    findSessionByTokenSpy.mockResolvedValue(validSession);
    getUserByIdSpy.mockResolvedValue(MOCK_USER);

    const response = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    const body = response.body as Result<AuthMeResponse>;
    const data = assertOkResult(body);
    expect(data.user).toEqual(MOCK_USER);
  });
});

