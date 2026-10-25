import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

import { attempt, type AuthResult, authClient } from '@/lib/auth-client';

export { isGoogleSignInAvailable } from '@/lib/google-sign-in';

const providerFailed: AuthResult = { ok: false, message: 'signIn.providerFailed' };

const signInWithIdToken = async (request: Parameters<typeof attempt>[0]) => {
  const result = await attempt(request);
  return !result.ok && result.message === 'errors.INTERNAL_ERROR' ? providerFailed : result;
};

export async function signInWithGoogle(): Promise<AuthResult | null> {
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;
    const { idToken } = response.data;
    if (!idToken) return providerFailed;
    return await signInWithIdToken(() =>
      authClient.signIn.social({ provider: 'google', idToken: { token: idToken } }),
    );
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) return null;
    return providerFailed;
  }
}

const isCancelled = (error: unknown) =>
  error instanceof Error && 'code' in error && error.code === 'ERR_REQUEST_CANCELED';

export async function signInWithApple(): Promise<AuthResult | null> {
  const nonce = Crypto.randomUUID();
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce),
    });
    const { identityToken, fullName } = credential;
    if (!identityToken) return providerFailed;
    const name =
      fullName?.givenName || fullName?.familyName
        ? { firstName: fullName.givenName ?? '', lastName: fullName.familyName ?? '' }
        : undefined;
    return await signInWithIdToken(() =>
      authClient.signIn.social({
        provider: 'apple',
        idToken: { token: identityToken, nonce, user: name && { name } },
      }),
    );
  } catch (error) {
    if (isCancelled(error)) return null;
    return providerFailed;
  }
}
