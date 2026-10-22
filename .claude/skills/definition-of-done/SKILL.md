---
name: definition-of-done
description: Check the current change against the project's Definition of Done before calling it finished or opening a PR - runs lint, typecheck, tests and the contract check, scans the diff for privacy, tenancy, i18n and generated-code violations, and drafts the PR description. Use when work on a story is complete, before a commit or PR, or when asked "is this done?".
argument-hint: "[story ID]"
---

# Definition of Done check

Source: `docs/delivery/working-agreements.md` § 3 and § 4.

## 1. Scope the change

- `git status` and `git diff main...HEAD` plus uncommitted changes. Identify the story ID (argument, branch name or ask).
- Read the story's acceptance criteria in its feature spec.

## 2. Run the checks

Run lint, typecheck, backend tests, builds and the OpenAPI breaking-change check for the affected workspaces, using the commands in the root `CLAUDE.md` (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm contract:check`). If there is no root `package.json` yet, report that the checks couldn't run. Never claim they passed.

Report failures with their output. Don't mark anything done while a check fails.

## 3. Scan the diff

| Check | Look for |
|---|---|
| Backend tests | New or changed behavior in `apps/api` or `packages/domain` without tests; missing cross-tenant (404) or role-negative tests for new endpoints |
| No frontend tests | New `*.test.tsx` / `*.spec.tsx` files in `apps/web` or `apps/mobile` → remove |
| Tenancy | Prisma queries on tenant tables without the club context; Prisma used outside repositories |
| Authorization | New handlers without a declared action; permissions enforced only in the client |
| Privacy | Logging, Sentry, PostHog or push payloads that include bodies, reasons, notes, wellness fields, tokens or free text; personal data on public pages or OG images |
| Contracts | Removed or renamed response fields, new required request fields, narrowed types in `packages/contracts` |
| Generated code | Hand edits in `packages/api-client` generated output or the OpenAPI document |
| i18n | Hard-coded user-facing strings in `.tsx` files or notification code; new error codes without `errors.<CODE>` copy; non-*voseo* Spanish |
| UI | Hard-coded colors or sizes instead of tokens; status shown by color alone; missing accessibility labels; `ScrollView` + `map` for long lists; `ui-design` refuse-list patterns. For web changes, run the `web-design-guidelines` and `accessibility` skills on the changed files |
| Code hygiene | `any`, `@ts-ignore`, `console.log`, commented-out code, narrating comments, comments in React code |
| Migrations | Breaking schema change without expand/contract; edits to merged migrations |
| Docs | Behavior that differs from the spec without a spec update; backlog row not updated when the story changed |
| Flags | Pilot-only behavior not behind a feature flag |
| Approvals | Changes to policy, health-data access or AI data exposure → note "2 approvals required" |

## 4. Report

A table with one row per DoD item: ✅ met, ❌ not met (with file:line and the fix), or n/a. Then a table of acceptance criteria → evidence. Fix ❌ items you can fix safely; list the rest.

## 5. Draft the PR description

```markdown
## <STORY-ID> · <title>

Spec: docs/features/<file>.md#<anchor>

### What
### Why
### How to test
### Screenshots (UI changes)
### Notes
- Docs updated: …
- Requires 2 approvals (policy / health data / AI data): yes|no
```

Don't commit, push or open the PR unless asked.
