# Football Club Management

Mobile app (Expo), web app (Next.js) and API (NestJS) for amateur and semi-professional football clubs in Uruguay and Argentina. The specs live in `docs/`; start with `docs/README.md`.

**Status:** R0 in progress. Done: the monorepo scaffold (TECH-01) and the database (TECH-03): PostgreSQL 18 and Prisma 7, the core club and event tables, and a synthetic seed generator; ADR-005 and ADR-013 are accepted. Authentication in the API (TECH-04) is done too: Better Auth (ADR-007) with email codes, Google and Apple ID tokens, 90-day sessions and a global auth guard; `packages/i18n` holds the es catalog. So is the contract pipeline (TECH-06): `packages/contracts` (error catalog, problem+json), the OpenAPI document and the Orval client in `packages/api-client` (`pnpm codegen`, `pnpm contract:check`), and `Idempotency-Key` replay. Next: the remaining spikes in `docs/tech/00-tech-stack.md` § 8 and the other R0 enablers.

## How Claude is set up here

- **Rules** (`.claude/rules/`) load automatically. Four always apply: project context, glossary, git and delivery, privacy. The rest load when you touch matching paths: API, contracts, Prisma, jobs, backend tests, domain, web, mobile, i18n, AI.
- **Skills** (`.claude/skills/`) are task workflows. Start a story with `/implement-story <ID>` and finish with `/definition-of-done`.

Project workflows:

| Skill | Use it to |
|---|---|
| `implement-story` | Plan and build a story end to end from its spec |
| `api-endpoint` | Add or change a REST endpoint, contract-first |
| `nestjs` | NestJS mechanics: lifecycle order, decorators, modules, filter, worker context, OpenAPI, Vitest setup, Nest 11 vs 12 |
| `prisma-migration` | Change the database schema safely |
| `background-job` | Add outbox events, scheduled jobs and worker handlers |
| `notification` | Add or change an `N-xx` notification |
| `authorization-policy` | Add or change a permission, with the role and tenant test matrix |
| `offline-mutation` | Make a mobile write work offline |
| `mobile-screen` | Build or change an Expo screen |
| `mobile-performance` | Diagnose and fix mobile speed, jank and size against the NFR targets |
| `web-page` | Build or change a Next.js page |
| `ui-design` | Shape, critique or polish a screen so it looks designed, not generic |
| `ai-feature` | Change the AI assistant or plan generator (R3) |
| `adr` | Record or change a technical decision |
| `definition-of-done` | Check a change before calling it done or opening a PR |

Third-party references, vendored and pinned (sources and changes in `.claude/skills/THIRD_PARTY.md`):

| Skill | Use it for |
|---|---|
| `shadcn` | shadcn/ui components, forms, composition and CLI in `apps/web` |
| `react-composition-patterns` | Compound components and providers instead of boolean props (web and mobile) |
| `react-best-practices` | React and Next.js performance: waterfalls, bundle size, server rendering, re-renders |
| `react-native-skills` | React Native and Expo rules: lists, animation, navigation, UI patterns, monorepo |
| `impeccable` | Deep design work: new visual directions, detector-backed critique and audit, typography, layout, color, copy and native adaptation |
| `design-taste-frontend` | Art direction against generic AI pages: the marketing landing page, and the app-screen run for portal dashboards |
| `web-design-guidelines` | A terse `file:line` review of web UI against Vercel's interface guidelines |
| `accessibility` | WCAG 2.2 audits and fixes on the web |
| `expo-animation` | Motion, gestures, sheets and haptics in the Expo app |
| `expo-design-system` | Mobile tokens, primitives, drift audits and the 20 named "native slop" tells |
| `next-bundle-optimizer` | Audit and cut client JS in `apps/web` against the public-page budget |
| `orval` | Configure the generated client in `packages/api-client` and its fetch mutator |
| `expo-dev-client` · `eas-update` · `expo-upgrade` | Development builds, OTA updates and Expo SDK upgrades |
| `prisma-client-api` | Prisma Client queries, transactions and raw SQL |
| `postgres-best-practices` | Indexes, locking, query plans and schema design in Postgres |

## Commands

pnpm reads the Node version from `devEngines` in the root `package.json` and downloads Node 24 when the active one doesn't match. `npm` and `npx` refuse to run in the repo on another Node: switch first with `nvm use` (`.nvmrc`).

Rows marked with an enabler ID don't run yet. They keep these names when that enabler lands.

| Task | Command | Available |
|---|---|---|
| Install | `pnpm install` | ✅ |
| Local Postgres | `docker compose up -d postgres`, then copy `apps/api/.env.example` to `apps/api/.env` (if 5432 is taken, set `POSTGRES_PORT` in a root `.env` and match it in `DATABASE_URL`) | ✅ |
| Local email (catches every message the API sends) | `docker compose up -d mailpit`, then open http://localhost:8025 | ✅ |
| Run everything in dev (the API's job worker runs as its own process, `dev:worker`) | `pnpm dev` | ✅ |
| Run the built job worker | `pnpm --filter ./apps/api start:worker` | ✅ |
| Lint and format check | `pnpm lint` · `pnpm format:check` (`pnpm format` fixes) | ✅ |
| Typecheck | `pnpm typecheck` | ✅ |
| Backend tests (Docker must be running for Testcontainers) | `pnpm test` | ✅ |
| One workspace (builds the packages it depends on first) | `pnpm turbo run test --filter=@repo/api` | ✅ |
| Build | `pnpm build` | ✅ |
| Regenerate the OpenAPI document and `packages/api-client` (commit the result; CI fails when they're stale) | `pnpm codegen` | ✅ |
| OpenAPI breaking-change check against `main` (oasdiff in Docker; `CONTRACT_BASE_REF` picks another base) | `pnpm contract:check` | ✅ |
| Regenerate the Prisma client | `pnpm --filter ./apps/api db:generate` (turbo runs it before lint, typecheck, test, build and dev) | ✅ |
| Create a migration without applying it | `pnpm --filter ./apps/api exec prisma migrate dev --create-only --name <verb_noun>` | ✅ |
| Apply migrations (local; also regenerates the client) | `pnpm --filter ./apps/api db:migrate` | ✅ |
| Seed synthetic data (local; needs a database with no clubs) | `pnpm --filter ./apps/api db:seed` (`--clubs 5 --months 12 --seed 1 --today YYYY-MM-DD` are the defaults, with today taken from the current date) | ✅ |
| Mobile dev client | `pnpm --filter ./apps/mobile start` | ✅ Metro only; the development build arrives with TECH-08 |

Keep this table in sync with the root `package.json`.
