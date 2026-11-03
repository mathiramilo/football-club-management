import { z } from 'zod';

export const signInMethod = z.enum(['google', 'apple', 'email_code']);
export type SignInMethod = z.infer<typeof signInMethod>;

// The product analytics events defined in the feature specs (NFR-OBS-05): IDs and enums only.
export interface AnalyticsEvents {
  sign_in_started: { method: SignInMethod };
  sign_in_completed: { method: SignInMethod; new_account: boolean };
}

export type AnalyticsEventName = keyof AnalyticsEvents;
