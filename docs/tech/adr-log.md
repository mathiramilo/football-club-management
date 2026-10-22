# Architecture Decision Log

> Status legend: **Proposed** (recommended, awaiting tech lead confirmation in R0) · **Accepted** · **Open** (needs a spike or input) · **Superseded**.
> The consolidated view of all choices is in [Tech stack](00-tech-stack.md). When an ADR is accepted, move it to its own file `docs/tech/adr/NNN-title.md` if it needs more detail. Keep this log as the index.

| ID | Title | Status | Decide by |
|---|---|---|---|
| ADR-001 | Monorepo with TypeScript end to end | Proposed | R0 week 1 |
| ADR-002 | Mobile: React Native with Expo | Proposed | R0 week 1 |
| ADR-003 | Web: Next.js (App Router) | Proposed | R0 week 1 |
| ADR-004 | Backend: NestJS modular monolith, REST + OpenAPI from Zod | Proposed | R0 week 1 |
| ADR-005 | PostgreSQL, shared-schema multi-tenancy by `club_id` | Proposed | R0 week 1 |
| ADR-006 | pg-boss job queue plus transactional outbox | Proposed | R0 week 2 |
| ADR-007 | Authentication approach | Open (spike) | R0 week 2 |
| ADR-008 | Push via Expo Push Service | Proposed | R0 week 2 |
| ADR-009 | Video hosting provider | Open | Start of R2 |
| ADR-010 | LLM provider: Anthropic Claude (Opus 5.5 default) | Proposed | Start of R3 |
| ADR-011 | Primary hosting region: São Paulo | Proposed | R0 week 2 |
| ADR-012 | Observability and product analytics: Sentry and PostHog | Proposed | R0 week 2 |
| ADR-013 | ORM: Prisma (Drizzle as alternative) | Proposed (confirm with spike) | R0 week 1 |
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
- **Decision**: a single **NestJS** deployable with one Nest module per bounded context ([Architecture § 4](01-architecture-overview.md#4-backend-modules-bounded-contexts)):
  - NestJS guards backed by a central policy module for authorization,
  - interceptors for idempotency,
  - `nestjs-zod` for validation and OpenAPI generation, from schemas in `packages/contracts`.
  The worker runs from the same codebase as a separate process.
- **Alternatives**: Fastify (lighter, but the structure must be built by hand); tRPC (tight coupling to TS clients, weaker for versioned mobile contracts); GraphQL (more power than needed, harder caching and authorization); microservices (operational overhead).
- **Consequences**: a clear path to extract modules later if ever needed. The team must keep modules from reaching into each other's tables.

## ADR-005 · PostgreSQL, shared-schema multi-tenancy
- **Context**: thousands of small tenants (clubs), relational data, analytics queries, full-text search.
- **Decision**: managed PostgreSQL 16+, with `club_id` on every tenant table, enforced by the repository layer and tests (NFR-SEC-03). Extensions: `unaccent`, `pg_trgm`, `citext`. Row-Level Security is Later, as defense in depth for wellness tables.
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

## ADR-013 · ORM: Prisma (Drizzle as alternative)
- **Decision**: **Prisma** (mature migrations, strong developer experience), using typed raw SQL for heavy analytics queries.
- **Alternative**: Drizzle (SQL-first, lighter runtime), if the team prefers writing SQL.
- **Confirmation**: build the RSVP + roll call slice and one analytics query with Prisma in the R0 spike; switch only if the spike shows a real problem.

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
