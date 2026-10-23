# Football Club Management

Mobile app (Expo), web app (Next.js) and API (NestJS) for amateur and semi-professional football clubs in Uruguay and Argentina. The specs live in `docs/`; start with `docs/README.md`.

**Status:** R0 in progress. The workspace, shared config and CI exist (TECH-01). Next: the apps, then the spikes in `docs/tech/00-tech-stack.md` § 8.

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
| Local Postgres | `docker compose up -d postgres` | TECH-03 |
| Run everything in dev | `pnpm dev` | ✅ |
| Lint and format check | `pnpm lint` · `pnpm format:check` (`pnpm format` fixes) | ✅ |
| Typecheck | `pnpm typecheck` | ✅ |
| Backend tests (Docker must be running for Testcontainers) | `pnpm test` | ✅ |
| One workspace | `pnpm --filter ./apps/api test` | ✅ |
| Build | `pnpm build` | ✅ |
| Regenerate the OpenAPI document and `packages/api-client` | `pnpm codegen` | TECH-06 |
| OpenAPI breaking-change check against `main` | `pnpm contract:check` | TECH-06 |
| Create a migration without applying it | `pnpm --filter ./apps/api exec prisma migrate dev --create-only --name <verb_noun>` | TECH-03 |
| Apply migrations and seed (local) | `pnpm --filter ./apps/api db:migrate` · `pnpm --filter ./apps/api db:seed` | TECH-03 |
| Mobile dev client | `pnpm --filter ./apps/mobile start` | TECH-01 (`apps/mobile`) |

Keep this table in sync with the root `package.json`.
