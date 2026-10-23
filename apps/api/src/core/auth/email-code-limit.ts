// BR-AUTH-03 and NFR-SEC-05: a new code at most every 60 s, and at most 5 codes per email per hour.
export const RESEND_AFTER_MS = 60_000;
export const CODES_PER_HOUR = 5;
export const HOUR_MS = 60 * 60_000;

export type EmailCodeDecision =
  | { allowed: true }
  | {
      allowed: false;
      code: 'CODE_RESEND_TOO_SOON' | 'CODE_RATE_LIMITED';
      retryAfterSeconds: number;
    };

const secondsUntil = (instant: number, now: number) => Math.ceil((instant - now) / 1000);

export function decideEmailCodeRequest(previousRequests: Date[], now: Date): EmailCodeDecision {
  const nowMs = now.getTime();
  const lastHour = previousRequests
    .map((requestedAt) => requestedAt.getTime())
    .filter((requestedAt) => nowMs - requestedAt < HOUR_MS)
    .sort((a, b) => a - b);

  const latest = lastHour.at(-1);
  if (latest !== undefined && nowMs - latest < RESEND_AFTER_MS) {
    return {
      allowed: false,
      code: 'CODE_RESEND_TOO_SOON',
      retryAfterSeconds: secondsUntil(latest + RESEND_AFTER_MS, nowMs),
    };
  }

  const oldestCounted = lastHour.at(-CODES_PER_HOUR);
  if (lastHour.length >= CODES_PER_HOUR && oldestCounted !== undefined) {
    return {
      allowed: false,
      code: 'CODE_RATE_LIMITED',
      retryAfterSeconds: secondsUntil(oldestCounted + HOUR_MS, nowMs),
    };
  }

  return { allowed: true };
}
