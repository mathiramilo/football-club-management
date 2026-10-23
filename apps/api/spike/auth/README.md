# Auth spike (TECH-04, ADR-007) — not for merge

Question from tech stack § 8: does a self-hosted library (Better Auth) cover native Google and Apple sign-in on Expo, email codes, refresh rotation and cookie sessions for Next.js against the NestJS API? What would a managed provider cost at 25k MAU?

## Setup

- Better Auth 1.7.12 (latest stable, published 2026-10-20) with its Prisma adapter, inside NestJS 12.2 on Express 5, Prisma 7.10.1, PostgreSQL 18.6 in Testcontainers.
- Two tracks against the same database:
  - **(a) Better Auth**: `better-auth/create-auth.ts`, mounted on the Express instance, with a Nest guard that calls `auth.api.getSession`.
  - **(c) Our own code on `jose`**: `custom/`, on the tables of data model § 3.1 plus `refresh_tokens.family_id`.
- Google and Apple ID tokens come from a fake identity provider that signs RS256 tokens. Its JWKS is served at the real Google and Apple JWKS URLs by stubbing `fetch`, so the real verification code of both tracks runs.
- Migration `20261023210000_spike_auth` adds both tracks' tables.
- Run (Docker must be running): `pnpm exec vitest run --config spike/auth/vitest.config.ts` → 25 tests, all passing. Tests named `GAP:` pass by proving the gap.

## Results (2026-10-23)

| Requirement | (a) Better Auth 1.7.12 | (c) Own code on jose |
|---|---|---|
| Native Google and Apple ID-token sign-in (AUTH-01, AUTH-02) | ✅ `signIn.social` with `idToken`. Checks issuer, audience (several client IDs), expiry and algorithm; Apple nonce raw or SHA-256 | ✅ 56 lines |
| Link only by verified email (BR-AUTH-01) | ✅ with the default config | ✅ |
| Codes: 6 digits, 10 min, 5 attempts, "wrong" vs "expired" (BR-AUTH-03) | ✅ `emailOTP` plugin, code stored hashed | ✅ HMAC with a server pepper |
| Resend after 60 s; 5 codes per email per hour (BR-AUTH-03, NFR-SEC-05) | ❌ The limiter keys on IP and path: 8 requests for one email from 8 IPs all pass. Needs a `hooks.before` | ✅ |
| Refresh rotation with reuse detection (BR-AUTH-04, NFR-SEC-11) | ❌ One opaque token per session. Its expiry slides every `updateAge`; the token never changes | ✅ Rotates on every refresh; reuse revokes the family; one of two concurrent refreshes wins |
| Access-granting tokens stored hashed (privacy rule) | ❌ The session token is stored in plain text: a database read yields live sessions | ✅ SHA-256 |
| Idle expiry 90 days mobile, 30 days web (BR-AUTH-04) | ⚠️ One `expiresIn` for every client | ✅ |
| Sign out everywhere, effective on the next call (AUTH-12) | ✅ Each request looks up the session | ✅ With a per-request family check (one indexed query). A stateless JWT alone keeps working up to 15 min |
| Web: httpOnly, SameSite cookies with CSRF protection | ✅ `HttpOnly; SameSite=Lax`; rejects cookie requests from untrusted origins | Not built in the spike: our own cookie and Origin check (TECH-04, TECH-09) |
| User data in our database | ✅ In its schema: `users` gains `name`, `email_verified` (a boolean duplicating `email_verified_at`) and `image`, and its `session`, `account` and `verification` tables replace ours | ✅ Data model § 3.1 as designed |
| Contract-first API: problem+json, OpenAPI, Orval | ❌ Its own routes, error shape and client (`better-auth/client`, `@better-auth/expo`). Wrapping `auth.api` in our controllers is possible but leaves both shapes in play | ✅ |
| No cost per active user | ✅ MIT. Vercel announced its acquisition on 2026-07-07; the post says it stays MIT | ✅ |

### Size

- (c): 325 non-blank lines in 5 files. Its 11 tests cover all of it.
- (a): a 68-line config plus about 15 lines of Nest glue. That excludes the work around its ❌ rows.
- Neither track includes: Nest controllers and contracts, web cookie handling, email delivery (ADR-017), or signing-key storage and rotation.

### Other Better Auth findings

- **Boot check:** it refuses to start ("Prisma schema mismatch") unless every core column exists with its type. `users.image` is required even if unused.
- **CSRF in tests:** under a test runner it skips its CSRF origin check unless `advanced.disableOriginCheck: false` is set explicitly. Tests without that setting would miss CSRF regressions.
- **Provider tokens:** by default it stores the provider's ID and access tokens in `account` rows, and the ID token carries name and email. A `databaseHooks.account` hook strips them.
- **JWKS fetching:** it fetches Google's and Apple's JWKS on every ID-token sign-in, with no cache.
- **Rate limiter:** enabled only when `NODE_ENV=production`, and stored in memory per instance by default.
- **Mounting:** it reads the raw body, so its handler must be mounted on the Express instance before `app.init()` registers Nest's body parser. It works on Nest 12 with Express 5 (`/v1/auth/ba/*splat`).
- **Telemetry:** off by default.

## Managed providers (pricing checked 2026-10-23 on the vendors' pages)

| Provider | 25k MAU | 50k | 100k | What rules it out |
|---|---|---|---|---|
| Clerk Pro | $25 | $25 | $1,025 | US-only data. The session JWT cookie isn't httpOnly. No refresh rotation |
| Supabase Auth Pro | $25 | $25 | $25 (+$10 custom domain) | Data in Supabase's `auth` schema (São Paulo available). Next.js cookies aren't httpOnly. Ties hosting to Supabase |
| WorkOS AuthKit | $0 | $0 | $0 (+$99 custom domain) | No documented native ID-token sign-in. US data |
| Firebase / Identity Platform | $0 | $0 | $275 | No email codes, only links. US processing. No rotation |
| Kinde Pro | $279 | $716 | $1,534 (Plus) | Browser redirect only. No LatAm region |
| Auth0 B2C Essentials | $2,100 | $3,500 | sales quote | No LatAm region |
| AWS Cognito Essentials, São Paulo | $225 | $600 | $1,350 | Not evaluated beyond price |

At 25k MAU, price is not the blocker ADR-007 expected: Clerk and Supabase cost $25 a month and WorkOS $0. The blockers are:
- data stored outside the region;
- web cookies that aren't httpOnly;
- missing native ID-token sign-in;
- the requirement to keep user data in our own database.

Auth0, Clerk above 50k MAU, and Kinde do grow with active users.

## Outcome

ADR-007 records Better Auth (2026-10-23). The spec drops refresh rotation and reuse detection in favour of revocable server-side sessions that expire after 90 days without use on every device, and accepts plain-text session tokens as a risk. The own-code track stays here as the reference for what that gives up.

## Not covered

- **Real devices:** they need the TECH-08 development build plus real Google and Apple client IDs. Both tracks accept the same ID tokens, so this doesn't change the comparison.
- **Next.js server rendering with cookies:** cross-subdomain cookies or a same-origin rewrite to the API. Decide in TECH-09.
- **In-app browsers in WhatsApp:** this is its own spike.
