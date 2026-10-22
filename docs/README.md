# Football Club Management — Documentation

> Working name (final name pending, see OQ-03). Mobile app (iOS/Android) + web app + server for amateur and semi-professional football clubs.
> Status: **v0.1 — initial review and refinement** · Owner: Product · Last updated: 2026-10-22

**Let coaches coach, and let players focus on playing.** The product covers:
- attendance and RSVP for practices and matches,
- attendance analytics,
- player wellness check-ins,
- an exercise library and session planning,
- routines and nutrition plans,
- an AI coaching assistant,

all organized by club and category.

## Start here

1. [Initial product review](product/00-initial-review.md): what was reviewed, the findings, the decisions made, and the next steps.
2. [Open questions](product/05-open-questions.md): decisions needed from stakeholders, each with a recommended default.
3. [Scope & roadmap](product/04-scope-and-roadmap.md): releases R0–R3, milestones and the pilot plan.

## Map

```text
docs/
├── README.md                         ← you are here
├── product/
│   ├── 00-initial-review.md          Review findings, decisions, risks, traceability to the brief
│   ├── 01-vision-and-strategy.md     Problem, vision, market, principles, metrics, competition, business model
│   ├── 02-personas-and-roles.md      Personas, role model, permission matrix
│   ├── 03-glossary.md                Ubiquitous language (EN code terms ↔ ES UI terms), labels
│   ├── 04-scope-and-roadmap.md       Releases, milestones, estimates, dependencies, pilot, parking lot
│   ├── 05-open-questions.md          Decisions needed (with defaults), decision log, naming shortlist
│   └── 06-privacy-and-compliance.md  Health data, minors, AI processing, retention, legal deliverables
├── features/                         One spec per feature: goal, scope, business rules, stories + acceptance criteria
│   ├── F01-accounts-and-onboarding.md
│   ├── F02-clubs-categories-and-membership.md
│   ├── F03-events-and-attendance.md
│   ├── F04-attendance-analytics.md
│   ├── F05-exercise-library.md
│   ├── F06-session-planning.md
│   ├── F07-player-wellness.md
│   ├── F08-routines-and-nutrition.md
│   ├── F09-ai-coaching-assistant.md
│   └── F10-notifications.md
├── ux/
│   └── 01-information-architecture-and-flows.md   Navigation, screen inventory, key flows, voice & tone
├── tech/
│   ├── 00-tech-stack.md              Chosen stack per app (mobile, web, backend), shared packages, tooling, R0 spikes
│   ├── 01-architecture-overview.md   System context, components, modules, cross-cutting concerns, environments
│   ├── 02-data-model.md              Entities, invariants, ERD
│   ├── 03-api-guidelines.md          API conventions and endpoint inventory
│   ├── 04-ai-architecture.md         AI pipeline, tools, privacy, evaluation, cost model
│   ├── 05-non-functional-requirements.md  Performance, security, offline, accessibility, observability…
│   └── adr-log.md                    Architecture decisions (proposed/open)
└── delivery/
    ├── backlog.md                    All stories + technical enablers, by release and priority
    └── working-agreements.md         Definition of Ready/Done, git & PR rules, story template, bug severity
```

## Reading paths

| If you are… | Read |
|---|---|
| A stakeholder or founder | Initial review → Vision → Open questions → Roadmap |
| A designer | Personas & roles → Glossary → UX → feature specs F01–F03 and F10 |
| An engineer | Tech stack → Glossary → Architecture → Data model → API guidelines → NFRs → the feature spec of your story |
| QA | Feature specs (acceptance criteria, edge cases) → Roles (permission matrix) → NFRs |

## Conventions

| Item | Convention |
|---|---|
| Releases | **R0** Foundations · **R1** Squad & Attendance (MVP) · **R2** Training Hub · **R3** Coach Pro · **Later** |
| Priority | MoSCoW (Must / Should / Could) within a release |
| Size | S ≈ 1.5 · M ≈ 4 · L ≈ 8 · XL ≈ 15 dev-days (product-owner estimates before team estimation) |
| Story IDs | `AUTH-`, `CLUB-`, `EVT-`, `ANL-`, `EXR-`, `PLAN-`, `WELL-`, `CONT-`, `AI-`, `NOTIF-`, `TECH-` |
| Business rules | `BR-<AREA>-NN` (e.g. `BR-EVT-09`), defined in the feature specs and the roles doc |
| Notifications | `N-01`–`N-22`, catalogued in [F10](features/F10-notifications.md) |
| Non-functional | `NFR-<AREA>-NN`, in [NFRs](tech/05-non-functional-requirements.md) |
| Open questions | `OQ-NN`, in [Open questions](product/05-open-questions.md) |
| Decisions | Product decisions in Open questions § 3; technical decisions in the [ADR log](tech/adr-log.md) |
| Language | Docs in English. UI copy in Spanish (Río de la Plata variant) per the [Glossary](product/03-glossary.md). |

## Source

Derived from the Notion pages "Football Club Management System — Project Overview" and "Features". Where this documentation differs from Notion, **this documentation is the source of truth**; the differences and their reasons are listed in the [Initial review](product/00-initial-review.md).
