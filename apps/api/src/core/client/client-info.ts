import type { IncomingHttpHeaders } from 'node:http';

import {
  APP_VERSION_HEADER,
  appVersion,
  PLATFORM_HEADER,
  platform,
  type Platform,
} from '@repo/contracts';

export interface ClientInfo {
  platform?: Platform;
  appVersion?: string;
}

// A bad value is dropped, not rejected: only a well-formed version below its platform's minimum is refused (TECH-14).
export function clientInfoFrom(headers: IncomingHttpHeaders): ClientInfo {
  const parsedPlatform = platform.safeParse(headers[PLATFORM_HEADER]);
  const parsedVersion = appVersion.safeParse(headers[APP_VERSION_HEADER]);
  return {
    ...(parsedPlatform.success && { platform: parsedPlatform.data }),
    ...(parsedVersion.success && { appVersion: parsedVersion.data }),
  };
}
