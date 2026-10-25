---
paths:
  - "apps/web/**"
  - "apps/mobile/**"
  - "packages/ui-tokens/**"
  - "packages/api-client/**"
---

# Frontend (web and mobile)

Rules shared by `apps/web` and `apps/mobile`. Platform-specific rules are in `web-nextjs.md` and `mobile-expo.md`.

## Data

- Server state goes through the generated TanStack Query hooks in `packages/api-client`. No hand-written `fetch` calls to the API, no hand-written API types, and server data never goes into a global store.
- Query keys come from the generated hooks. After a mutation, invalidate or update exactly the affected queries.
- Optimistic UI for RSVP and roll call (perceived completion ≤ 300 ms, NFR-PERF-02), with rollback on error.
- Map problem+json `code` to localized copy (`errors.<CODE>` in `packages/i18n`). Never show raw server messages or codes to users.
- Forms use React Hook Form with the Zod resolver and the **same schema** from `packages/contracts`.
- Tolerate unknown response fields and unknown enum values: render a neutral fallback, never crash (old app versions stay in use).

## Permissions

The client only **hides** controls the user can't use. It never enforces permissions (BR-ROLE-07): the API decides and shapes responses by role. Don't compute permissions from scratch in the client; use what the API returns (memberships and roles from `/v1/me/clubs`).

## UI

- Design tokens (color, type, spacing, radius) come from `packages/ui-tokens` through the shared Tailwind preset. No hard-coded hex colors, font sizes or spacing values.
- Club theming: the club's primary color is an accent (header, active tab), applied through tokens or CSS variables with an automatic contrast check.
- **Status is never color alone** (NFR-A11Y-03): Voy is green with ✓ and a label, No voy is red with ✕, Sin responder is grey with ?. Wellness flags and at-risk players also get an icon and text.
- Every screen handles loading, empty, error and (mobile) offline states. Empty states explain the value and the next step.
- Dates and times are shown in the **club time zone**, 24-hour format, with Monday as the first day of the week (NFR-I18N-03).
- Charts are simple and always show numerator and denominator (BR-ANL-04).
- Dark mode is supported. Field screens (roll call, availability, field mode) also have a high-contrast style (NFR-A11Y-04).
- Design quality: plan, critique and polish screens with the `ui-design` skill, and avoid its refuse list of generic patterns. Web reviews also use the `web-design-guidelines` and `accessibility` skills.

## Copy and telemetry

- No hard-coded user-facing strings. Everything comes from `packages/i18n`; see `i18n-and-copy.md`.
- PostHog events are the ones defined in the feature spec, with IDs and enums only: no names, free text or health data (NFR-OBS-05). Sentry with PII scrubbing.

## Tests and comments

No unit or component tests in `apps/web` and `apps/mobile` (NFR-MAINT-02), and no comments in React code. Pure functions in `packages/ui-tokens` (such as the club theme contrast guard) are unit-tested like `packages/domain`.
