import type {
  EmailAddress,
  UnixMs,
  VerificationCode,
} from 'common-strategy';

export interface VerificationRecord {
  email: EmailAddress;
  code: VerificationCode;
  expiresAt: UnixMs;
  attempts: number;
}

type VerificationFailureReason = 'EXPIRED' | 'INVALID' | 'TOO_MANY_ATTEMPTS';

export type VerifyCodeResult =
  | { ok: true }
  | { ok: false; reason: VerificationFailureReason };

const store = new Map<EmailAddress, VerificationRecord>();

export const MAX_ATTEMPTS = 5;
export const CODE_TTL_MS = 5 * 60 * 1000;

export function resetStore(): void {
  store.clear();
}

export function createVerification(
  email: EmailAddress,
  code: VerificationCode,
): VerificationRecord {
  const record: VerificationRecord = {
    email,
    code,
    expiresAt: Date.now() + CODE_TTL_MS,
    attempts: 0,
  };

  store.set(email, record);
  return record;
}

export function getVerificationRecord(email: EmailAddress): VerificationRecord | undefined {
  return store.get(email);
}

export function verifyCode(email: EmailAddress, code: VerificationCode): VerifyCodeResult {
  const record = store.get(email);

  if (!record) {
    return { ok: false, reason: 'INVALID' };
  }

  const now = Date.now();
  if (now > record.expiresAt) {
    store.delete(email);
    return { ok: false, reason: 'EXPIRED' };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: 'TOO_MANY_ATTEMPTS' };
  }

  record.attempts += 1;

  if (record.code !== code) {
    return { ok: false, reason: 'INVALID' };
  }

  store.delete(email);
  return { ok: true };
}

