import type { InviteShareChannel } from '@repo/contracts';

import { track } from '@/lib/analytics';

export function inviteUrl(token: string) {
  const origin =
    process.env.NEXT_PUBLIC_WEB_URL ??
    (typeof window === 'undefined' ? '' : window.location.origin);
  return `${origin}/j/${token}`;
}

export async function shareInvite(text: string, url: string): Promise<InviteShareChannel | null> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text });
      track('invite_link_shared', { channel: 'share_sheet' });
      return 'share_sheet';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return null;
    }
  }
  return (await copyInvite(url)) ? 'copy' : null;
}

export async function copyInvite(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    track('invite_link_shared', { channel: 'copy' });
    return true;
  } catch {
    return false;
  }
}
