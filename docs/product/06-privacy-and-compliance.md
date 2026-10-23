# Privacy, Safety & Compliance

> Status: **Draft v0.1, pending legal review** · Owner: Product · Last updated: 2026-10-23
> This document is the product's position and requirements, **not legal advice**. Every item marked ⚖️ must be validated with counsel in the launch jurisdictions (Uruguay and Argentina first; any EU users bring the GDPR into scope).

## 1. Principles

1. **Data minimization.** Collect only what a feature needs. Birthdate is needed (minor status); home address is not.
2. **Least privilege.** Health-related data is visible only to the player and the staff of their current categories, never to Club Admins by role alone ([Roles § 4.5](02-personas-and-roles.md#45-wellness-health-related-data)).
3. **Explicit, revocable consent** for health-related data, given by a guardian for minors.
4. **Transparency.** Users see who can see their data, and what goes to third parties (AI provider included).
5. **Privacy by default.** Wellness is off until enabled. Push notifications never show health data. Telemetry never includes health data or free text.

## 2. Data inventory and classification

| Data | Examples | Class | Where | Visible to |
|---|---|---|---|---|
| Account | Email, name, nickname, photo, phone | Personal [P] | `users` | Self; staff and teammates (display name and photo); email and phone per BR-CLUB-07 |
| Birthdate / minor status | Birthdate | Personal; minors [M] | `users`, `club_memberships` | Self, staff (age), system |
| Membership | Categories, roles, positions, jersey number | Personal [P] | `club_memberships`, `category_memberships` | Club members per matrix |
| Attendance | RSVPs, attendance, history | Personal [P] | `event_invitees`, `rsvp_changes` | Self, teammates (status only), staff |
| Absence reasons | `injury_illness`, notes | Personal; **possibly health** [H] | `event_invitees` | Self, event staff, Club Admins |
| Wellness | Load, pain areas, intensity, notes | **Health (special category)** [H] | `wellness_*` | Self; staff of current categories (logged) |
| Consents | Versions, guardian name and email | Personal [P][M] | `consents`, `guardian_consent_requests` | Self, platform |
| Individual content | Rehab routines, individual nutrition plans | Possibly health [H] | `content_*` | Assignee, their staff |
| Training content | Exercises, plans, media | Club content (may show people in videos) | `exercises`, storage | Club staff; players per BR-EXR-06 |
| AI conversations | Staff questions, model outputs | Personal (staff), may reference players | `ai_*` | The staff member only |
| Device and technical | Push tokens, app version, IP (logs) | Personal [P] | `devices`, logs | Platform |
| Sessions | Session token, IP, browser or app | Personal [P] | `auth_sessions` | Platform |
| Analytics events | Usage events (no free text, no health data) | Pseudonymous | Analytics provider | Platform |

## 3. Health-related data (wellness)

Requirements for [F07](../features/F07-player-wellness.md):

| # | Requirement |
|---|---|
| H-1 | Separate, explicit, versioned consent before collection (BR-WELL-12). Not bundled with the terms of service. |
| H-2 | Purpose limitation: training-load planning and injury prevention by the club's coaching staff. No other uses (no marketing, no sale, no profiling for selection outside sports staff). ⚖️ Confirm wording. |
| H-3 | Access restricted to staff of the player's current categories (BR-ROLE-10). Every individual access is logged (BR-WELL-16). |
| H-4 | Revocation at any time, with optional deletion of history (BR-WELL-14). |
| H-5 | Retention limited to 24 months (BR-WELL-15, OQ-11). |
| H-6 | No health data in push content, analytics, general logs or AI prompts beyond aggregates and pseudonymized flags (BR-WELL-18, BR-AI-07). |
| H-7 | Medical disclaimer: the product does not diagnose (BR-WELL-11). The product is not a medical device. ⚖️ Confirm the product is outside medical-device regulation with the planned wording and features. |
| H-8 | Encryption at rest and in transit (NFR-SEC-01). RLS is planned as defense in depth (ADR-005). |

## 4. Minors

| # | Requirement |
|---|---|
| M-1 | Minimum account age **16** (BR-AUTH-05). Under 16 is not supported in the MVP (OQ-05). ⚖️ Confirm the minimum age and whether general account creation for 16–17-year-olds needs guardian consent in each jurisdiction (not only wellness). |
| M-2 | Health-data consent for 16–17-year-olds is given by a **guardian** via an emailed consent page (BR-WELL-13). ⚖️ Confirm that email-based guardian consent is sufficient evidence, or define stronger verification. |
| M-3 | When a minor turns 18, they confirm consent themselves. |
| M-4 | Minors' personal data is never shown publicly. Event link previews contain no personal data (EVT-07). |
| M-5 | Youth football (under 16) would require guardian-managed accounts. This is a separate product decision (Later). |

## 5. AI processing

| # | Requirement |
|---|---|
| AI-P-1 | The AI provider (Anthropic) is listed as a **sub-processor** in the privacy policy. A data processing agreement is in place before R3. |
| AI-P-2 | Data sent follows [AI architecture § 6](../tech/04-ai-architecture.md#6-privacy-and-data-minimization): aliases instead of player names, wellness aggregates only, and no notes, absence reasons, contact data or individual nutrition and rehab content. |
| AI-P-3 | Clubs can disable AI (BR-AI-02). The in-app explanation states what is sent (AI-09). |
| AI-P-4 | Review the provider's retention and training-use terms at contracting time. Commercial API data is not used for model training by default; confirm this, and evaluate available retention options. |
| AI-P-5 | AI outputs are labelled as AI-generated and reviewed by a person before use (BR-AI-04, BR-AI-10). |

## 6. Retention

| Data | Retention | Trigger for deletion |
|---|---|---|
| Account and profile | While the account is active | Account deletion: 30-day grace, then purge (BR-AUTH-12) |
| Attendance and RSVPs | While the club exists | Anonymized on account deletion; deleted with the club |
| Wellness check-ins | **24 months** from submission (OQ-11) | Age-based purge; deletion on request (BR-WELL-14); account deletion |
| Wellness access logs, audit log | 24 months | Age-based purge |
| Consents (records) | While valid, plus 5 years after revocation as evidence ⚖️ | Age-based purge |
| AI conversations | 12 months or until deleted (BR-AI-12) | Age-based purge; user deletion |
| AI usage records (no content) | 24 months | Age-based purge |
| Notifications inbox | 90 days | Age-based purge |
| Club data | While the club exists | Club deletion: 30-day grace, then purge (BR-CLUB-13) |
| Backups | 30 days rolling | Expire automatically. Deleted data disappears from backups within 30 days. |
| Application logs | 30 days | Age-based purge |

## 7. Data subject rights

| Right | R1 handling | Later |
|---|---|---|
| Access / portability | Request to support (email), fulfilled within 30 days with a JSON/CSV export | Self-service export (AUTH, Later) |
| Rectification | Self-service profile editing; staff edit club data | – |
| Erasure | Self-service account deletion (AUTH-13); wellness history deletion (WELL-12) | – |
| Objection / consent withdrawal | Wellness revocation; notification preferences; analytics opt-out | – |

⚖️ Response deadlines and identity verification per jurisdiction.

## 8. Controller and processor roles

⚖️ There are two candidate models, and the choice affects the terms of service, the DPA and who answers data requests:
- **Platform as controller** for account data, with **clubs as controllers** for club-managed data (rosters, attendance, wellness) and the platform as their processor. Typical for B2B SaaS.
- **Platform as sole controller.** Simpler for consumers, but heavier responsibility for club-entered data (e.g. managed profiles added by staff without the player's involvement).

Recommendation: decide with counsel before the pilot. Whichever model is chosen, the club terms make clubs responsible for having the right to add managed profiles and for the content they upload.

## 9. Sub-processors (candidates, final list from ADRs)

| Purpose | Candidate | Data |
|---|---|---|
| Hosting (API, DB, worker) | Container platform + managed Postgres (São Paulo) | Everything |
| Web hosting | Vercel | Web requests, public pages |
| Object storage / CDN | S3-compatible provider | Media, attachments |
| Video | Mux / Cloudflare Stream (R2) | Exercise videos |
| Push | Expo (→ Apple APNs, Google FCM) | Push tokens, notification content |
| Email | Transactional email provider | Email addresses, email content |
| Error tracking | Sentry | Technical data, user ID |
| Product analytics | PostHog | Pseudonymous usage events |
| AI | Anthropic (R3) | Per § 5 |

⚖️ International transfers: confirm the safeguards required for hosting outside Uruguay and Argentina (ADR-011).

## 10. App store and platform requirements

| Requirement | Where handled |
|---|---|
| In-app account deletion (Apple) and a web deletion path (Google Play) | AUTH-13 |
| Sign in with Apple (or an equivalent privacy-focused option) when third-party sign-in is offered on iOS | AUTH-02 |
| App Privacy "nutrition labels" (Apple) and the Data Safety form (Google), consistent with § 2 | Release checklist |
| Push permission explanation before the system prompt | BR-AUTH-13, BR-NOTIF-10 |
| Health-data disclosures in store listings | Release checklist |
| Minimum age and content rating questionnaires | Release checklist |

## 11. Security incidents

- An incident response runbook is ready before the pilot: detection, containment, assessment, notification, post-mortem.
- ⚖️ Breach-notification obligations and timelines to authorities and affected users, per jurisdiction.
- Health-data incidents are treated as high severity by default.
- Session tokens are stored in plain text (ADR-007), so a database or backup leak exposes live sessions. Containment starts by revoking every session, which signs everyone out.

## 12. Content and conduct

- The terms of service require uploaders to own, or have permission for, uploaded media. They prohibit offensive content and content showing minors without the club's authorization.
- Club Admins can archive any exercise or content. The platform runs a takedown channel (email) for rights holders and abuse reports, with a response target of 72 h.
- No public, cross-club content in the MVP (except the curated starter library), which limits moderation scope.

## 13. Legal deliverables

| Deliverable | Needed by |
|---|---|
| Terms of service (users) and club terms | Pilot (R1) |
| Privacy policy (es; en in R3) | Pilot (R1) |
| Health-data consent text (player and guardian) | R2 |
| DPA template for clubs (if clubs are controllers) | Pilot (R1) |
| Database registration with data protection authorities where required (e.g. URCDP in Uruguay; AAIP registry in Argentina) ⚖️ | Before GA |
| Sub-processor list and DPAs signed | Before each provider handles personal data |
| Store privacy disclosures | First store submission |
| Incident response runbook | Pilot (R1) |
