# Architecture Decision Log

> Status legend: **Proposed** (recommended, awaiting tech lead confirmation in R0) · **Accepted** · **Open** (needs a spike or input) · **Superseded**.
> The consolidated view of all choices is in [Tech stack](00-tech-stack.md). When an ADR is accepted, move it to its own file `docs/tech/adr/NNN-title.md` if it needs more detail. Keep this log as the index.

| ID | Title | Status | Decide by |
|---|---|---|---|
| ADR-001 | Monorepo with TypeScript end to end | Proposed | R0 week 1 |
| ADR-002 | Mobile: React Native with Expo | Proposed | R0 week 1 |
| ADR-003 | Web: Next.js (App Router) | Proposed | R0 week 1 |
| ADR-004 | Backend: NestJS modular monolith, REST + OpenAPI from Zod | Proposed | R0 week 1 |
| ADR-005 | PostgreSQL, shared-schema multi-tenancy by `club_id` | Accepted (2026-10-23) | R0 week 1 |
| ADR-006 | pg-boss job queue plus transactional outbox | Proposed | R0 week 2 |
| ADR-007 | Authentication: Better Auth | Accepted (2026-10-23, after the TECH-04 spike) | R0 week 2 |
| ADR-008 | Push via Expo Push Service | Proposed | R0 week 2 |
| ADR-009 | Video hosting provider | Open | Start of R2 |
| ADR-010 | LLM provider: Anthropic Claude (Opus 5.5 default) | Proposed | Start of R3 |
| ADR-011 | Primary hosting region: São Paulo | Proposed | R0 week 2 |
| ADR-012 | Observability and product analytics: Sentry and PostHog | Proposed | R0 week 2 |
| ADR-013 | ORM: Prisma | Accepted (2026-10-23, after the TECH-03 spike) | R0 week 1 |
| ADR-014 | Web UI: Tailwind CSS + shadcn/ui with shared design tokens | Proposed | R0 week 2 |
| ADR-015 | Mobile UI: NativeWind with shared tokens; core native libraries | Proposed | R0 week 2 |
| ADR-016 | Client data layer: generated client (Orval) + TanStack Query + offline persistence | Proposed | R0 week 2 |
| ADR-017 | Supporting providers: email (Postmark or Resend) and object storage (Cloudflare R2) | Proposed | R0 week 3 |

---

## ADR-001 · Monorepo with TypeScript end to end
- **Context**: three apps (mobile, web, API), a small team, many shared contracts (RSVP states, metric rules, settings schemas).
- **Decision**: one repository with pnpm workspaces and Turborepo, TypeScript (strict) everywhere, and shared packages (`contracts`, `domain`, `i18n`, `api-client`, `ui-tokens`, `config`).
- **Alternatives**: polyrepo (more overhead, contract drift); mixed languages (e.g. a Laravel/PHP or Python backend), which would share contracts only through OpenAPI code generation.
- **Consequences**: one CI pipeline with caching; atomic changes across API and clients. Needs discipline on package boundaries.

## ADR-002 · Mobile: React Native with Expo
- **Context**: iOS and Android with one team; push notifications with actions; OTA fixes; camera and video capture; offline cache.
- **Decision**: Expo with development builds and config plugins (Continuous Native Generation), Expo Router, EAS Build, Submit and Update (fingerprint runtime-version policy), and `expo-notifications`.
- **Alternatives**: Flutter (separate language, no code sharing with web), native apps (two codebases), PWA only (weak push on iOS, no actionable notifications, poor store presence).
- **Consequences**: fast iteration and OTA updates. Native modules come through config plugins. EAS pricing must be checked for build volume.

## ADR-003 · Web: Next.js (App Router)
- **Context**: the web app serves both an authenticated staff portal and **public, server-rendered pages** whose Open Graph tags power WhatsApp previews. It also hosts the universal-link association files.
- **Decision**: Next.js App Router. Server Components for public pages and client components with TanStack Query for the portal. UI stack in ADR-014.
- **Alternatives**: a Vite SPA plus a separate server for OG pages (two deployables); Remix.
- **Consequences**: SSR and edge caching for public pages, and preview deployments per PR. Next.js is **not** the backend: all business logic stays in the NestJS API.

## ADR-004 · Backend: NestJS modular monolith, REST + OpenAPI from Zod
- **Context**: many cross-cutting rules (authorization, tenancy, scheduling); two clients, with old mobile versions in the wild.
- **Decision**: a single **NestJS 12** deployable (ESM), with one Nest module per bounded context ([Architecture § 4](01-architecture-overview.md#4-backend-modules-bounded-contexts)):
  - NestJS guards backed by a central policy module for authorization,
  - interceptors for idempotency,
  - Nest's native Standard Schema support for request validation (`StandardSchemaValidationPipe`, `@Body({ schema })`), response serialization and OpenAPI generation, all from the Zod schemas in `packages/contracts`. Zod 4.2+ exposes its JSON Schema, so no converter is needed.
  The worker runs from the same codebase as a separate process.
- **Alternatives**: Fastify (lighter, but the structure must be built by hand); tRPC (tight coupling to TS clients, weaker for versioned mobile contracts); GraphQL (more power than needed, harder caching and authorization); microservices (operational overhead). `nestjs-zod` on NestJS 11, named in the first draft of this ADR: its 5.x line supports Nest 10–11 only (checked 2026-10-23), and Nest 12 now does the same work natively. Changed at TECH-01.
- **Consequences**: a clear path to extract modules later if ever needed. The team must keep modules from reaching into each other's tables.

## ADR-005 · PostgreSQL, shared-schema multi-tenancy (Accepted)
- **Context**: thousands of small tenants (clubs), relational data, analytics queries, full-text search.
- **Decision**: managed **PostgreSQL 18**, the same major in local Docker Compose and in CI's Testcontainers. `club_id` on every tenant table, enforced by the repository layer and tests (NFR-SEC-03), and by the database: a child of a club-owned row references it through a composite `(parent_id, club_id)` foreign key, so it can't point into another club, and a trigger keeps `club_id` from ever changing. Extensions: `unaccent`, `pg_trgm`, `citext`, and `btree_gist` for exclusion constraints such as non-overlapping category memberships. Row-Level Security is Later, as defense in depth for wellness tables.
- **Accepted** 2026-10-23 with TECH-03, which built the club and event tables this way (#9, #10).
- **Alternatives**: schema-per-tenant (migration overhead with many small clubs); document databases (relational integrity matters here).
- **Consequences**: simple operations and cross-club platform features (starter library). Isolation must be tested rigorously.

## ADR-006 · pg-boss job queue plus transactional outbox
- **Context**: reliable scheduled work (reminders, digests, wellness cycles, purges) and cross-module side effects.
- **Decision**: **pg-boss** for queueing and scheduling (`startAfter` for scheduled sends, `singletonKey` for de-duplication, retries with backoff, dead-letter queues), plus an `outbox_events` table written in the same transaction as state changes.
- **Alternatives**: BullMQ + Redis (one more piece of infrastructure, but higher throughput; revisit if needed); Graphile Worker (a similar Postgres-based option); cloud schedulers (vendor lock-in, harder local development).
- **Consequences**: one datastore to operate, and transactional enqueueing. Throughput is sufficient for Year 1 (NFR-SCALE-02).

## ADR-007 · Authentication: Better Auth (Accepted)
- **Context**: the first draft set these requirements:
  - Google, Apple and email one-time codes.
  - Works with Expo (native sign-in) and Next.js (cookie sessions), and is verified by the NestJS API.
  - Refresh rotation with reuse detection.
  - No per-user pricing that scales with players.
  - User data in our database.

  It recommended a self-hosted library if the R0 spike confirmed it covers every requirement, otherwise a managed provider. The spike (branch `spike/TECH-04-auth`, 2026-10-23) ran Better Auth 1.7.12 with its Prisma adapter inside NestJS 12 and Prisma 7.10.1 against PostgreSQL 18.6. Next to it ran a 325-line core of our own on `jose` 6.2. A fake identity provider signed the Google and Apple ID tokens, so both tracks ran their real verification code (25 tests):
  - Better Auth covers:
    - native Google and Apple ID-token sign-in, checking issuer, audience (several client IDs), expiry, algorithm and the Apple nonce;
    - email codes: 6 digits, 10-minute expiry, 5 attempts, separate "wrong" and "expired" errors, stored hashed;
    - linking only by verified email (BR-AUTH-01);
    - httpOnly, SameSite=Lax cookies, with cookie requests from untrusted origins rejected;
    - sign-out everywhere, effective on the next request.
  - It doesn't cover:
    - refresh rotation with reuse detection: one opaque token per session, whose expiry slides while the token never changes;
    - hashed session tokens: they are stored in plain text;
    - limits per email: its limiter keys on IP and path;
    - a different idle limit per platform.
  - Our own core covered every requirement. The cost: owning the security code, and building the controllers, web cookie handling and key management ourselves.
  - Managed providers (pricing checked 2026-10-23 on the vendors' pages) cost little at 25k MAU: Clerk Pro and Supabase Pro $25/month, WorkOS $0, Auth0 $2,100. Each misses a hard requirement:
    - data outside the region: Clerk, WorkOS, Firebase, Auth0;
    - web cookies readable by scripts: Clerk, Supabase;
    - no documented native ID-token sign-in: WorkOS, Kinde;
    - user data outside our database: all of them.
- **Decision**: **Better Auth** 1.7, pinned exactly, self-hosted inside the API. Its spec changes are accepted:
  - **Sign-in**: the `emailOTP` plugin (6 digits, 600 s, 5 attempts, `storeOTP: 'hashed'`). Google and Apple use ID-token sign-in on mobile; the web flow is settled in TECH-09. BR-AUTH-03's per-email limits (resend after 60 s, 5 codes an hour) are added with a `hooks.before`.
  - **Sessions**: Better Auth's database sessions, which expire after 90 days without use on every device and slide once a day (BR-AUTH-04, decision D-17). Mobile sends the session token as a bearer token (`bearer` plugin) kept in expo-secure-store by `@better-auth/expo`. Web uses its httpOnly cookie. The API's auth guard calls `auth.api.getSession` on every request.
  - **No refresh rotation or reuse detection**, and session tokens are stored in plain text (accepted risk, NFR-SEC-11).
  - **Routes**: its handler serves `/v1/auth/*`, mounted on the Express instance before Nest's body parser.
  - **Tables**: its `session`, `account` and `verification` models become `auth_sessions`, `auth_identities` and `auth_verifications`. `users` gains `name`, `email_verified` and `image` ([Data model § 3.1](02-data-model.md#31-identity)).
- **Alternatives**:
  - Our own core on `jose` (option c): covers every requirement as written. Not chosen: the team prefers a maintained library to owning sign-in and session security code, and accepts the weaker session model.
  - Supabase Auth: keeps rotation with reuse detection, at $25/month, with a São Paulo region. Not chosen because:
    - its web cookies are readable by scripts;
    - users live in Supabase's `auth` schema, which ties database hosting to Supabase or splits users across two systems;
    - the spike didn't test it.
  - Clerk, Auth0, WorkOS, Firebase, Kinde and Stytch: see Context.
- **Consequences**:
  - **Gains**: no per-user cost, users and sessions in our database, one library for mobile and web, and no new sub-processor.
  - **Risk**: a stolen session token stays valid until it goes 90 days unused or the user signs out everywhere, with no reuse detection, and a database or backup read yields live sessions. Mitigations:
    - encryption at rest (NFR-SEC-01) and break-glass production access (NFR-SEC-10);
    - sign-out everywhere (AUTH-12);
    - revoking every session first in a database incident ([Privacy § 11](../product/06-privacy-and-compliance.md#11-security-incidents)).

    Revisit if Better Auth adds hashed tokens or rotation.
  - **Contract pipeline**: `/v1/auth/*` sits outside it. Those routes use Better Auth's error shape, not problem+json, and aren't in the OpenAPI document. Clients sign in through the Better Auth client and use the Orval client for everything else. TECH-04 checks whether its `openAPI` plugin can feed our document, and maps its error codes to `packages/i18n` messages.
  - **Watch on every upgrade**:
    - It refuses to boot when a core column is missing (`users.image` is required although unused).
    - Under a test runner it skips its CSRF origin check unless `advanced.disableOriginCheck: false`, so the test harness must set it.
    - It stores provider ID and access tokens unless a `databaseHooks.account` hook strips them.
    - Its rate limiter is off outside production and keeps counts in memory, so production uses database storage.
    - It fetches Google's and Apple's keys on every sign-in.
  - **Ownership**: Vercel announced its acquisition of Better Auth on 2026-07-07. The library stays MIT.

## ADR-008 · Push via Expo Push Service
- **Context**: iOS and Android push with action buttons, receipts and token management.
- **Decision**: Expo Push Service (wraps APNs and FCM), sent from the worker with `expo-server-sdk`. Notification categories with actions are defined through `expo-notifications`.
- **Alternatives**: direct APNs and FCM (more work, no real benefit at our scale); OneSignal and similar (cost, another vendor).
- **Consequences**: simple integration. Receipts must be polled to clean tokens (BR-NOTIF-12). Background handling of RSVP actions must be validated in R0.

## ADR-009 · Video hosting provider (Open, decide at start of R2)
- **Context**: short drill videos (≤ 2 min) uploaded from phones and watched on mobile data (BR-EXR-05, NFR-DATA-02).
- **Options**: Mux, Cloudflare Stream, or raw storage plus our own transcoding (not recommended).
- **Criteria**: price per stored and delivered minute, resumable direct uploads from mobile, adaptive streaming (HLS for `expo-video`), thumbnails, webhooks, LatAm delivery performance.
- **Fallback**: launch R2 with external links and photos only (OQ-12) if cost is a blocker.

## ADR-010 · LLM provider: Anthropic Claude
- **Context**: plan generation with strict structure, tool-using chat over club data, and Spanish-language coaching content.
- **Decision**: Anthropic Claude API through the official TypeScript SDK (`@anthropic-ai/sdk`), with **Claude Opus 5.5** (`claude-opus-5-5`) as the default model. Structured outputs, strict tools, prompt caching, streaming and the server-side refusal fallback are described in [AI architecture](04-ai-architecture.md).
- **Consequences**: per-request cost needs quotas and pricing alignment (OQ-04, OQ-14). The provider is a sub-processor (privacy policy, DPA). An evaluation set gates model and prompt changes.

## ADR-011 · Primary hosting region: São Paulo
- **Context**: users in Uruguay and Argentina; RSVP latency and notification timing.
- **Decision**: host the API, worker and database in a São Paulo region. Web pages are served from Vercel's edge network. Confirm availability with each chosen provider.
- **Consequences**: lower latency for target users. Check the data-transfer clauses in the privacy policy (data stored outside Uruguay and Argentina; adequacy and contractual safeguards to confirm with counsel).

## ADR-012 · Observability and product analytics
- **Decision**: Sentry for errors and performance in all apps (`@sentry/react-native`, `@sentry/nextjs`, `@sentry/nestjs`), Pino structured logs with redaction, and PostHog for product analytics and feature flags.
- **Constraints**: no health data, no free text and no tokens are sent to any of them (NFR-OBS-02, NFR-OBS-05).

## ADR-013 · ORM: Prisma (Accepted)
- **Context**: the first draft chose Prisma for its migrations and developer experience, to be confirmed by an R0 spike on the RSVP and roll call slice plus one analytics query; switch only on a real problem. The spike (branch `spike/TECH-03-orm`, 2026-10-23) ran Prisma 7.10.1 with `@prisma/adapter-pg` against PostgreSQL 18.6 at Year-1 volume from the seed generator (NFR-SCALE-02: 200 clubs, 799 categories, 161,649 events, 3.3 M invitees, 2.6 M RSVP changes), on a laptop with a warm cache:
  - ANL-03 per-player attendance for the busiest category over 12 months: p95 6.5 ms with TypedSQL, 6.3 ms with a `$queryRaw` tagged template, 18.5 ms with the query API plus TypeScript filtering, 48.6 ms at 10 concurrent (target p95 ≤ 1.5 s, NFR-PERF-01). Index scans only; all three return the same rows.
  - EVT-08 RSVP write (interactive transaction: read, update the invitee, append history): p95 3.9 ms sequential, 12.4 ms at 20 concurrent (target p95 ≤ 500 ms).
  - EVT-15 roll call of about 25 invitees: p95 16.5 ms with one update per invitee, 6.8 ms with `updateMany` per status, 6.1 ms with one `UPDATE … FROM (VALUES …)`.
  - TypedSQL is still a preview feature, `prisma generate --sql` needs a migrated database (turbo's `db:generate`, lint and typecheck run without one), and it types every `count(*)` as nullable.
- **Decision**: **Prisma 7** with the `pg` driver adapter.
  - Heavy analytics queries use the `$queryRaw` tagged template with a declared row type. TypedSQL waits until it leaves preview and can generate without a database.
  - Writes that set a few distinct values across many rows (roll call) use `updateMany` grouped by value in one transaction.
  - Partial indexes and composite tenant foreign keys live in the schema (`partialIndexes` preview); CHECK constraints and expression indexes go in the migration SQL, which drift checks leave alone.
- **Alternatives**: Drizzle (SQL-first, lighter runtime). The spike found no problem it would solve, and switching would cost the migrations workflow and the generated client already in place.
- **Consequences**: two preview features in use (`partialIndexes`, `postgresqlExtensions`): check them on every Prisma upgrade. Raw SQL row types are hand-declared, so each analytics query needs an integration test that checks its rows. The membership-on-date check is the largest share of the attendance query; add a `(club_membership_id, category_id)` index if F04 needs it. Watch: `pg` waits forever for a connection unless `connectionTimeoutMillis` is set, and a Prisma error's `meta` carries the failing row (database rule).

## ADR-014 · Web UI: Tailwind CSS + shadcn/ui with shared design tokens
- **Context**: a data-heavy staff portal (tables, dashboards, editors) and fast public pages; accessibility target WCAG 2.2 AA.
- **Decision**:
  - Tailwind CSS with a preset generated from `packages/ui-tokens`.
  - shadcn/ui components (Radix primitives, owned in the repo).
  - TanStack Table for tables, Recharts for charts, dnd-kit for drag and drop, and Tiptap for rich text (R3).
  - Club theming through CSS variables.
- **Alternatives**: MUI or Mantine (faster start, heavier, harder to match the mobile look); custom CSS (slower).
- **Consequences**: one styling language shared with mobile (ADR-015), and accessible primitives by default.

## ADR-015 · Mobile UI: NativeWind with shared tokens; core native libraries
- **Context**: one design system across web and mobile; outdoor-readable screens; low-end Android performance.
- **Decision**:
  - NativeWind, using the same token preset as web, with our own primitives on top.
  - FlashList for long lists.
  - Reanimated, Gesture Handler and Bottom Sheet for interactions.
  - expo-image and expo-video for media; victory-native for charts; react-native-svg for the body map.
- **Alternatives**: Tamagui (a powerful cross-platform system, steeper learning curve); Unistyles or StyleSheet only (no shared mental model with web).
- **Consequences**: designers and developers use the same tokens and class vocabulary on both platforms. NativeWind configuration is validated in the R0 spike.

## ADR-016 · Client data layer: generated client + TanStack Query + offline persistence
- **Context**: two clients consuming one versioned API; offline writes for RSVP, roll call and check-ins; optimistic UI.
- **Decision**:
  - **Orval** generates a typed fetch client and TanStack Query hooks from the OpenAPI document into `packages/api-client`.
  - A thin wrapper adds auth, version headers, `Idempotency-Key` and problem+json mapping.
  - On mobile, the query cache and **paused mutations** are persisted with react-native-mmkv and resumed on reconnect.
  - Zustand holds local UI state.
- **Alternatives**: `openapi-typescript` + `openapi-fetch` with hand-written hooks; a custom sync engine (unnecessary at this scale).
- **Consequences**: no hand-written API types, and offline behavior comes from a well-known library. Generated code is never edited by hand.

## ADR-017 · Supporting providers: email and object storage
- **Decision**:
  - Transactional email through **Postmark or Resend** (choose by LatAm deliverability and price in R0), with templates in **React Email** localized through `packages/i18n`.
  - Object storage on **Cloudflare R2** (S3 API) with presigned uploads and short-TTL signed reads.
- **Consequences**: no vendor lock-in for storage (S3 API). Email templates are versioned in the repo.
