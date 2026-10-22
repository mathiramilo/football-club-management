# Non-Functional Requirements

> Status: **Draft v0.1** · Last updated: 2026-10-22
> Targets apply from R1 unless noted. Each requirement has an ID so stories and tests can reference it. Privacy requirements are in [Privacy & compliance](../product/06-privacy-and-compliance.md).

## 1. Performance

| ID | Requirement |
|---|---|
| NFR-PERF-01 | API latency (server time, excluding network): p95 ≤ 300 ms for reads and ≤ 500 ms for writes, under expected peak load (§ 3). Analytics endpoints: p95 ≤ 1.5 s for a category with 12 months of data. |
| NFR-PERF-02 | RSVP: perceived completion ≤ 300 ms (optimistic UI). Server confirmation p95 ≤ 1 s on 4G. |
| NFR-PERF-03 | Mobile cold start to interactive Home ≤ 3 s on a reference low/mid-range Android device (e.g. a recent Samsung Galaxy A0x/A1x-class phone) and ≤ 2 s on a recent iPhone. |
| NFR-PERF-04 | Public event and invite web pages: LCP ≤ 2.5 s on simulated 4G mobile. JS payload for these pages ≤ 150 KB gzipped. |
| NFR-PERF-05 | Exercise search p95 ≤ 500 ms for libraries ≤ 2,000 exercises (EXR-05). |
| NFR-PERF-06 | Notification hand-off to the push provider p95 ≤ 60 s after the scheduled time (NOTIF-02). |
| NFR-PERF-07 | AI: plan draft p95 ≤ 60 s; chat time to first token p95 ≤ 3 s ([AI architecture § 7](04-ai-architecture.md#7-reliability-safety-and-refusals)). |

## 2. Availability and recoverability

| ID | Requirement |
|---|---|
| NFR-AVAIL-01 | Monthly availability of the API and web app ≥ **99.5%** (R1–R2), with a target of ≥ 99.9% after general availability. Planned maintenance is announced and scheduled outside 17:00–23:00 club time (peak usage). |
| NFR-AVAIL-02 | Database: daily backups retained 30 days, plus point-in-time recovery for 7 days. **RPO ≤ 15 min, RTO ≤ 4 h.** A restore drill is done before the pilot and then quarterly. |
| NFR-AVAIL-03 | Degraded modes: if push fails, the inbox still records everything. If the AI provider fails, the rest of the app works. If the video provider fails, exercises still render without video. |
| NFR-AVAIL-04 | Background jobs are idempotent with at-least-once delivery. A job failure is retried with backoff and dead-lettered after N attempts, with an alert. |

## 3. Capacity and scalability (planning assumptions)

| ID | Assumption / requirement |
|---|---|
| NFR-SCALE-01 | Pilot: 3–5 clubs, ~20 categories, ~600 users. |
| NFR-SCALE-02 | Year 1 target: 200 clubs, 1,000 categories, 25,000 users, ~5,000 events/week, ~100,000 RSVPs/week, ~40,000 notifications/day. |
| NFR-SCALE-03 | Peaks: weekday evenings (18:00–23:00) and digest or reminder bursts (e.g. Monday 10:00 across many categories). Notification jobs are spread over a window (±5 min jitter) to avoid thundering herds. |
| NFR-SCALE-04 | The architecture (modular monolith, single Postgres) must support Year 1 targets with vertical scaling and read replicas only. No sharding is planned. |

## 4. Security

| ID | Requirement |
|---|---|
| NFR-SEC-01 | TLS 1.2+ everywhere, with HSTS on web. Encryption at rest for the database, backups and object storage. Encryption at application level for especially sensitive fields (`ai_conversations.alias_map`, guardian contact data). |
| NFR-SEC-02 | **Authorization is enforced server-side on every request** through the central policy module (BR-ROLE-07). There is no client-side enforcement. |
| NFR-SEC-03 | **Tenant isolation tests**: for every endpoint, automated tests prove that a user of club A cannot read or write club B's data, and that role limits hold (e.g. a Coach cannot change rosters; a Club Admin without a staff role cannot read individual wellness data). |
| NFR-SEC-04 | Secrets live only in the platform's secret manager, never in the repo or the client bundles. Keys are rotated at least yearly and immediately on suspected exposure. The AI provider key is server-only. |
| NFR-SEC-05 | **Rate limiting**: <br>• Auth: per email 5 codes/hour and per IP 30/hour. <br>• Invite and claim accept: 20/hour per user. <br>• Nudges: 1 per event every 2 h (EVT-13). <br>• AI: per BR-AI-11. <br>• General API: 600 requests/min per user. |
| NFR-SEC-06 | Baseline: **OWASP ASVS Level 2** controls for web and API, and the **OWASP MASVS** baseline for mobile (secure token storage, no secrets in the app, certificate validation). |
| NFR-SEC-07 | Dependency scanning and static analysis in CI. Critical vulnerabilities block release. |
| NFR-SEC-08 | Uploads: type and size validated server-side, images re-encoded, documents malware-scanned before they are served, and media served only through signed URLs with short TTLs. |
| NFR-SEC-09 | Audit log for administrative and roster actions; access log for health data (BR-WELL-16). Both are append-only and retained 24 months. |
| NFR-SEC-10 | The back-office requires SSO with MFA, operates under least privilege, and audits every action. Production database access is break-glass only. |
| NFR-SEC-11 | Session tokens are stored in the iOS Keychain or Android Keystore on mobile, and in httpOnly, Secure, SameSite cookies on web. Refresh token rotation includes reuse detection. |
| NFR-SEC-12 | An external penetration test (or at least a structured security review) happens before public launch (end of R1 pilot → GA). |

## 5. Offline and connectivity

| ID | Requirement |
|---|---|
| NFR-OFF-01 | **Offline writes** on mobile for RSVP, bulk RSVP, roll call, wellness check-ins and routine logs: queued locally with idempotency keys, retried automatically on reconnect, with the sync state visible. Queued items survive app restarts. |
| NFR-OFF-02 | **Offline reads** on mobile: agenda (next 14 days), event details and availability snapshot, published plans and their exercises' text, active routines and nutrition plans with attachments (BR-CONT-09), own stats snapshot. |
| NFR-OFF-03 | The app never loses user input because of connectivity. Forms keep drafts until they are submitted. |

## 6. Compatibility

| ID | Requirement |
|---|---|
| NFR-COMP-01 | Mobile: iOS 16+ and Android 8.0+ (API 26+). Validate against the minimums of the Expo SDK version chosen in R0. Phones from 360 dp width. Tablets work, but are not optimized. |
| NFR-COMP-02 | Web: the last 2 versions of Chrome, Safari, Firefox and Edge. Mobile Safari and Chrome. The staff portal is optimized for ≥ 1280 px and usable from 768 px. Public and player pages are mobile-first. |
| NFR-COMP-03 | Universal links (iOS) and App Links (Android) are verified for every public path ([Architecture § 6.9](01-architecture-overview.md#69-deep-links-and-link-previews)). |
| NFR-COMP-04 | **In-app browsers**: pages opened from WhatsApp, Instagram or Facebook must work. Some embedded webviews block Google OAuth, so the web sign-in must detect them and offer email codes plus an "open in browser" hint. Verify WhatsApp's behavior on iOS and Android during R0. |

## 7. Accessibility

| ID | Requirement |
|---|---|
| NFR-A11Y-01 | Web meets **WCAG 2.2 AA**. |
| NFR-A11Y-02 | Mobile: screen-reader labels on every interactive element, support for dynamic type and font scaling up to 200% without loss of function, and touch targets ≥ 44×44 pt. |
| NFR-A11Y-03 | Color is never the only carrier of meaning (wellness flags, RSVP status and at-risk players also use icons and text). |
| NFR-A11Y-04 | **Outdoor readability**: field screens (roll call, availability, field mode) use high-contrast styles that work in direct sunlight and at night. |

## 8. Localization

| ID | Requirement |
|---|---|
| NFR-I18N-01 | No hard-coded user-facing strings. Every string lives in `packages/i18n` (ICU MessageFormat, with plural and gender support). |
| NFR-I18N-02 | The launch locale is Spanish, Río de la Plata variant (*voseo*: "Confirmá", "¿Vas?"). English follows in R3. Terminology follows the [Glossary](../product/03-glossary.md). |
| NFR-I18N-03 | Dates and times are shown in the club time zone (BR-EVT-26) in 24-hour format, and weeks start on Monday. |
| NFR-I18N-04 | Push and email templates are localized per recipient (BR-NOTIF-08). |

## 9. Observability

| ID | Requirement |
|---|---|
| NFR-OBS-01 | Error tracking with release and version tagging on mobile, web, API and worker. Crash-free sessions on mobile ≥ 99.5%. |
| NFR-OBS-02 | Structured logs with `request_id`, `club_id` and `user_id`. **Never logged**: tokens, codes, health data, absence reasons, AI message content. Log retention: 30 days. |
| NFR-OBS-03 | Dashboards and alerts: API 5xx rate > 1% over 5 min; p95 latency above target for 15 min; job queue lag > 2 min; push failure rate > 5%; email bounces; AI error rate and spend (see [AI architecture § 10](04-ai-architecture.md#10-observability)). |
| NFR-OBS-04 | Uptime checks on the API health endpoint and on the public web pages, from at least two regions. |
| NFR-OBS-05 | Product analytics events are defined in each feature doc. No personal free text and no health data are sent to analytics. Analytics respects a user-level opt-out. |

## 10. Data usage and app size

| ID | Requirement |
|---|---|
| NFR-DATA-01 | Images are served as resized variants (WebP or AVIF) matched to the display size. No full-resolution images in lists. |
| NFR-DATA-02 | Video uses adaptive streaming and **never autoplays on mobile data**; the user taps to play. |
| NFR-DATA-03 | Mobile app download size ≤ 40 MB (as reported by the stores for a typical device). |
| NFR-DATA-04 | A typical weekly player session (open the agenda, RSVP 3 events, one check-in, view one plan with no video) transfers ≤ 2 MB. |

## 11. Maintainability and quality

| ID | Requirement |
|---|---|
| NFR-MAINT-01 | **Backend tests are mandatory** for new behavior: unit tests for domain rules (`packages/domain`), integration tests for endpoints against real Postgres (including authorization and tenant isolation, NFR-SEC-03), and job tests for scheduling rules (quiet hours, caps, relevance re-check). |
| NFR-MAINT-02 | **Frontend (web and mobile) has no unit or component tests**, per team standard. Quality comes from typed contracts, linting, design QA and QA's end-to-end suites for critical flows (sign-in, RSVP from link, roll call, check-in) once QA is staffed. |
| NFR-MAINT-03 | Contract checks: the OpenAPI document is generated from `packages/contracts`, and CI fails on breaking changes to `v1`. |
| NFR-MAINT-04 | TypeScript strict mode, ESLint and Prettier. CI blocks merges on lint, typecheck or test failures. |
| NFR-MAINT-05 | Database migrations are forward-only, reviewed, and backward-compatible with the previous app version (expand/contract). |
| NFR-MAINT-06 | Docs live in `docs/`. A PR that changes behavior described in a spec updates that spec in the same PR. |
