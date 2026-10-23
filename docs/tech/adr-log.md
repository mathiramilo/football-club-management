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
| ADR-007 | Authentication approach | Open (spike) | R0 week 2 |
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

## ADR-007 · Authentication approach (Open, spike in R0)
- **Requirements**:
  - Google, Apple and email one-time codes.
  - Works with Expo (native sign-in) and Next.js (cookie sessions) and is verified by the NestJS API.
  - Refresh rotation with reuse detection.
  - **No per-user pricing that scales with players** (many low-revenue users).
  - User data in our database.
- **Options**:
  - (a) A self-hosted TypeScript auth library (e.g. Better Auth): no per-MAU cost, data in our database, more integration work.
  - (b) A managed provider (e.g. Clerk, Auth0, Supabase Auth): fastest start, per-MAU pricing and a vendor dependency.
  - (c) Custom implementation on top of OAuth/OIDC libraries: maximum control, highest security responsibility.
- **Recommendation**: (a), if the R0 spike ([Tech stack § 8](00-tech-stack.md#8-r0-spikes-risks-to-retire-before-r1-development)) confirms it covers every requirement. Otherwise (b), with a pricing check at 25k MAU.

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
