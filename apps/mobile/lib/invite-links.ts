import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';

import { track } from '@/lib/analytics';

const webUrl = process.env.EXPO_PUBLIC_WEB_URL;

export const inviteUrl = (token: string) => (webUrl ? `${webUrl}/j/${token}` : null);

export async function shareInvite(message: string) {
  const result = await Share.share({ message });
  if (result.action === Share.sharedAction) track('invite_link_shared', { channel: 'share_sheet' });
}

export async function copyInvite(url: string) {
  await Clipboard.setStringAsync(url);
  track('invite_link_shared', { channel: 'copy' });
}
