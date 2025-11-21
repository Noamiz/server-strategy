import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  type AuthMeResponse,
  type AuthSendCodeResponse,
  type AuthVerifyCodeSuccess,
  type Result,
} from 'common-strategy';
import { app } from '../app';
import {
  MAX_ATTEMPTS,
  getVerificationRecord,
  resetStore,
} from '../auth/codeStore';

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

beforeEach(() => {
  resetStore();
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

    const response = await request(app)
      .post('/auth/verify-code')
      .send({ email: VALID_EMAIL, code: VALID_CODE });

    expect(response.status).toBe(200);
    const body = response.body as Result<AuthVerifyCodeSuccess>;
    const data = assertOkResult(body);

    expect(data.user.email).toBe(VALID_EMAIL);
    expect(typeof data.token.token).toBe('string');
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
  it('returns a placeholder user for now', async () => {
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

