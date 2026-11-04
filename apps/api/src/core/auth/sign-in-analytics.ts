import { Injectable } from '@nestjs/common';
import type { SignInMethod } from '@repo/contracts';
import { ClsService } from 'nestjs-cls';

import { Analytics } from '../analytics/analytics.js';
import type { RequestContext } from '../request-context.js';

const PROVIDERS = new Set<unknown>(['google', 'apple'] satisfies SignInMethod[]);

interface SignInRequest {
  path: string;
  params?: Record<string, string | undefined>;
  body?: unknown;
}

const providerOf = (body: unknown) =>
  typeof body === 'object' && body !== null && 'provider' in body ? body.provider : undefined;

export function signInMethodOf({ path, params, body }: SignInRequest): SignInMethod | undefined {
  if (path === '/sign-in/email-otp') return 'email_code';
  const provider =
    path === '/callback/:id'
      ? params?.id
      : path === '/sign-in/social'
        ? providerOf(body)
        : undefined;
  return PROVIDERS.has(provider) ? (provider as SignInMethod) : undefined;
}

// F01 telemetry: Better Auth creates the account and the session in the same request, so the request
// context remembers the first until the second is known.
@Injectable()
export class SignInAnalytics {
  constructor(
    private readonly analytics: Analytics,
    private readonly cls: ClsService<RequestContext>,
  ) {}

  accountCreated(): void {
    if (this.cls.isActive()) this.cls.set('accountCreated', true);
  }

  signedIn(userId: string, method: SignInMethod): void {
    this.analytics.capture(userId, 'sign_in_completed', {
      method,
      new_account: this.cls.isActive() && this.cls.get('accountCreated') === true,
    });
  }
}
