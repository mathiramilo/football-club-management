import { createAuthClient } from 'better-auth/client';
import { emailOTPClient } from 'better-auth/client/plugins';

import { apiUrl } from '@/lib/api-client';
import { signOutOfGoogle } from '@/lib/google-sign-in';
import { errorMessageKey, type MessageKey } from '@/lib/i18n';
import { forgetUser, observeUser } from '@/lib/observed-user';
import { endSession, getSessionToken, startSession } from '@/lib/session';

const userIdOf = (data: unknown) =>
  typeof data === 'object' &&
  data !== null &&
  'user' in data &&
  typeof data.user === 'object' &&
  data.user !== null &&
  'id' in data.user &&
  typeof data.user.id === 'string'
    ? data.user.id
    : undefined;

export const authClient = createAuthClient({
  baseURL: apiUrl,
  basePath: '/v1/auth',
  plugins: [emailOTPClient()],
  fetchOptions: {
    credentials: 'omit',
    auth: { type: 'Bearer', token: () => getSessionToken() ?? undefined },
    onSuccess: async ({ response, data }) => {
      const token = response.headers.get('set-auth-token');
      if (!token) return;
      await startSession(token);
      const userId = userIdOf(data);
      if (userId) observeUser(userId);
    },
  },
});

export async function signOut() {
  const token = getSessionToken() ?? undefined;
  await endSession();
  forgetUser();
  void Promise.allSettled([
    authClient.signOut({ fetchOptions: { auth: { type: 'Bearer', token } } }),
    signOutOfGoogle(),
  ]);
}

export type AuthResult = { ok: true } | { ok: false; message: MessageKey };

const statusCodes: Partial<Record<number, string>> = { 429: 'RATE_LIMITED' };

export async function attempt(
  request: () => Promise<{ error: { code?: string; status: number } | null }>,
): Promise<AuthResult> {
  try {
    const { error } = await request();
    if (error === null) return { ok: true };
    return { ok: false, message: errorMessageKey(error.code, statusCodes[error.status]) };
  } catch {
    return { ok: false, message: 'signIn.offline' };
  }
}

export const requestSignInCode = (email: string) =>
  attempt(() => authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' }));

export const signInWithCode = (email: string, otp: string) =>
  attempt(() => authClient.signIn.emailOtp({ email, otp }));
