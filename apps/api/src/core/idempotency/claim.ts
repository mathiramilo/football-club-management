export const KEY_RETENTION_MS = 24 * 60 * 60 * 1000;
// A request still unfinished after this long was cut off (crash or deploy), so a retry may run it again.
export const IN_PROGRESS_LEASE_MS = 60_000;

export interface StoredRequest {
  requestHash: string;
  startedAt: Date;
  responseStatus: number | null;
  responseBody: unknown;
}

export type Claim =
  | { outcome: 'proceed' }
  | { outcome: 'replay'; status: number; body: unknown }
  | { outcome: 'in_progress' }
  | { outcome: 'reused' };

export function decideClaim(stored: StoredRequest | null, requestHash: string, now: Date): Claim {
  if (!stored) return { outcome: 'proceed' };

  const age = now.getTime() - stored.startedAt.getTime();
  if (age >= KEY_RETENTION_MS) return { outcome: 'proceed' };
  if (stored.requestHash !== requestHash) return { outcome: 'reused' };
  if (stored.responseStatus !== null) {
    return { outcome: 'replay', status: stored.responseStatus, body: stored.responseBody };
  }
  return age < IN_PROGRESS_LEASE_MS ? { outcome: 'in_progress' } : { outcome: 'proceed' };
}
