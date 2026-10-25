# Product Backlog

> Status: **Draft v0.1** · Owner: Product · Last updated: 2026-10-25
> Ordered by release, then milestone, then priority. Story details and acceptance criteria live in the linked feature specs: **the spec is the source of truth**, and this file is the index. When a story changes in a spec, update its row here in the same PR.

## 1. How to use this backlog

- **IDs** are stable. Use them in ticket titles (`[EVT-08] RSVP in the app`), branch names and PR descriptions.
- **Priority** is MoSCoW within a release. **Size** is the product owner's pre-estimate (S ≈ 1.5, M ≈ 4, L ≈ 8, XL ≈ 15 dev-days). The team re-estimates in refinement.
- **XL items must be split** before entering a sprint ([Working agreements](working-agreements.md#2-definition-of-ready)).
- **Milestones** for R1: α = closed alpha, β = pilot, GA = general availability ([Roadmap § 3](../product/04-scope-and-roadmap.md#3-r1--squad--attendance-mvp)).
- Each story spans backend, web and mobile as listed under *Platforms*. Teams may split a story into per-platform tickets that keep the same ID with a suffix (`EVT-08-api`, `EVT-08-mobile`).

## 2. Technical enablers

| ID | Enabler | Release | Priority | Size | Notes |
|---|---|---|---|---|---|
| TECH-01 | Monorepo (pnpm + Turborepo), TypeScript strict, lint and format, CI (lint, typecheck, backend tests, builds) | R0 | Must | M | ADR-001; root scripts named as in `CLAUDE.md` § Commands. `codegen` and `contract:check` land with TECH-06, the database scripts with TECH-03 |
| TECH-02 | Environments (dev/preview, staging, production), hosting setup, secrets management, deploy pipelines | R0 | Must | M | ADR-011; sets `SHUTDOWN_DRAIN_MS` and `AUTH_TRUSTED_PROXIES` for the host, and the production email provider (ADR-017). Runs the worker (`start:worker`) as its own process, with a shutdown grace period over 30 s |
| TECH-03 | PostgreSQL setup, Prisma schema and migrations workflow, seed data generator (synthetic clubs), ORM spike confirmation | R0 | Must | M | ADR-005, ADR-013 (both accepted after the ORM spike); adds `docker compose`, `db:migrate` and `db:seed`. Creates the core club and event tables; the rest arrive with their stories |
| TECH-04 | Authentication foundation: spike, then Better Auth in the API with sessions, Google and Apple ID-token sign-in and email codes | R0 | Must | L | ADR-007 (accepted after the spike); unblocks AUTH-01–03 |
| TECH-05 | Authorization policy module, tenant-scoped data access, cross-tenant and role test harness | R0 | Must | L | NFR-SEC-02, NFR-SEC-03; adds `prisma.forClub`, the club actor, `@Policies` / `@Can` and `createCast`. Stories add their own actions; `data_access_log` arrives with WELL (R2) and `audit_log` with the CLUB stories |
| TECH-06 | Contracts package → OpenAPI → typed client; problem+json errors; idempotency middleware; app-version headers | R0 | Must | M | [API guidelines](../tech/03-api-guidelines.md) § 1.1–1.3; adds `pnpm codegen` and `pnpm contract:check` (oasdiff). Better Auth's routes stay out of the OpenAPI document. The API reads the app-version headers; TECH-14 answers `426` |
| TECH-07 | pg-boss job queue and scheduler, transactional outbox, idempotent handlers, dead-letter alerts | R0 | Must | M | ADR-006 (accepted after TECH-07); adds `outbox_events`, the worker process (`start:worker`, `dev:worker`), `jobQueue`, `eventQueue`, `@JobHandler` and lag alerts. Alerts are logged until TECH-10 |
| TECH-08 | Mobile shell: Expo Router, auth screens, i18n, club theming, persisted cache, offline mutation queue, Sentry, EAS channels, universal/app links | R0 | Must | L | ADR-002, NFR-OFF-01 |
| TECH-09 | Web shell: Next.js, auth, i18n, design-system base, public SSR pages with OG images, association files | R0 | Must | M | ADR-003 |
| TECH-10 | Observability and analytics baseline: Sentry, structured logs, uptime checks, PostHog with privacy filters | R0 | Must | S | ADR-012, NFR-OBS; sends the worker's `JobAlerts` to Sentry |
| TECH-14 | App config endpoint and forced-update mechanism | R0 | Must | S | Architecture § 6.11 |
| TECH-15 | Design system foundations: tokens and core components for web and mobile | R0 | Must | L | UX § 7; ADR-014/015 (accepted after TECH-15). Adds `packages/ui-tokens` (`theme.css`, `clubTheme()`, `cn`, Archivo) and the core components on both apps. The club header, tab bar and sheets come with the shells (TECH-08, TECH-09) |
| TECH-11 | Media pipeline: presigned uploads, image variants, document scanning | R1 (α) | Must | M | Crests and profile photos in R1; attachments in R3 |
| TECH-13 | Data lifecycle jobs: account and club purge, retention schedules | R1 (β) | Must | M | BR-AUTH-12, BR-CLUB-13; wellness retention added in R2 |
| TECH-12 | Back-office: audited support scripts (R1), admin UI (R2) | R1 (β) → R2 | Should | M | Architecture § 6.14 |
| TECH-16 | Load test: digest and reminder bursts, RSVP peaks | R1 (GA) | Should | S | NFR-SCALE-03 |
| TECH-17 | External security review / penetration test | R1 (GA) | Must | — | NFR-SEC-12 (external vendor) |
| TECH-18 | Video provider integration: direct uploads, webhooks, playback | R2 | Must | M | ADR-009 |
| TECH-20 | Analytics pre-aggregation (only if NFR-PERF-01 is not met) | R2 | Could | M | Data model § 5 |
| TECH-19 | AI platform foundations: SDK wrapper, prompt versioning, usage logging, quotas, eval harness, alias pseudonymization | R3 | Must | L | ADR-010, [AI architecture](../tech/04-ai-architecture.md) |

## 3. R1 — Squad & Attendance (MVP)

62 stories (Must 50 · Should 12).

| ID | Story | Feature | Milestone | Priority | Size | Platforms |
|---|---|---|---|---|---|---|
| AUTH-01 | Sign in with Google | [F01](../features/F01-accounts-and-onboarding.md) | α | Must | M | Mobile, Web |
| AUTH-02 | Sign in with Apple | [F01](../features/F01-accounts-and-onboarding.md) | α | Must | M | Mobile (iOS), Web |
| AUTH-03 | Sign in with an email code | [F01](../features/F01-accounts-and-onboarding.md) | α | Must | M | Mobile, Web |
| AUTH-04 | Accept terms and privacy policy | [F01](../features/F01-accounts-and-onboarding.md) | α | Must | S | Mobile, Web |
| AUTH-05 | Complete my personal profile | [F01](../features/F01-accounts-and-onboarding.md) | α | Must | M | Mobile, Web |
| AUTH-06 | Join my team through an invite link | [F01](../features/F01-accounts-and-onboarding.md) | α | Must | L | Mobile, Web |
| AUTH-08 | Pending approval state | [F01](../features/F01-accounts-and-onboarding.md) | α | Must | S | Mobile, Web |
| AUTH-10 | Set my player details in a club | [F01](../features/F01-accounts-and-onboarding.md) | α | Must | S | Mobile, Web |
| CLUB-01 | Create a club | [F02](../features/F02-clubs-categories-and-membership.md) | α | Must | M | Web, Mobile |
| CLUB-03 | Create categories | [F02](../features/F02-clubs-categories-and-membership.md) | α | Must | M | Web, Mobile |
| CLUB-05 | Create and share invite links | [F02](../features/F02-clubs-categories-and-membership.md) | α | Must | M | Web, Mobile |
| CLUB-06 | Review join requests | [F02](../features/F02-clubs-categories-and-membership.md) | α | Must | M | Web, Mobile |
| CLUB-07 | Add players without an account (managed profiles) | [F02](../features/F02-clubs-categories-and-membership.md) | α | Must | M | Web, Mobile |
| CLUB-08 | Browse the club member directory | [F02](../features/F02-clubs-categories-and-membership.md) | α | Must | M | Web, Mobile |
| CLUB-09 | Assign a member to categories and roles | [F02](../features/F02-clubs-categories-and-membership.md) | α | Must | M | Web, Mobile |
| CLUB-14 | Configure category settings | [F02](../features/F02-clubs-categories-and-membership.md) | α | Must | M | Web, Mobile |
| EVT-01 | Create a practice | [F03](../features/F03-events-and-attendance.md) | α | Must | M | Mobile, Web |
| EVT-02 | Create recurring practices | [F03](../features/F03-events-and-attendance.md) | α | Must | L | Mobile, Web |
| EVT-05 | Create a match | [F03](../features/F03-events-and-attendance.md) | α | Must | M | Mobile, Web |
| EVT-08 | RSVP in the app | [F03](../features/F03-events-and-attendance.md) | α | Must | M | Mobile, Web |
| EVT-11 | See who's going, by position | [F03](../features/F03-events-and-attendance.md) | α | Must | M | Mobile, Web |
| EVT-12 | RSVP on behalf of a player | [F03](../features/F03-events-and-attendance.md) | α | Must | S | Mobile, Web |
| EVT-14 | Automated reminders | [F03](../features/F03-events-and-attendance.md) | α | Must | M | Server |
| EVT-15 | Take attendance (roll call) | [F03](../features/F03-events-and-attendance.md) | α | Must | L | Mobile, Web |
| EVT-17 | My agenda | [F03](../features/F03-events-and-attendance.md) | α | Must | M | Mobile, Web |
| ANL-01 | See my attendance | [F04](../features/F04-attendance-analytics.md) | α | Must | M | Mobile, Web |
| NOTIF-01 | Register devices for push | [F10](../features/F10-notifications.md) | α | Must | M | Mobile, Server |
| NOTIF-02 | Notification delivery pipeline | [F10](../features/F10-notifications.md) | α | Must | L | Server |
| AUTH-09 | Claim my managed profile | [F01](../features/F01-accounts-and-onboarding.md) | β | Must | M | Mobile, Web |
| AUTH-13 | Delete my account | [F01](../features/F01-accounts-and-onboarding.md) | β | Must | M | Mobile, Web |
| CLUB-02 | Edit club profile and settings | [F02](../features/F02-clubs-categories-and-membership.md) | β | Must | S | Web, Mobile |
| CLUB-04 | Edit or archive a category | [F02](../features/F02-clubs-categories-and-membership.md) | β | Must | S | Web, Mobile |
| CLUB-10 | Move a player to another category | [F02](../features/F02-clubs-categories-and-membership.md) | β | Must | M | Web, Mobile |
| CLUB-11 | Remove a member from a category or from the club | [F02](../features/F02-clubs-categories-and-membership.md) | β | Must | S | Web, Mobile |
| CLUB-12 | Manage Club Admins and transfer ownership | [F02](../features/F02-clubs-categories-and-membership.md) | β | Must | S | Web, Mobile |
| EVT-03 | Edit or reschedule an event | [F03](../features/F03-events-and-attendance.md) | β | Must | M | Mobile, Web |
| EVT-04 | Cancel or restore an event | [F03](../features/F03-events-and-attendance.md) | β | Must | S | Mobile, Web |
| EVT-06 | Call up players from other categories | [F03](../features/F03-events-and-attendance.md) | β | Must | S | Mobile, Web |
| EVT-07 | Share the event link | [F03](../features/F03-events-and-attendance.md) | β | Must | M | Mobile, Web |
| EVT-09 | RSVP from a push notification | [F03](../features/F03-events-and-attendance.md) | β | Must | M | Mobile |
| EVT-10 | RSVP from the shared link | [F03](../features/F03-events-and-attendance.md) | β | Must | L | Web, Mobile |
| EVT-13 | Nudge players who haven't answered | [F03](../features/F03-events-and-attendance.md) | β | Must | S | Mobile, Web |
| EVT-16 | Roll-call reminders and missing-attendance list | [F03](../features/F03-events-and-attendance.md) | β | Must | S | Mobile, Web, Server |
| ANL-02 | Category attendance dashboard | [F04](../features/F04-attendance-analytics.md) | β | Must | L | Web, Mobile |
| ANL-03 | Per-player attendance table | [F04](../features/F04-attendance-analytics.md) | β | Must | M | Web, Mobile |
| ANL-04 | Attendance by position line | [F04](../features/F04-attendance-analytics.md) | β | Must | S | Web, Mobile |
| ANL-05 | Attendance by weekday | [F04](../features/F04-attendance-analytics.md) | β | Must | S | Web, Mobile |
| ANL-07 | Player detail (staff view) | [F04](../features/F04-attendance-analytics.md) | β | Must | M | Web, Mobile |
| NOTIF-03 | In-app inbox | [F10](../features/F10-notifications.md) | β | Must | M | Mobile, Web |
| NOTIF-05 | Actionable RSVP notifications | [F10](../features/F10-notifications.md) | β | Must | M | Mobile |
| CLUB-17 | Delete the club | [F02](../features/F02-clubs-categories-and-membership.md) | β | Should | S | Web |
| AUTH-07 | Join with a club code | [F01](../features/F01-accounts-and-onboarding.md) | GA | Should | S | Mobile, Web |
| AUTH-11 | Switch between clubs | [F01](../features/F01-accounts-and-onboarding.md) | GA | Should | M | Mobile, Web |
| AUTH-12 | Sign out and manage sessions | [F01](../features/F01-accounts-and-onboarding.md) | GA | Should | S | Mobile, Web |
| CLUB-13 | Manage venues | [F02](../features/F02-clubs-categories-and-membership.md) | GA | Should | S | Web, Mobile |
| CLUB-15 | Follow an onboarding checklist | [F02](../features/F02-clubs-categories-and-membership.md) | GA | Should | S | Web, Mobile |
| EVT-18 | Weekly agenda and bulk RSVP | [F03](../features/F03-events-and-attendance.md) | GA | Should | M | Mobile, Web |
| ANL-06 | Response behavior | [F04](../features/F04-attendance-analytics.md) | GA | Should | S | Web, Mobile |
| ANL-08 | Team attendance ranking (players) | [F04](../features/F04-attendance-analytics.md) | GA | Should | S | Mobile, Web |
| ANL-09 | Club-wide overview | [F04](../features/F04-attendance-analytics.md) | GA | Should | M | Web |
| NOTIF-04 | Notification preferences | [F10](../features/F10-notifications.md) | GA | Should | S | Mobile, Web |
| NOTIF-06 | Email fallback for critical changes | [F10](../features/F10-notifications.md) | GA | Should | S | Server |

## 4. R2 — Training Hub

32 stories (Must 21 · Should 9 · Could 2).

| ID | Story | Feature | Priority | Size | Platforms |
|---|---|---|---|---|---|
| EXR-01 | Create an exercise | [F05](../features/F05-exercise-library.md) | Must | L | Web, Mobile |
| EXR-02 | Add photos | [F05](../features/F05-exercise-library.md) | Must | M | Web, Mobile |
| EXR-03 | Upload videos | [F05](../features/F05-exercise-library.md) | Must | L | Web, Mobile |
| EXR-04 | Add external video links | [F05](../features/F05-exercise-library.md) | Must | S | Web, Mobile |
| EXR-05 | Search and filter the library | [F05](../features/F05-exercise-library.md) | Must | M | Web, Mobile |
| EXR-06 | View an exercise | [F05](../features/F05-exercise-library.md) | Must | M | Mobile, Web |
| EXR-07 | Edit, duplicate or archive an exercise | [F05](../features/F05-exercise-library.md) | Must | S | Web, Mobile |
| PLAN-01 | Build a practice plan | [F06](../features/F06-session-planning.md) | Must | L | Web, Mobile |
| PLAN-02 | Customize items in the plan | [F06](../features/F06-session-planning.md) | Must | M | Web, Mobile |
| PLAN-03 | Check the session timing | [F06](../features/F06-session-planning.md) | Must | S | Web, Mobile |
| PLAN-04 | Publish the plan to players | [F06](../features/F06-session-planning.md) | Must | S | Web, Mobile |
| PLAN-05 | See the practice plan (player) | [F06](../features/F06-session-planning.md) | Must | M | Mobile, Web |
| WELL-01 | Give consent for wellness check-ins | [F07](../features/F07-player-wellness.md) | Must | M | Mobile, Web |
| WELL-02 | Guardian consent for minors | [F07](../features/F07-player-wellness.md) | Must | M | Mobile, Web, Email |
| WELL-03 | Configure the check-in schedule | [F07](../features/F07-player-wellness.md) | Must | S | Web, Mobile |
| WELL-04 | Check-in reminders | [F07](../features/F07-player-wellness.md) | Must | S | Mobile, Server |
| WELL-05 | Submit a check-in | [F07](../features/F07-player-wellness.md) | Must | M | Mobile, Web |
| WELL-06 | Correct today's check-in | [F07](../features/F07-player-wellness.md) | Must | S | Mobile, Web |
| WELL-08 | Squad wellness board | [F07](../features/F07-player-wellness.md) | Must | L | Web, Mobile |
| WELL-09 | Individual wellness history (staff) | [F07](../features/F07-player-wellness.md) | Must | M | Web, Mobile |
| WELL-12 | Revoke consent or delete my wellness data | [F07](../features/F07-player-wellness.md) | Must | S | Mobile, Web |
| EVT-19 | Subscribe to my calendar | [F03](../features/F03-events-and-attendance.md) | Should | M | Mobile, Web, Server |
| EXR-08 | Browse and copy from the starter library | [F05](../features/F05-exercise-library.md) | Should | L | Web, Mobile |
| EXR-09 | Quick capture from the field | [F05](../features/F05-exercise-library.md) | Should | M | Mobile |
| PLAN-06 | Save and use templates | [F06](../features/F06-session-planning.md) | Should | M | Web, Mobile |
| PLAN-07 | Copy a plan from a past practice | [F06](../features/F06-session-planning.md) | Should | S | Web, Mobile |
| PLAN-08 | Add ad-hoc items | [F06](../features/F06-session-planning.md) | Should | S | Web, Mobile |
| WELL-07 | See my wellness history | [F07](../features/F07-player-wellness.md) | Should | S | Mobile, Web |
| WELL-10 | Wellness flags in squad availability | [F07](../features/F07-player-wellness.md) | Should | S | Mobile, Web |
| WELL-11 | Critical alerts to staff | [F07](../features/F07-player-wellness.md) | Should | S | Mobile, Server |
| CLUB-16 | Import players in bulk | [F02](../features/F02-clubs-categories-and-membership.md) | Could | M | Web |
| EVT-20 | Record a past event (backfill) | [F03](../features/F03-events-and-attendance.md) | Could | S | Web, Mobile |

## 5. R3 — Coach Pro

32 stories (Must 14 · Should 6 · Could 12). AI-01 is XL and must be split (form and context → generation and validation → draft UI) before it enters a sprint.

| ID | Story | Feature | Priority | Size | Platforms |
|---|---|---|---|---|---|
| CONT-01 | Create a structured routine | [F08](../features/F08-routines-and-nutrition.md) | Must | M | Web, Mobile |
| CONT-02 | Upload a routine or nutrition file | [F08](../features/F08-routines-and-nutrition.md) | Must | S | Web, Mobile |
| CONT-03 | Assign a routine | [F08](../features/F08-routines-and-nutrition.md) | Must | M | Web, Mobile |
| CONT-04 | See my routines | [F08](../features/F08-routines-and-nutrition.md) | Must | M | Mobile, Web |
| CONT-07 | Create a nutrition plan | [F08](../features/F08-routines-and-nutrition.md) | Must | S | Web, Mobile |
| CONT-08 | Assign a nutrition plan | [F08](../features/F08-routines-and-nutrition.md) | Must | S | Web, Mobile |
| CONT-09 | See my nutrition plans | [F08](../features/F08-routines-and-nutrition.md) | Must | S | Mobile, Web |
| AI-01 | Generate a practice plan | [F09](../features/F09-ai-coaching-assistant.md) | Must | XL | Web, Mobile |
| AI-02 | Refine a generated plan | [F09](../features/F09-ai-coaching-assistant.md) | Must | M | Web, Mobile |
| AI-03 | Save the plan and suggested exercises | [F09](../features/F09-ai-coaching-assistant.md) | Must | S | Web, Mobile |
| AI-04 | Chat with the assistant | [F09](../features/F09-ai-coaching-assistant.md) | Must | L | Web, Mobile |
| AI-06 | Give feedback on AI output | [F09](../features/F09-ai-coaching-assistant.md) | Must | S | Web, Mobile |
| AI-08 | Quotas and usage visibility | [F09](../features/F09-ai-coaching-assistant.md) | Must | M | Web, Server |
| AI-09 | Enable or disable AI for the club | [F09](../features/F09-ai-coaching-assistant.md) | Must | S | Web |
| EVT-21 | Squad selection for a match (*convocatoria*) | [F03](../features/F03-events-and-attendance.md) | Should | L | Mobile, Web |
| ANL-10 | Export attendance | [F04](../features/F04-attendance-analytics.md) | Should | S | Web |
| CONT-05 | Log a routine session | [F08](../features/F08-routines-and-nutrition.md) | Should | M | Mobile |
| CONT-10 | Duplicate content | [F08](../features/F08-routines-and-nutrition.md) | Should | S | Web, Mobile |
| AI-05 | Conversation history | [F09](../features/F09-ai-coaching-assistant.md) | Should | S | Web, Mobile |
| AI-07 | Suggested prompts | [F09](../features/F09-ai-coaching-assistant.md) | Should | S | Web, Mobile |
| AUTH-14 | Choose my language | [F01](../features/F01-accounts-and-onboarding.md) | Could | S | Mobile, Web |
| ANL-11 | Wellness and attendance insights | [F04](../features/F04-attendance-analytics.md) | Could | M | Web |
| EXR-10 | Favorites | [F05](../features/F05-exercise-library.md) | Could | S | Web, Mobile |
| EXR-11 | AI-suggested metadata | [F05](../features/F05-exercise-library.md) | Could | S | Web, Mobile |
| PLAN-09 | Field mode | [F06](../features/F06-session-planning.md) | Could | M | Mobile |
| PLAN-10 | Export the plan to PDF | [F06](../features/F06-session-planning.md) | Could | S | Web |
| PLAN-11 | Apply a template to several practices | [F06](../features/F06-session-planning.md) | Could | M | Web |
| PLAN-12 | Set the planned session intensity | [F06](../features/F06-session-planning.md) | Could | S | Web, Mobile |
| WELL-13 | Request an extra check-in | [F07](../features/F07-player-wellness.md) | Could | S | Mobile, Web |
| WELL-14 | Additional wellness items | [F07](../features/F07-player-wellness.md) | Could | M | Mobile, Web |
| CONT-06 | Routine adherence (staff) | [F08](../features/F08-routines-and-nutrition.md) | Could | M | Web, Mobile |
| NOTIF-07 | Category announcements | [F10](../features/F10-notifications.md) | Could | M | Mobile, Web |

## 6. Later

See the parking lot in [Roadmap § 8](../product/04-scope-and-roadmap.md#8-later-parking-lot).
