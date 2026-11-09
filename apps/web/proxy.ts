import { getSessionCookie } from 'better-auth/cookies';
import { type NextRequest, NextResponse } from 'next/server';

import { signInPath } from '@/lib/next-path';

export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  return NextResponse.redirect(new URL(signInPath(pathname + search), request.url));
}

export const config = {
  matcher: [
    '/((?!_next/|\\.well-known/|sign-in|e/|j/|c/|consent/|delete-account|legal/|favicon\\.ico|icon|apple-icon|opengraph-image|twitter-image|robots\\.txt|sitemap\\.xml).*)',
  ],
};
