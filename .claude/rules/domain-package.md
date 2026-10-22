---
paths:
  - "packages/domain/**"
---

# `packages/domain`: shared business rules

Pure, framework-free TypeScript used by the API and, where clients need the same answer offline, by web and mobile. Examples: attendance metric formulas (F04), wellness flag rules (F07), RSVP deadline and late-change logic (F03), justified-absence defaults, quiet-hours shifting (F10), squad-size warnings by format.

- **No I/O and no framework imports**: no NestJS, Prisma, React, React Native, fetch, filesystem or environment variables. Only `date-fns`, `@date-fns/tz`, Zod types from `packages/contracts`, and plain TypeScript.
- **Deterministic**: `now`, the club time zone and settings are parameters. Never read the clock or locale inside.
- Functions take plain data and return plain data or a typed result. No classes with hidden state.
- Each exported rule names its spec in its test file (`describe('isLateChange (BR-EVT-09)')`), and is fully unit-tested, including boundaries and daylight-saving transitions.
- Organize by area: `attendance/`, `rsvp/`, `wellness/`, `notifications/`, `squad/`. Export through the package entrypoint.
- Results that are stored (for example `wellness_checkins.flag`) are computed here and persisted by the API, never recomputed differently in a client.
- Keep it small enough for the mobile bundle: no heavy dependencies.
