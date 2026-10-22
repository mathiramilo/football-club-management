# Initial Product Review & Refinement

> Status: **v0.1** · Author: Product Owner · Date: 2026-10-22
> Input reviewed: the Notion pages "Football Club Management System — Project Overview" and "Features" (Spanish feature list).
> Output: the refined documentation set in [`docs/`](../README.md).

## 1. Executive summary

The concept is **strong and well-targeted**. The pain is real, frequent and weekly: chasing attendance in WhatsApp, planning without data, invisible player load. The feature set forms a coherent loop: attendance → wellness → planning → AI with context. Very few tools serve amateur clubs in Spanish with a football-native workflow.

The brief, however, is a **feature list**, not yet a buildable product definition. Implementation would stall or go wrong on six points:

1. **There is no way into the product.** Club creation, invitations, onboarding and accounts are not defined.
2. **The role model doesn't match reality.** Locally, "DT" is a team's head coach, not a club director. People also hold different roles in different categories.
3. **RSVP is not attendance.** Without a roll call, the "attendance %" metrics would measure intentions, not reality.
4. **Wellness is health data, and *Sub-20* means minors.** That brings consent, access-control and retention obligations the brief doesn't consider.
5. **Partial adoption is the norm.** Some players will never install the app, and the product must still work for the coach.
6. **AI depends on content that won't exist on day one.** An empty exercise library makes AI planning useless.

This review resolves each of these in the specs. It defines **126 user stories and 20 technical enablers** across three releases, and lists **23 open questions** with recommended defaults:
- **R1, Squad & Attendance (MVP)**: the WhatsApp-replacement loop.
- **R2, Training Hub**: exercise library, session planning, wellness.
- **R3, Coach Pro**: AI assistant, routines and nutrition.

**Top recommendations**
1. Confirm the role model (OQ-01) and the launch market (OQ-02) this week. Most specs depend on them.
2. Build R1 around **two-tap RSVP**, **shareable WhatsApp links**, **managed profiles** and **pre-filled roll call**.
3. Treat wellness as **health data** from day one: explicit consent, guardian consent for minors, least-privilege access, access logging, a 24-month retention period.
4. Ship AI **after** the library and planning exist (R3), on top of a **starter library** that is commissioned now (OQ-13).
5. Run a **3–5 club pilot** with explicit success metrics before general availability.

## 2. Strengths of the concept

| Strength | Why it matters |
|---|---|
| A real, high-frequency problem | Attendance happens 2–4 times a week, so there is a natural habit loop. |
| Connected loop instead of isolated tools | Attendance + wellness + content + AI creates compounding value and switching costs. |
| Multi-category design from the start | It matches how clubs actually work; competitors often model one team at a time. |
| Role-appropriate views | The right mental model for players vs. staff vs. coordinators. |
| A player-preparation angle ("review exercises before practice") | A differentiated value proposition: field time is the scarcest resource. |
| AI grounded in the club's own exercises | A real differentiator vs. generic chatbots, if the grounding is done right. |

## 3. Findings

Severity: **High** blocks MVP viability or creates legal risk · **Medium** causes rework or poor adoption if unresolved · **Low** is a quality or completeness gap.

| ID | Area | Finding | Severity | Resolution |
|---|---|---|---|---|
| R-01 | Onboarding | No club creation, invitation, join or account flow is defined. How do 25 players get into a category? | High | [F01](../features/F01-accounts-and-onboarding.md), [F02](../features/F02-clubs-categories-and-membership.md): invite links and codes, approvals, onboarding checklist |
| R-02 | Roles | "DT" carries club-wide powers in the brief, but locally it means a team's head coach. Roles are modelled as global, while people hold different roles per category or club. | High | [Roles](02-personas-and-roles.md): Club Admin + per-category DT/Coach + `is_player`; OQ-01 |
| R-03 | Attendance | Confirmation (RSVP) is used as attendance. With no roll call, the metrics are unreliable. | High | Roll call (EVT-15), metric definitions ([F04 § 3](../features/F04-attendance-analytics.md#3-metric-definitions)) |
| R-04 | Privacy | Wellness (pain, load) is health data, and *Sub-20* includes minors. No consent, access, retention or guardian handling is defined. | High | [F07](../features/F07-player-wellness.md), [Privacy](06-privacy-and-compliance.md) |
| R-05 | Adoption | No fallback for players who don't install the app, so the coach can't rely on the product. | High | Managed profiles (CLUB-07), proxy RSVP (EVT-12), web RSVP from links (EVT-10), copyable pending lists (EVT-13) |
| R-06 | AI | AI planning depends on a populated, structured library that won't exist at launch. | High | Structured taxonomy ([F05 § 3](../features/F05-exercise-library.md#3-exercise-model-and-taxonomy)), starter library (EXR-08, OQ-13), AI in R3 |
| R-07 | Events | No recurring events. Creating every practice by hand kills adoption. | Medium | EVT-02 |
| R-08 | Matches | Match data is missing (opponent, call time, home/away). Squad selection (*convocatoria*) is conflated with RSVP. | Medium | EVT-05; EVT-21 (R3) |
| R-09 | Links | The "send a link" flow has no identity model. In-app browsers can block Google sign-in. | Medium | EVT-10, AUTH-01/03, NFR-COMP-04, OQ-07 |
| R-10 | Notifications | Timing, frequency, quiet hours, channels and fatigue are undefined. | Medium | [F10](../features/F10-notifications.md): catalog N-01–N-22, caps, digests, quiet hours |
| R-11 | Metrics | "Por día" is ambiguous. Denominators, excused absences, call-ups and minimum sample sizes are undefined. | Medium | [F04 § 3](../features/F04-attendance-analytics.md#3-metric-definitions) |
| R-12 | Positions | "By position" needs a position model, and formats (F11/F7/futsal) change it. | Medium | [Glossary § 3](03-glossary.md#3-positions), AUTH-10, BR-EVT-23–25 |
| R-13 | Analytics | The overview promises "Performance analytics", but only attendance is specified. | Medium | Renamed to Attendance Analytics; performance → OQ-16 |
| R-14 | Wellness | Survey design is open: scale direction and labels, pain detail, flag logic, weekly vs. pre-session frequency, players in several categories. | Medium | [F07 § 3–4](../features/F07-player-wellness.md#3-check-in-content-r2), OQ-10 |
| R-15 | Media | Video storage and streaming costs, upload limits and copyright are not considered. | Medium | BR-EXR-05, ADR-009, OQ-12, OQ-13 |
| R-16 | Categories | It is undefined what happens to future events and history when players move between categories. | Medium | BR-CLUB-05/06, BR-ROLE-10 |
| R-17 | Business | No business model, pricing or success metrics. AI has per-use costs. | Medium | [Vision § 7, § 9](01-vision-and-strategy.md#7-success-metrics), [AI cost model](../tech/04-ai-architecture.md#9-cost-model), OQ-04 |
| R-18 | Planning | "Players review exercises in advance" conflicts with coaches who don't want to reveal plans early. | Medium | Publish control (BR-PLAN-05) |
| R-19 | Content | Routines and nutrition: team vs. individual, files vs. structured, sensitivity, professional responsibility. | Medium | [F08](../features/F08-routines-and-nutrition.md) |
| R-20 | AI | No guardrails: medical advice, data exposure, write access, cost control, evaluation. | Medium | [F09](../features/F09-ai-coaching-assistant.md), [AI architecture](../tech/04-ai-architecture.md) |
| R-21 | Accounts | People in several clubs are not considered. | Low | BR-ROLE-01, AUTH-11 |
| R-22 | Time | Time zones, daylight saving and quiet hours are not considered. | Low | BR-EVT-26, BR-NOTIF-01 |
| R-23 | Stores | App Store and Play requirements (in-app account deletion, Apple sign-in, privacy labels). | Low | AUTH-13, AUTH-02, [Privacy § 10](06-privacy-and-compliance.md#10-app-store-and-platform-requirements) |
| R-24 | Field reality | Poor connectivity at fields, low-end Android phones, prepaid data plans. | Low | NFR-OFF-01–03, NFR-DATA, NFR-PERF-03 |
| R-25 | Privacy | Absence reasons ("injury") would be visible to teammates. | Low | BR-EVT-12 |
| R-26 | Language | Terminology and product name are undefined. | Low | [Glossary](03-glossary.md), OQ-03 |
| R-27 | Scope | Team communication is not addressed, which risks building a chat that competes with WhatsApp. | Low | Explicit non-goal; one-way announcements as NOTIF-07 (Could) |

## 4. Key refinement decisions

These are **proposed**; they become final when the related open question is closed.

| # | Decision | Where |
|---|---|---|
| D-01 | Two-level roles: Owner / Club Admin (club) + DT / Coach / Player (category); `is_player` flag for player-coaches. | [Roles](02-personas-and-roles.md) |
| D-02 | Accounts are required to RSVP. Managed profiles and proxy RSVP cover players without the app. | F01, F02, F03, OQ-07 |
| D-03 | RSVP and attendance are separate concepts. Roll call is pre-filled from RSVPs; events without roll call are excluded from attendance rates. | F03, F04 |
| D-04 | RSVP needs a reason for "No voy", has a deadline and late-change alerts, and an optional lock. | F03 |
| D-05 | Weekly recurring practices; a weekly agenda with bulk RSVP; one weekly ritual combined with the wellness check-in. | F03, F07 |
| D-06 | A notification catalog with defaults, quiet hours, daily caps, relevance re-checks and actionable pushes. | F10 |
| D-07 | Wellness: labelled 1–5 load (higher is worse), structured pain reports, explainable flags, explicit and guardian consent, staff-only access with logging, 24-month retention. | F07, Privacy |
| D-08 | Structured exercise taxonomy plus a starter library; video uploads with strict limits through a managed provider. | F05 |
| D-09 | Session plans with blocks, overrides, templates and controlled publishing. | F06 |
| D-10 | AI produces drafts only; it is grounded in the club library; player identities are pseudonymized; quotas and an evaluation gate apply; it ships in R3. | F09, AI architecture |
| D-11 | Tech: TypeScript monorepo. Expo mobile app, Next.js web app, NestJS modular-monolith API, PostgreSQL with Prisma, pg-boss jobs + outbox, REST + OpenAPI with a generated client, São Paulo hosting. All proposed. | [Tech stack](../tech/00-tech-stack.md), [Architecture](../tech/01-architecture-overview.md), [ADR log](../tech/adr-log.md) |
| D-12 | Releases: R1 Squad & Attendance → R2 Training Hub → R3 Coach Pro, with α / β (pilot) / GA milestones in R1. | [Roadmap](04-scope-and-roadmap.md) |

## 5. Scope changes vs. the brief

| Change | Items |
|---|---|
| **Added** (needed but not in the brief) | Accounts and sign-in; club creation; Club Admin role; invite links, codes and approvals; managed profiles and claim links; proxy RSVP; recurring events; match details; RSVP deadlines, reasons and late changes; roll call; weekly agenda; notification rules and inbox; health-data consent and guardian consent; starter library; plan templates and publishing; AI quotas, guardrails and evaluation; account and club deletion; data retention. |
| **Clarified** | Roles and permissions; metric formulas; wellness content and flags; exercise taxonomy; category formats and gender; position model. |
| **Deferred** | Squad selection (R3); routines and nutrition (R3); match results and seasons (Later); extra wellness items (R3); English UI (R3); match stats and "performance" (Later); payments (Later); WhatsApp Business messages (Later). |
| **Out of scope** | Team chat; league and fixture management; GPS and wearables; medical records; youth under 16; public exercise marketplace. |

## 6. Top risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Players don't adopt the app | Medium | High | Web RSVP from links, two-tap push RSVP, managed profiles, proxy RSVP, weekly ritual, pilot measurement (A1) |
| Coaches don't take roll call | Medium | High | Pre-filled roll call, reminders (N-08), a data-quality banner, staff-home nudges (A2) |
| Health-data or minors compliance issue | Low–Medium | Very high | Consent design, minimization, access logs, legal review before R2 ([Privacy](06-privacy-and-compliance.md)) |
| Notification fatigue → mutes and uninstalls | Medium | High | Daily caps, digests, relevance checks, preferences, guardrail metrics |
| MVP too large; slow time to pilot | High | Medium | α / β / GA milestones and scope levers ([Roadmap § 3](04-scope-and-roadmap.md#3-r1--squad--attendance-mvp)) |
| AI quality or cost disappoints | Medium | Medium | R3 timing after content exists; eval gate; quotas; cost tracking per club |
| Empty library (cold start) | High | Medium | Commission the starter library now (OQ-13); quick capture; templates |
| Free alternatives / low willingness to pay | Medium | High | Football-native differentiation; pilot willingness-to-pay interviews; low price point; club-level pricing |
| App Store review delays or rejections | Medium | Medium | Early TestFlight; compliance checklist (account deletion, sign-in, privacy labels) |

## 7. Recommended next steps (next 2–4 weeks)

1. **Decide the blocking open questions**: OQ-01, 02, 05, 06, 07, 08, 15, 18 ([Open questions § 1](05-open-questions.md#1-blocking-for-r0--r1-answer-first)).
2. **Recruit 3–5 pilot clubs** and run discovery interviews to validate personas and assumptions A1–A3 ([Vision § 10](01-vision-and-strategy.md#10-key-assumptions-and-risks)).
3. **Design sprint**: prototype Flows A–E and test them with ≥ 5 players and 3 DTs ([UX § 5](../ux/01-information-architecture-and-flows.md#5-key-flows)).
4. **Start R0**: TECH-01–10, 14, 15; confirm ADRs; the authentication spike.
5. **Engage legal counsel**: terms, privacy policy, controller/processor model, minors and health-data consent.
6. **Commission the starter library** (≥ 60 exercises). It has the longest lead time.
7. **Naming**: domain, store and trademark checks for the shortlist (OQ-03).
8. **Set up the tracker** (Linear, Jira or GitHub Projects) with the backlog IDs.

## 8. Traceability: Notion brief → specs

| Notion requirement (summarized) | Covered by |
|---|---|
| Staff create a practice or match and send a link to confirm attendance | EVT-01, EVT-02, EVT-05, EVT-07, EVT-08, EVT-10 |
| Everyone sees who is signed up, by position, plus metrics such as attendance % | EVT-11, ANL-01, ANL-03, ANL-08 |
| Automated notifications to confirm attendance | EVT-14, EVT-13, F10 (N-01–N-04) |
| Everyone sees metrics on practices and matches | ANL-01, ANL-02, ANL-08 |
| Attendance % by day, by position and per player | ANL-05, ANL-04, ANL-03, ANL-07 |
| Chatbot for questions and planning advice | AI-04, AI-05, AI-07 |
| AI plans practices from uploaded exercises | AI-01, AI-02, AI-03 |
| Upload exercises (name, description, videos, photos, notes) | EXR-01, EXR-02, EXR-03, EXR-04 |
| Choose which exercises go into each practice | PLAN-01, PLAN-02, PLAN-03 |
| Players view exercise information | EXR-06, PLAN-05 |
| Create and upload routines and nutrition plans | CONT-01, CONT-02, CONT-07 |
| Players access routines and nutrition plans | CONT-04, CONT-09 |
| Players report physical state (load 1–5, pain) | WELL-05 |
| Configurable weekly notifications for the survey | WELL-03, WELL-04 |
| Staff see current state, as a summary and per player | WELL-08, WELL-09 |
| A club has several categories | CLUB-03 |
| A person belongs to several categories | CLUB-09, BR-ROLE-02 |
| An activity can target one or more categories | EVT-01, BR-EVT-01 |
| DTs assign players to categories dynamically | CLUB-09, CLUB-10 |
| Roles table (Player / Coach / DT capabilities) | [Permission matrix](02-personas-and-roles.md#4-permission-matrix) |
