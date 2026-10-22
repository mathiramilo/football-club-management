---
name: implement-story
description: Plan and implement a backlog story end to end (contracts, domain, database, API, jobs, web, mobile) from its spec in docs/. Use when asked to build, implement, start or pick up a story or ticket by ID (AUTH-, CLUB-, EVT-, ANL-, EXR-, PLAN-, WELL-, CONT-, AI-, NOTIF-, TECH-), including per-platform slices like EVT-08-api or EVT-08-mobile.
argument-hint: <STORY-ID>[-api|-web|-mobile]
---

# Implement a story

Story: **$ARGUMENTS**

## 1. Gather the spec

1. Find the story: `grep -rn "### <ID> " docs/features/`. `TECH-*` enablers are in `docs/delivery/backlog.md` § 2.
2. Read the story, its acceptance criteria and the **whole feature section** around it. Business rules usually sit above the stories.
3. Collect every business rule (`BR-*`) the story references or depends on. Follow references into other specs and into `docs/product/02-personas-and-roles.md` § 5.
4. For each action, find its row in the permission matrix (roles doc § 4). Note 🔸 conditional cells.
5. Find the entities in `docs/tech/02-data-model.md` and the endpoints in `docs/tech/03-api-guidelines.md` § 3.
6. Find the notifications (`N-xx` in F10), NFRs and telemetry events the story mentions.
7. Read the backlog row for release, milestone and dependencies. Check `docs/product/05-open-questions.md` for open questions that affect it and their defaults.

## 2. Check readiness

Stop and ask the user before writing code if any of these holds (Definition of Ready):
- acceptance criteria are missing or not testable;
- a rule the story depends on is missing, or an open question is unanswered with no default;
- the permission matrix doesn't cover an action;
- two docs contradict each other on this story;
- the story depends on a story that isn't built yet;
- the story is XL (it must be split first).

Missing Spanish copy is not a blocker: propose it and label it as a proposal.

## 3. Plan

Write a short plan by layer. Implement in this order:

1. **Contracts** (`packages/contracts`): schemas, enums, error codes.
2. **Domain** (`packages/domain`): pure rules with unit tests.
3. **Database**: migration (`prisma-migration` skill).
4. **API**: repository → service → policy → controller → serializer (`api-endpoint` and `authorization-policy` skills).
5. **Jobs and notifications** (`background-job` and `notification` skills).
6. **Backend tests**: integration, authorization and cross-tenant (`backend-testing` rule).
7. **Regenerate** the OpenAPI document and `packages/api-client`.
8. **Clients**: web (`web-page` skill) and mobile (`mobile-screen` and `offline-mutation` skills).
9. **Copy** (es) in `packages/i18n`.
10. **Telemetry** events from the spec.
11. **Docs**: update the spec and backlog row if behavior differs from the spec.

Map every acceptance criterion to the test or screen that proves it. For stories of size M or larger, show the plan and wait for confirmation before writing code.

For a platform slice (`-api`, `-web`, `-mobile`), do only that layer. An `-api` slice still starts with contracts; a client slice assumes the contract and client already exist and stops if they don't.

## 4. Implement

- Branch name: `feat/<ID>-<short-slug>` (or `fix/…`, `chore/…`). Don't create it, commit or push unless asked.
- Follow the rules in `.claude/rules/`; they load by path as you touch files.
- Keep the PR under about 400 changed lines excluding generated code. If the plan is bigger, propose a split by layer or platform.

## 5. Finish

Run the `definition-of-done` skill, then report:
- a table of acceptance criteria → evidence (test name, screen, or "verified manually");
- docs you updated, and deviations from the spec with the reason;
- open questions or doc contradictions you found.
