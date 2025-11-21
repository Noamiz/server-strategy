import {
  type ApiError,
  type AuthSendCodeRequest,
  type AuthVerifyCodeRequest,
  type Result,
} from 'common-strategy';

type ValidationResult<T> = Result<T>;

const EMAIL_REGEX =
  // Basic email validation sufficient for this MVP.
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CODE_REGEX = /^\d{6}$/;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export function validationError(message: string): Result<never> {
  const error: ApiError = {
    code: 'VALIDATION_ERROR',
    message,
  };
  return { ok: false, error };
}

export function validateSendCodeRequest(body: unknown): ValidationResult<AuthSendCodeRequest> {
  if (!isObject(body)) {
    return validationError('Request body must be an object.');
  }

  const { email } = body;

  if (typeof email !== 'string' || email.trim().length === 0) {
    return validationError('Email is required.');
  }

  const normalizedEmail = normalizeEmail(email);

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return validationError('Email must be a valid address.');
  }

  return {
    ok: true,
    data: {
      email: normalizedEmail,
    },
  };
}

export function validateVerifyCodeRequest(body: unknown): ValidationResult<AuthVerifyCodeRequest> {
  if (!isObject(body)) {
    return validationError('Request body must be an object.');
  }

  const { email, code } = body;

  if (typeof email !== 'string' || email.trim().length === 0) {
    return validationError('Email is required.');
  }

  const normalizedEmail = normalizeEmail(email);

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return validationError('Email must be a valid address.');
  }

  if (typeof code !== 'string') {
    return validationError('Verification code must be provided as a string.');
  }

  if (!CODE_REGEX.test(code)) {
    return validationError('Verification code must be a 6-digit string.');
  }

  return {
    ok: true,
    data: {
      email: normalizedEmail,
      code,
    },
  };
}

