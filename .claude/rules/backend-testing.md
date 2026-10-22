---
paths:
  - "apps/api/**/*.spec.ts"
  - "apps/api/test/**"
  - "packages/domain/**/*.spec.ts"
  - "packages/contracts/**/*.spec.ts"
---

# Backend tests

Mandatory for new backend behavior (NFR-MAINT-01, NFR-SEC-03). Stack: **Vitest + Supertest + Testcontainers** (real Postgres, never mocks of the database).

## What to test

| Layer | Test | Location |
|---|---|---|
| `packages/domain` rules | Unit tests, table-driven, edge cases from the spec (deadline boundaries, DST changes, quiet-hour edges) | `*.spec.ts` next to the code |
| Services with tricky logic | Unit tests with real domain functions; fake only external providers | `*.spec.ts` next to the code |
| Endpoints | Integration through HTTP (Supertest) against Testcontainers Postgres | `apps/api/test/<context>/*.int.spec.ts` |
| Authorization | Every role in the permission matrix, allowed and denied, for each action | Same integration suite |
| Tenant isolation | A member of club A gets 404 on club B's resources, for every endpoint | Same integration suite |
| Idempotency | Repeating a request with the same `Idempotency-Key` replays the response and writes once | Same integration suite |
| Jobs | Scheduling (time, quiet hours, caps, jitter bounds), relevance re-check, idempotent re-run | `apps/api/test/<context>/*.int.spec.ts` |

## Conventions

- Name `describe` blocks after the endpoint or rule and include the ID: `describe('PUT /v1/clubs/:clubId/events/:eventId/rsvp (EVT-08)')`, `it('rejects changes after the deadline on a locked event (BR-EVT-09)')`.
- Each acceptance criterion of the story maps to at least one test.
- Build data with the shared factories and seed helpers (synthetic clubs and people only). Each test creates what it needs; never depend on another test's data or order.
- Control time through the injected clock. Never `sleep`.
- Fake external providers (Expo Push, email, storage, video, Anthropic) at their client boundary. Never call real providers from tests.
- Assert problem+json `code`, not message text.
- NestJS DI needs decorator metadata, which Vitest's default transform doesn't emit: the Vitest config uses SWC (`unplugin-swc`). Don't remove it.
- Start the Testcontainers Postgres once in Vitest `globalSetup` and hand its URL to tests with `provide` / `inject`. Isolate data per test (each test creates its own club).
- Build the test app with the same `configureApp(app)` as `main.ts`, so tests exercise the real pipes, filters and interceptors.
- Close what you open: `app.close()`, Prisma `$disconnect()`, pg-boss `stop()`, container `stop()`. For a hanging run, isolate the file, then the test, and look for open handles (e.g. `why-is-node-running`).
- Flaky tests come from shared state, real time or fixed ports: use the injected clock, per-test data and random ports.
