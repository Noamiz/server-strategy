import { Router } from 'express';
import {
  type ApiError,
  type AuthMeResponse,
  type AuthSendCodeResponse,
  type AuthToken,
  type AuthVerifyCodeSuccess,
  type ErrorCode,
  type Result,
  type User,
  type VerificationCode,
} from 'common-strategy';
import {
  createVerification,
  verifyCode as verifyStoredCode,
} from '../auth/codeStore';
import {
  validateSendCodeRequest,
  validateVerifyCodeRequest,
} from '../auth/validation';

const ONE_HOUR_MS = 60 * 60 * 1000;
const DUMMY_VERIFICATION_CODE: VerificationCode = '123456';

const maskEmail = (email: string): string => {
  const [localPart = '', domain = 'example.com'] = email.split('@');
  const visiblePrefix = localPart.slice(0, 1) || 'u';
  return `${visiblePrefix}***@${domain}`;
};

const errorResult = (code: ErrorCode, message: string): Result<never> => {
  const error: ApiError = {
    code,
    message,
  };
  return { ok: false, error };
};

const authRouter = Router();

authRouter.post('/send-code', (req, res) => {
  const validation = validateSendCodeRequest(req.body);
  if (!validation.ok) {
    return res.status(400).json(validation);
  }

  const { email } = validation.data;
  // TODO: send the verification code via email provider.
  const record = createVerification(email, DUMMY_VERIFICATION_CODE);
  const response: Result<AuthSendCodeResponse> = {
    ok: true,
    data: {
      expiresAt: record.expiresAt,
      maskedDestination: maskEmail(email),
    },
  };

  return res.status(200).json(response);
});

authRouter.post('/verify-code', (req, res) => {
  const validation = validateVerifyCodeRequest(req.body);
  if (!validation.ok) {
    return res.status(400).json(validation);
  }

  const { email, code } = validation.data;

  const verification = verifyStoredCode(email, code);

  if (!verification.ok) {
    if (verification.reason === 'EXPIRED') {
      return res
        .status(400)
        .json(errorResult('VALIDATION_ERROR', 'Verification code expired. Request a new code.'));
    }

    if (verification.reason === 'TOO_MANY_ATTEMPTS') {
      return res
        .status(429)
        .json(errorResult('TOO_MANY_REQUESTS', 'Too many attempts. Please request a new verification code.'));
    }

    return res
      .status(401)
      .json(errorResult('UNAUTHORIZED', 'Invalid verification code.'));
  }

  const user: User = {
    id: 'user_dummy_id',
    email,
    displayName: 'Strategy User',
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const token: AuthToken = {
    token: 'token_dummy_value',
    issuedAt: Date.now(),
    expiresAt: Date.now() + ONE_HOUR_MS,
  };

  const response: Result<AuthVerifyCodeSuccess> = {
    ok: true,
    data: {
      user,
      token,
    },
  };

  return res.status(200).json(response);
});

authRouter.get('/me', (_req, res) => {
  // TODO: read auth token from headers and validate it before returning the user profile.

  const user: User = {
    id: 'user_dummy_id',
    email: 'user@example.com',
    displayName: 'Strategy User',
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const response: Result<AuthMeResponse> = {
    ok: true,
    data: {
      user,
    },
  };

  return res.status(200).json(response);
});

export { authRouter };

