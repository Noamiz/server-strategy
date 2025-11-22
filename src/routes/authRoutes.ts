import { Router } from 'express';
import {
  type ApiError,
  type AuthMeResponse,
  type AuthSendCodeResponse,
  type AuthToken,
  type AuthVerifyCodeSuccess,
  type ErrorCode,
  type Result,
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
import {
  createSession,
  generateSessionToken,
  getSessionExpiryDate,
} from '../auth/sessionRepository';
import { ensureUserByEmail } from '../admin/usersRepository';
import { authMiddleware } from '../middleware/authMiddleware';

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

const deriveDisplayName = (email: string): string => {
  const [localPart = 'user'] = email.split('@');
  if (!localPart) {
    return 'User';
  }

  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
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

authRouter.post('/verify-code', async (req, res) => {
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

  try {
    const user = await ensureUserByEmail(email, deriveDisplayName(email));

    const sessionToken = generateSessionToken();
    const expiresAt = getSessionExpiryDate();

    await createSession(user.id, sessionToken, expiresAt, {
      userAgent: req.get('user-agent') ?? undefined,
      ipAddress: req.ip,
    });

    const token: AuthToken = {
      token: sessionToken,
      issuedAt: Date.now(),
      expiresAt: expiresAt.getTime(),
    };

    const response: Result<AuthVerifyCodeSuccess> = {
      ok: true,
      data: {
        user,
        token,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Failed to create session', error);
    return res
      .status(500)
      .json(errorResult('INTERNAL_SERVER_ERROR', 'Unable to create session. Please try again.'));
  }
});

authRouter.get('/me', authMiddleware, (req, res) => {
  if (!req.user) {
    return res
      .status(500)
      .json(errorResult('INTERNAL_SERVER_ERROR', 'Unable to load authenticated user.'));
  }

  const response: Result<AuthMeResponse> = {
    ok: true,
    data: {
      user: req.user,
    },
  };

  return res.status(200).json(response);
});

export { authRouter };

