---
paths:
  - "**/*.{ts,tsx}"
---

# TypeScript

- `strict` everywhere (shared presets in `packages/config`). No `any`: use `unknown` and narrow. No `!` non-null assertions to silence the compiler. No `@ts-ignore`; `@ts-expect-error` only for a third-party typing bug, with the reason on the same line.
- No TypeScript `enum`. Enums are Zod enums in `packages/contracts` and their inferred string-literal unions.
- API request and response types come from `packages/contracts` (`z.infer`) or `packages/api-client`. Never hand-write them.
- Never edit generated code (`packages/api-client` output, the Prisma client, the OpenAPI document). Change the source and regenerate.
- A business rule needed by both server and client (metric formulas, wellness flags, RSVP deadline and late-change logic, quiet hours) lives in `packages/domain`. Never reimplement it inside an app.
- Import another workspace package through its package name, never with a relative path into its `src`.
- Throw typed errors that carry a stable code from the error catalog in `packages/contracts`. Never throw strings.

## Time

- Instants travel as ISO 8601 with offset and are stored as `timestamptz` (UTC). Calendar days in the club time zone are `YYYY-MM-DD` strings.
- Wall-clock rules (series, quiet hours, digests, check-in moments, deadlines) are computed in the **club's IANA time zone** with `date-fns` + `@date-fns/tz` (BR-EVT-26). Never use the server's or device's local time for business rules.
- Domain functions take `now` as a parameter. Backend code gets the time from an injected clock, never from `new Date()` or `Date.now()` directly, so tests can control it.

## Comments

Default to none: names and small functions carry intent. In backend and domain code a comment is allowed only for:
- a business rule that looks arbitrary from the code, citing its ID: `// BR-EVT-09: locked events reject changes after the deadline`;
- an external constraint and its workaround (API quirk, library bug);
- a deliberate choice that reads like a mistake;
- a ticketed TODO: `// TODO(EVT-15): <action>`.

React code in `apps/web` and `apps/mobile` has no comments at all. Never leave commented-out code or narrate what the code does.
