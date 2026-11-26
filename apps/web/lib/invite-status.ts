export type InactiveInviteStatus = 'expired' | 'used_up' | 'revoked';

export const inactiveInviteStatus = (status: string): InactiveInviteStatus =>
  status === 'expired' || status === 'used_up' ? status : 'revoked';
