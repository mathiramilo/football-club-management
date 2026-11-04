export const homePath = '/';

export function safeNextPath(value: string | null | undefined) {
  if (!value?.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return homePath;
  return value;
}

export function nextPathFromLocation() {
  return safeNextPath(new URLSearchParams(window.location.search).get('next'));
}

export function signInPath(next: string) {
  return next === homePath ? '/sign-in' : `/sign-in?${new URLSearchParams({ next }).toString()}`;
}
