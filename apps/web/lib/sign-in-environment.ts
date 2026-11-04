import { useSyncExternalStore } from 'react';

const embeddedBrowser =
  /FBAN|FBAV|FBIOS|FB_IAB|Instagram|WhatsApp|Line\/|musical_ly|BytedanceWebview|; wv\)|(iPhone|iPod|iPad)(?!.*Safari\/).*AppleWebKit/i;
const cancelledByUser = new Set(['access_denied', 'user_cancelled_authorize']);

interface SignInEnvironment {
  search: string;
  isEmbeddedBrowser: boolean;
  providerFailed: boolean;
}

let environment: SignInEnvironment | undefined;

const readEnvironment = () => {
  const { search } = window.location;
  if (environment?.search !== search) {
    const error = new URLSearchParams(search).get('error');
    environment = {
      search,
      isEmbeddedBrowser: embeddedBrowser.test(navigator.userAgent),
      providerFailed: error !== null && !cancelledByUser.has(error),
    };
  }
  return environment;
};

const subscribe = () => () => undefined;

export function useSignInEnvironment() {
  return useSyncExternalStore(subscribe, readEnvironment, () => null);
}
