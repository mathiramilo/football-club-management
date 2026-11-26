import { z } from 'zod';

import type { CategoryFormat } from '../clubs/club.js';
import type { InviteAcceptOutcome, InviteRole } from '../clubs/invite-links.js';

export const signInMethod = z.enum(['google', 'apple', 'email_code']);
export type SignInMethod = z.infer<typeof signInMethod>;

export const inviteShareChannel = z.enum(['share_sheet', 'copy']);
export type InviteShareChannel = z.infer<typeof inviteShareChannel>;

// The product analytics events defined in the feature specs (NFR-OBS-05): IDs and enums only.
export interface AnalyticsEvents {
  sign_in_started: { method: SignInMethod };
  sign_in_completed: { method: SignInMethod; new_account: boolean };
  profile_completed: { is_minor: boolean };
  club_created: { country: string };
  category_created: { format: CategoryFormat; from_template: boolean };
  invite_link_created: { role: InviteRole; approval_required: boolean };
  invite_link_shared: { channel: InviteShareChannel };
  invite_link_accepted: { role: InviteRole; outcome: InviteAcceptOutcome };
}

export type AnalyticsEventName = keyof AnalyticsEvents;
