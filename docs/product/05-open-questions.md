# Open Questions & Decisions Needed

> Status: **Living document** · Owner: Product · Last updated: 2026-10-22
> Every question has a **recommended default**, and the specs are written assuming that default. When a question is decided, record the answer and the date, update the affected specs, and move the row to § 3.

## 1. Blocking for R0 / R1 (answer first)

| ID | Question | Why it matters | Options | **Recommended default** | Needed by |
|---|---|---|---|---|---|
| OQ-01 | **Role model.** Is "DT" the head coach of a category (with a separate Club Admin role for club-wide management), or a club-wide technical director as the Notion overview suggests? | Drives permissions, onboarding and data model | (a) DT per category + Club Admin; (b) DT club-wide + Coach per category | **(a)**, matching local usage of *DT*. Small clubs get both roles for the creator automatically ([Roles § 2](02-personas-and-roles.md#2-role-model)). | R0 |
| OQ-02 | **Launch market and language.** Uruguay and Argentina, Spanish Río de la Plata (*voseo*) first? | Copy, legal jurisdictions, hosting region, pilots | UY/AR first; Spanish (neutral) LatAm; Spain; English-first | **UY/AR, Spanish with *voseo***, i18n-ready, English in R3 | R0 |
| OQ-05 | **Minimum age and minors.** 16+ with guardian consent for wellness? What about youth categories? | Legal exposure (health data of minors); scope | 16+; 13+ with guardian; all ages with guardian-managed accounts | **16+**, guardian consent for health data from 16–17, under-16 out of scope. ⚖️ legal validation | R0 (legal), R2 (guardian flow) |
| OQ-06 | **Sign-in methods** at launch | Friction vs. cost vs. store rules | Google + Apple + email code; add phone SMS / WhatsApp OTP | **Google + Apple + email code**; phone/WhatsApp OTP later if pilots show email friction | R0 |
| OQ-07 | **RSVP without an account?** (anonymous "tap your name" from the link) | Adoption vs. identity and data quality | Require an account; allow anonymous RSVP | **Require an account.** Managed profiles + proxy RSVP + persistent sessions cover the rest. | R0 |
| OQ-08 | **Join approval default** for player invite links | Speed of onboarding vs. protecting rosters and minors' data | Approval on; approval off | **On by default** for player links, **always on** for staff links | R0 |
| OQ-15 | **Backend stack.** TypeScript/Node end to end, or does the team prefer another backend (e.g. Laravel)? | Hiring, velocity, contract sharing | TS/Node (NestJS or Fastify); Laravel/PHP; other | **TypeScript/Node with NestJS**, PostgreSQL (Prisma), pg-boss, REST + OpenAPI; Expo for mobile and Next.js for web. Full proposal in [Tech stack](../tech/00-tech-stack.md). | R0 |
| OQ-18 | **Pilot clubs.** Who, how many, when? | R1 scope validation and timing | — | **3–5 clubs**, recruited during R0 ([Roadmap § 5](04-scope-and-roadmap.md#5-pilot-plan)) | R0 |

## 2. Needed later

| ID | Question | Options | **Recommended default** | Needed by |
|---|---|---|---|---|
| OQ-03 | **Product name** (working name: *Football Club Management*) | See § 4 | Shortlist in § 4. Check domain, stores and trademark before choosing. | Before store submission (R1-β) |
| OQ-04 | **Business model and pricing.** What is free, what is Pro, and AI quotas | Freemium per club / per category; per player; flat club fee | **Free pilot**, then freemium: free attendance for ≤ 2 categories, Pro per category/month, AI allowance in Pro ([Vision § 9](01-vision-and-strategy.md#9-business-model-hypotheses-oq-04)) | Before GA (R1) |
| OQ-09 | Can players see teammates' **individual** attendance and the ranking by default? | On by default; off by default | **On** (per the Notion brief), with a per-category toggle | R1 |
| OQ-10 | **Wellness frequency and content.** Weekly vs. pre-session; extra items (sleep, stress, soreness, mood) | Weekly; pre-session; both | **Weekly load + pain** in R2; extra items and ad-hoc requests in R3; pre-session mode Later | R2 |
| OQ-11 | **Wellness retention and revocation behavior** | 12 / 24 / 36 months; delete on revocation or keep | **24 months**; revocation stops collection, deletion is optional ⚖️ | R2 |
| OQ-12 | **Video uploads in R2?** Provider and limits | Uploads (Mux / Cloudflare Stream) with limits; external links only | **Uploads** ≤ 2 min, 3 per exercise, via a managed provider; fall back to links only if cost blocks | Start of R2 |
| OQ-13 | **Starter library content.** Who creates it, under what license? | Commission a coach / PE professional; partner with a coaching school; license existing content | **Commission ≥ 60 exercises** from a qualified coach under a license that allows platform use and club copies | Mid-R1 (content takes time) |
| OQ-14 | **AI model and cost trade-offs**; AI on by default; acceptable data sharing | Opus 5.5 everywhere; cheaper models per route after evals; AI opt-in vs. opt-out | **Opus 5.5 default**; evaluate cheaper models per route against the eval set; **AI on by default** with a club toggle; pseudonymized data only ([AI architecture](../tech/04-ai-architecture.md)) | Start of R3 |
| OQ-16 | **Squad selection (*convocatoria*) and match stats.** What does "performance analytics" mean? | Squad selection only; plus results; plus player stats | **Squad selection in R3** (EVT-21); match results and player match stats Later, after defining "performance" with pilot DTs | R3 planning |
| OQ-17 | **Payments (*cuotas*) and medical clearance tracking.** Future modules? | — | **Later**; gather pilot interest signals | Post-R3 |
| OQ-19 | **Seasons** in R1 or later? | R1 seasons; date-range filters until later | **Date-range filters** until seasons ship (Later) | Post-R3 |
| OQ-20 | **WhatsApp Business notifications.** When, and with what budget? | Never; for critical messages only; full | **Later.** Revisit after pilot push opt-in data. | Post-pilot |
| OQ-21 | **Women's, mixed and futsal categories at launch?** | Yes as attributes; later | **Yes**, as category attributes (format, gender) with no extra logic | R1 |
| OQ-22 | **Track staff RSVP and attendance?** | Yes; no | **No** for now; Later if pilots ask | Post-pilot |
| OQ-23 | **Can players browse the whole exercise library?** | Only linked exercises; full library (read-only); per-category toggle | **Only exercises in published plans or assigned routines** in R2; consider a toggle later | R2 |

## 3. Decided

Decisions D-01 to D-16 resolve contradictions found in the docs consistency review of 2026-10-22. They are product-owner decisions, pending stakeholder confirmation.

| ID | Decision | Date | Decided by |
|---|---|---|---|
| D-01 | A DT can **add** any club member to a category they lead, but can **move** a player only between categories they lead both of; otherwise a Club Admin moves them (CLUB-10, Roles § 4.1). | 2026-10-22 | Product (docs review) |
| D-02 | Player invite links created by Coaches always require approval, and Coaches cannot create managed profiles, so Coaches never change rosters (BR-CLUB-08). | 2026-10-22 | Product (docs review) |
| D-03 | Only Club Admins approve DT-role join requests (BR-CLUB-09, N-09). | 2026-10-22 | Product (docs review) |
| D-04 | Rescheduling keeps the RSVP deadline and call time offsets and recomputes them; a deadline already past moves to the new start (BR-EVT-13). | 2026-10-22 | Product (docs review) |
| D-05 | Membership merge rules defined (categories, invitee rows, RSVP and attendance conflicts), and duplicate detection also runs on direct joins (BR-AUTH-11, BR-CLUB-10). | 2026-10-22 | Product (docs review) |
| D-06 | Membership dates are inclusive calendar days; a move effective D ends the old membership on D − 1 (BR-CLUB-06, BR-ROLE-10). | 2026-10-22 | Product (docs review) |
| D-07 | Invitee source is `category`, `call_up` or `walk_in`. Category analytics count members of the category on the event date plus call-ups and walk-ins; attribution is derived, not stored (BR-EVT-02, F04 § 3.3). | 2026-10-22 | Product (docs review) |
| D-08 | RSVPs close at the start or when roll call is first saved; `attendance_missing` events can be completed by staff within 14 days and by Club Admins any time (F03 § 3, BR-EVT-08, BR-EVT-17). | 2026-10-22 | Product (docs review) |
| D-09 | Reminder spacing (BR-NOTIF-13) and the weekly ritual merge of N-11 into N-02 (BR-NOTIF-14); N-02 is one digest per player per club. | 2026-10-22 | Product (docs review) |
| D-10 | Notification catalog: N-10 only for approved join requests, N-18 for every membership, role and admin change to the person affected, N-19 for the other Club Admins; new N-20 (removed from event), N-21 (RSVP changed by staff), N-22 (guardian consent update); preference groups revised (BR-NOTIF-11). | 2026-10-22 | Product (docs review) |
| D-11 | The wellness schedule lives in the category's wellness screen, not in category settings, so its permissions follow Roles § 4.5 (CLUB-14, WELL-03). | 2026-10-22 | Product (docs review) |
| D-12 | Each category's default player link never expires; "Solicitar unirme" from an event link uses it and always requires approval (CLUB-05, EVT-10). | 2026-10-22 | Product (docs review) |
| D-13 | Archiving a category cancels only events linked solely to it; joint events are unlinked from it instead (BR-CLUB-04). | 2026-10-22 | Product (docs review) |
| D-14 | Seasons, match results, the admin audit-log viewer and configurable at-risk and wellness-flag thresholds are **Later**, not R3 (OQ-16, OQ-19). | 2026-10-22 | Product (docs review) |
| D-15 | CLUB-17 (delete the club) moves to R1-β, because account deletion (AUTH-13, β) requires Owners to delete or transfer their club. | 2026-10-22 | Product (docs review) |
| D-16 | Consent records survive account deletion for 5 years as evidence, minimized (BR-AUTH-12, Privacy § 6). Club Admins see individual routines and nutrition plans only if they are also staff of the player's category (Roles § 4.4). | 2026-10-22 | Product (docs review) |
| D-17 | Sessions expire after 90 days without use on every device (was 90 on mobile and 30 on web), and are revocable server-side sessions without refresh rotation, following the auth spike (BR-AUTH-04, ADR-007). | 2026-10-23 | Product (TECH-04 spike) |

## 4. Naming shortlist (OQ-03)

Criteria: short, easy to say in Spanish, evokes the team and the coach, available as a domain and on the stores, and not trademarked in the category.

| Candidate | Meaning / rationale | Notes |
|---|---|---|
| **Plantel** | Río de la Plata word for *squad*: the core object of the app | Strong local identity; check availability. **Recommended first choice.** |
| **Vestuario** | The locker room, where the team lives | Warm and inclusive; slightly long |
| **Pizarra** | The coach's tactics board | Coach-centric; fits AI planning |
| **Convocados** | The called-up squad | Very football, but tied to matches only |
| **La Cancha** | The pitch | Generic; likely hard to register |
| **Matchday** / **Kickoff** | English options for later international expansion | Less local identity; crowded namespace |

Next step: check domain (.com / .app / .uy / .com.ar), App Store and Play Store name availability, and a trademark search for the top 2 candidates.
