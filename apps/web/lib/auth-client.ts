import { createAuthClient } from 'better-auth/client';
import { emailOTPClient } from 'better-auth/client/plugins';

import { apiUrl } from '@/lib/api-client';
import { errorMessageKey, type MessageKey } from '@/lib/messages';
import { signInPath } from '@/lib/next-path';

const createClient = () =>
  createAuthClient({
    baseURL: apiUrl(),
    basePath: '/v1/auth',
    plugins: [emailOTPClient()],
    fetchOptions: { credentials: 'include' },
  });

let client: ReturnType<typeof createClient> | undefined;

const authClient = () => (client ??= createClient());

export type AuthResult = { ok: true } | { ok: false; message: MessageKey };

const statusCodes: Partial<Record<number, string>> = { 429: 'RATE_LIMITED' };

async function attempt(
  request: () => Promise<{ error: { code?: string; status: number } | null }>,
): Promise<AuthResult> {
  try {
    const { error } = await request();
    if (error === null) return { ok: true };
    return { ok: false, message: errorMessageKey(error.code, statusCodes[error.status]) };
  } catch {
    return { ok: false, message: 'errors.SERVICE_UNAVAILABLE' };
  }
}

export const requestSignInCode = (email: string) =>
  attempt(() => authClient().emailOtp.sendVerificationOtp({ email, type: 'sign-in' }));

export const signInWithCode = (email: string, otp: string) =>
  attempt(() => authClient().signIn.emailOtp({ email, otp }));

export type SocialProvider = 'google' | 'apple';

const absoluteUrl = (path: string) => new URL(path, window.location.origin).href;

export const signInWithProvider = (provider: SocialProvider, next: string) =>
  attempt(() =>
    authClient().signIn.social({
      provider,
      callbackURL: absoluteUrl(next),
      errorCallbackURL: absoluteUrl(signInPath(next)),
    }),
  );

export async function signOut() {
  await attempt(() => authClient().signOut());
  window.location.assign(signInPath('/'));
}
