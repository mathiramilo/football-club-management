# Product Vision & Strategy

> Status: **Draft v0.1** · Owner: Product · Last updated: 2026-10-22
> Working name: **Football Club Management** (final name pending, OQ-03).

## 1. Problem

Amateur and semi-professional football clubs run on volunteer time and WhatsApp:
- **Attendance** is a group message where players type "voy". Lists get overwritten and DTs chase players one by one. Nobody knows, until arriving at the field, whether there are enough players or a goalkeeper.
- **Planning** lives in notebooks and the coach's head. Exercises are re-explained every session, eating into the little field time available.
- **Physical state** is unknown until a player gets injured. *Profes* have no consistent record of load or pain.
- **Content** (routines, nutrition guides, drill videos) is scattered across PDFs and chats and lost in the scroll.
- **Rosters** across categories live in different people's phones. When players move between categories, nobody has the full picture.

The result: coaches spend their scarce time on admin instead of coaching, decisions are made without data, and players disengage.

## 2. Vision

> **Let coaches coach, and let players focus on playing.**

One app for the whole club. Players confirm in one tap and arrive knowing what the session will be. Coaches open it on Sunday night and know who's available, by position, how everyone feels, and get a complete practice plan built from their own exercises in minutes.

**Positioning statement.**
- *For* DTs, *profes* and coordinators of amateur and semi-pro football clubs,
- *who* juggle WhatsApp, spreadsheets and PDFs to run their teams,
- *the product* is a football-native club management app
- *that* turns attendance, player wellness and training content into one connected workflow, with an AI assistant that plans with the club's own data.
- *Unlike* generic team apps or WhatsApp groups, it speaks the language of local football (categories, *convocatoria*, *profe*, lines and positions), works even when some players never install it, and is priced for amateur clubs.

## 3. Target market

| Segment | Description | Priority |
|---|---|---|
| **Beachhead** | Amateur and semi-pro clubs in Uruguay and Argentina with 2–8 categories, volunteer or low-paid staff, and players aged 16+. Examples: university and amateur leagues, regional leagues, lower divisions. | Pilot and R1–R3 (OQ-02, OQ-18) |
| Adjacent 1 | The same profile in the rest of Spanish-speaking Latin America and in Spain. | After product–market fit |
| Adjacent 2 | Women's football and futsal (supported from day one through category attributes, OQ-21). | From R1 |
| Adjacent 3 | Youth academies (under 16, guardian-managed accounts). | Later (OQ-05) |
| Adjacent 4 | Other team sports (basketball, rugby, hockey) with the same workflows. | Later |

## 4. Value proposition by role

| Role | Before | After |
|---|---|---|
| **Player** | Scroll WhatsApp for time and place; get chased; arrive not knowing the plan. | One-tap RSVP from a notification; see who's going; review the session's exercises beforehand; a 30-second weekly check-in; routines and nutrition in one place. |
| **DT** | Chase confirmations; discover at the field there's no goalkeeper; select the squad on gut feeling. | Availability by line with warnings days ahead; automatic reminders; attendance history to back selection; AI-drafted plans. |
| ***Profe*** | PDFs nobody reads; no record of load or pain. | Squad wellness board with flags; assigned routines with adherence; an exercise library with videos; plans that adapt to squad state. |
| **Coordinator** | Rosters scattered; no overview. | Every category, role and player in one place; moves between categories in a tap; a club-wide attendance overview. |

## 5. Product principles

1. **Faster than WhatsApp, or it doesn't ship.** Any player action that takes longer than writing "voy" in the group loses. Target: two taps from notification to RSVP.
2. **Works with partial adoption.** Managed profiles, proxy RSVPs and shareable links make the product useful to the coach even when 30% of players never install it.
3. **Facts with denominators.** Every metric shows how it was computed. Trust in the numbers is the product.
4. **Football-native.** Local terminology, lines and positions, formats (F11, F7, futsal) and the weekly match-day cycle.
5. **Drafts, not decisions.** AI proposes; coaches decide.
6. **Privacy by default.** Health data is opt-in and minimal, seen only by the player's own staff.
7. **One weekly ritual.** Converge player obligations into one weekly moment ("Tu semana": confirm the week plus the check-in) instead of many interruptions.

## 6. Goals and non-goals

**Goals (first 12 months)**
- G1 — Replace WhatsApp attendance lists for pilot clubs (R1).
- G2 — Make roll call a habit, so attendance data is reliable (R1).
- G3 — Become the place where training content lives: library, plans, routines (R2–R3).
- G4 — Give *profes* a weekly wellness signal with high response rates (R2).
- G5 — Prove that AI planning saves coaches real time with acceptable quality (R3).
- G6 — Validate willingness to pay at club level (from R2 onwards).

**Non-goals (explicitly out of scope for now)**
- Team chat or messaging (WhatsApp wins; we integrate through links instead). One-way announcements are a possible R3 Could.
- Payments and fee collection (*cuotas*): a strong future candidate (OQ-17).
- League management, fixtures, referees, official registrations.
- Match statistics and video analysis (OQ-16).
- GPS or wearable integrations, medical records, physiotherapy case management.
- A public social network or marketplace of exercises.
- Youth (under 16) accounts (OQ-05).

## 7. Success metrics

**North Star: Weekly Active Squads (WAS).** The number of categories that, in a given week, had at least one event where **≥ 70% of invitees answered before the deadline**. It captures both real usage (events created) and player adoption (responses), and it is exactly the WhatsApp-replacement moment.

| Area | Metric | Definition | Pilot target (hypothesis) |
|---|---|---|---|
| Activation | Club activation | Within 14 days of creation: ≥ 1 category with ≥ 60% of its roster holding accounts, and ≥ 2 events created | ≥ 70% of pilot clubs |
| Engagement | RSVP response rate | Invitations answered before the deadline ÷ invitations | ≥ 75% |
| Engagement | Median response lead time | Event start − first response | ≥ 24 h |
| Data quality | Roll-call completion | Completed events ÷ (completed + attendance missing) | ≥ 80% |
| Reach | Push opt-in rate | Players who granted push ÷ players with the app | ≥ 70% |
| Retention | Player W4 retention | Players active in week 4 after joining | ≥ 60% |
| Retention | Staff W8 retention | Staff active in week 8 after joining | ≥ 80% |
| Value | Coach time saved | Self-reported in pilot interviews | ≥ 1 h/week per DT |
| R2 | Wellness coverage | Covered consenting players ÷ consenting players per cycle | ≥ 70% |
| R2 | Plans per practice | Practices with a plan ÷ practices | ≥ 40% |
| R3 | AI plan acceptance | AI generations accepted ÷ generations | ≥ 50% |

**Guardrails** (must not degrade): non-mandatory pushes per player per week (≤ 6 on average), notification mute or opt-out rate, crash-free sessions (≥ 99.5%), support contacts per club per month, AI cost per active club.

## 8. Competitive landscape (initial, to validate)

| Alternative | What it does well | Gap we exploit |
|---|---|---|
| **WhatsApp + spreadsheets** (status quo) | Universal, free, already installed | No structure, no data, no history, constant chasing |
| **Generic team apps** (e.g. Spond, TeamSnap, SportEasy, Heja) | Events, RSVP, team communication; some include payments | Not football- or Río de la Plata-native; little or no wellness or training content; English- or Europe-first; pricing and payments not tailored to the region |
| **Pro performance platforms** (e.g. Kitman Labs, Smartabase, Teamworks) | Deep wellness, load and medical tooling | Built and priced for professional clubs; too complex for volunteers |
| **Drill and tactics apps** | Exercise diagrams and libraries | Disconnected from attendance, squad and player access |
| **General-purpose AI chatbots** | Can suggest sessions | No knowledge of the club's exercises, players, calendar or squad state; nothing is saved into a workflow |

**Differentiation**: a connected loop (attendance → wellness → planning → AI with context), football-native, works with partial adoption, Spanish-first, and priced for amateur clubs. A deeper competitor analysis (features, pricing, presence in UY/AR) is a pre-pilot task.

## 9. Business model hypotheses (OQ-04)

| Hypothesis | Description | How to validate |
|---|---|---|
| BM-1 | **The club pays**, not individual players. | Pilot interviews with coordinators and treasurers. |
| BM-2 | **Freemium**: a free tier with attendance for up to 2 categories; a **Pro** tier per category/month with wellness, library, planning, routines, advanced analytics and an AI allowance. | Willingness-to-pay interviews; conversion after the free pilot. |
| BM-3 | The price point must be low for amateur clubs (order of a few US dollars per category per month). | Price-sensitivity questions (Van Westendorp) in pilot exit interviews. |
| BM-4 | AI costs are covered by a monthly allowance per Pro club, plus optional add-on credits. | AI cost per active club ([AI architecture § 9](../tech/04-ai-architecture.md#9-cost-model)) vs. price. |
| BM-5 | Future expansion revenue from fee collection (*cuotas*) with a take rate. | Interest signal in pilot interviews (OQ-17). |

The pilot is **free**. Pricing is decided before general availability.

## 10. Key assumptions and risks

| # | Assumption | Risk if wrong | Validation |
|---|---|---|---|
| A1 | Players will install an app (or use web links) instead of typing in WhatsApp | No adoption, so no data | Pilot: share of players with accounts; RSVP response rate; link-based RSVP share |
| A2 | Coaches will take roll call after events | Attendance metrics become unreliable | Roll-call completion; time to complete; interviews |
| A3 | A weekly check-in gives *profes* enough signal | Wellness feature is underused | Coverage rate; *profe* interviews; option for pre-session mode (OQ-10) |
| A4 | Coaches will invest in structured exercise metadata | AI plans are poor; search is weak | Completeness indicator stats; starter library usage |
| A5 | AI plans are good enough to be accepted with minor edits | AI feature disappoints and its cost is unjustified | Eval set; pilot coach ratings; acceptance rate |
| A6 | Clubs will pay a monthly fee | No business | Willingness-to-pay interviews; conversion after pilot |
| A7 | Health-data consent flows don't kill adoption | Low wellness participation | Consent completion rate, especially for guardian flows |
