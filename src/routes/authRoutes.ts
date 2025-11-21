import { Router } from 'express';
import {
  type AuthMeResponse,
  type AuthSendCodeRequest,
  type AuthSendCodeResponse,
  type AuthToken,
  type AuthVerifyCodeRequest,
  type AuthVerifyCodeSuccess,
  type Result,
  type User,
} from 'common-strategy';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

const maskEmail = (email: string): string => {
  const [localPart = '', domain = 'example.com'] = email.split('@');
  const visiblePrefix = localPart.slice(0, 1) || 'u';
  return `${visiblePrefix}***@${domain}`;
};

const authRouter = Router();

authRouter.post('/send-code', (req, res) => {
  const payload = req.body as AuthSendCodeRequest;
  // TODO: validate payload and send real verification email.

  const response: Result<AuthSendCodeResponse> = {
    ok: true,
    data: {
      expiresAt: Date.now() + FIVE_MINUTES_MS,
      maskedDestination: maskEmail(payload.email),
    },
  };

  return res.status(200).json(response);
});

authRouter.post('/verify-code', (req, res) => {
  const payload = req.body as AuthVerifyCodeRequest;
  // TODO: verify the supplied code and persist the resulting session.

  const user: User = {
    id: 'user_dummy_id',
    email: payload.email,
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
  // TODO: read auth token from headers and load the associated user.

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

