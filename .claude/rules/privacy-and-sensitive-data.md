# Privacy and sensitive data

The product handles health data and minors' data. These rules apply to every app and package. Full text: `docs/product/06-privacy-and-compliance.md`.

## Classes (marked in `docs/tech/02-data-model.md`)

- **[H] Health (special category)**: wellness check-ins, pain reports, the `injury_illness` absence reason, individual nutrition plans and `return_to_play` routines.
- **[P] Personal**: names, email, phone, photo, RSVPs, attendance, absence reasons and notes, push tokens.
- **[M] Minors**: birthdate, minor status, guardian consent data.

## Never send these anywhere outside their table

Tokens, sign-in codes, health data, absence reasons and notes, AI message content and personal free text must never reach:
- logs (Pino) or error reports (Sentry): redact them, and never log whole request bodies or entities;
- product analytics (PostHog): no free text, no health data, no input autocapture; session replay off or fully masked;
- push notification content (lock screens are public);
- AI prompts, beyond the aggregates and pseudonymized flags allowed by BR-AI-07;
- public pages and Open Graph images (`/e/…`, `/j/…`, `/c/…`): no personal data at all (EVT-07, M-4);
- URLs and query strings.

## Access

- Health data is visible only to the player and the staff of their **current** categories (BR-ROLE-10). A Club Admin role alone grants nothing.
- Every individual health-data read goes through a dedicated, access-logged method that writes `data_access_log` (BR-WELL-16). Never read `wellness_*` tables any other way.
- Wellness data is collected only with consent in force (BR-WELL-12). For players aged 16–17, a guardian gives consent (BR-WELL-13). Minimum account age is 16 (BR-AUTH-05).
- Access-granting tokens (invite, claim, guardian consent, refresh) are stored **hashed**.

## Data in the repo

- Seeds, fixtures, tests, screenshots and examples use **synthetic** people and clubs only. Never paste real player data, even from staging.
- Secrets live only in platform secret managers and local `.env` files that are never committed. Anything prefixed `NEXT_PUBLIC_` or `EXPO_PUBLIC_` ships to clients: treat it as public. The AI provider key is server-only.
