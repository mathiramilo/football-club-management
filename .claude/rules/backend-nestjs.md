---
paths:
  - "apps/api/**"
---

# Backend: NestJS modular monolith

Specs: `docs/tech/01-architecture-overview.md` § 4 and § 6, `docs/tech/03-api-guidelines.md`, ADR-004.

## Layout

```text
apps/api/src/
  main.ts                    HTTP entrypoint (never runs job handlers)
  worker.ts                  Worker entrypoint: outbox relay, pg-boss handlers, scheduler
  core/                      Framework plumbing: auth guard, policy engine, club context,
                             idempotency interceptor, problem+json filter, Prisma, pg-boss,
                             clock, logging, config
  modules/<context>/         One Nest module per bounded context:
                             identity · clubs · events · analytics · training · wellness ·
                             content · ai · notifications · media · platform
    <context>.module.ts
    <resource>.controller.ts
    <resource>.service.ts
    <resource>.repository.ts
    <resource>.serializer.ts  Role-shaped responses
    <context>.policy.ts       This context's actions for the central policy engine
    events/                   Domain events this module emits
    jobs/                     pg-boss handlers this module owns
apps/api/prisma/             schema.prisma, migrations/, seed
apps/api/test/               Integration tests (*.int.spec.ts) and test harness
```

If the scaffold (TECH-01) settles different names, follow the code and update this rule.

## Module boundaries

- A module never touches another module's tables or repositories. It calls the other module's exported service, or reacts to its domain events.
- Cross-module side effects ("membership started → add to future events") are domain events written to the **outbox in the same transaction** as the change, then handled in the worker. See the `background-job` skill.
- Pure rules live in `packages/domain`. Services orchestrate: load, call domain functions, persist, emit events.

## Request pipeline

auth guard → club context (from `:clubId`, membership verified) → policy guard (the handler's declared action) → idempotency interceptor → Zod validation (`StandardSchemaValidationPipe`) → handler → role-based serializer → problem+json exception filter. This is Nest's own order (guards, interceptors, pipes); the `nestjs` skill explains what it implies.

- **Controllers are thin**: no Prisma, no business rules. Every handler declares its action, e.g. `events.rsvp.proxy`, evaluated by the central policy module against the permission matrix (BR-ROLE-07, NFR-SEC-02). See the `authorization-policy` skill.
- **Permissions come from current memberships** loaded per request, never from token claims alone: role changes take effect immediately (BR-ROLE-08).
- **Tenancy**: every repository method takes the club context as its first argument, so an unscoped query on a tenant table can't be written. Never trust `:clubId` alone.
- A resource in another club returns **404**, not 403. Collection endpoints filter by visibility instead of returning 403.
- **Responses are shaped by role in serializers**, never in clients. Example: `rsvpReason` and `rsvpNote` only go to staff and the invitee themselves (BR-EVT-12).
- **Errors** are `application/problem+json` (RFC 9457) with a stable `code` from the catalog in `packages/contracts`. Never leak stack traces, SQL or internal messages.
- **Idempotency**: mutating mobile requests carry `Idempotency-Key`; results are stored 24 h and replayed. Required on RSVP, bulk RSVP, roll call, wellness check-ins and routine logs.
- **Optimistic locking**: events and session plans use `If-Match: <version>`; a mismatch returns 409 with the current version.
- **App versions**: unsupported `X-App-Version` returns 426 (TECH-14).

## Other rules

- Uploads never pass through the API: issue presigned URLs, then confirm (`media` module).
- Administrative and roster actions write `audit_log` with sensitive fields redacted (NFR-SEC-09).
- Logging with `nestjs-pino`: include `request_id`, `club_id`, `user_id`; redaction configured centrally. Errors to Sentry (`@sentry/nestjs`) with the same scrubbing.
- Rate limits with `@nestjs/throttler` on a Postgres-backed store (no Redis in the MVP). Stricter limits on auth, invites, nudges and AI (NFR-SEC-05).
- Configuration is a Zod-validated env schema parsed at boot; fail fast on missing values.
- Never hold a database transaction open across a call to an external provider (push, email, storage, LLM).

## NestJS structure and lifecycle

Framework mechanics (decorators, dynamic modules, the filter, the worker context, OpenAPI, Vitest setup, Nest 11 vs 12) are in the `nestjs` skill. Read the docs for the installed major first: `https://docs.nestjs.com/llms.txt`.

- Request context (actor, club, request id) lives in AsyncLocalStorage (e.g. `nestjs-cls`), not in request-scoped providers, whose scope spreads to everything that injects them. Never keep per-request state on a singleton.
- Each provider belongs to one module and is exported from it. `@Global` only for config, logging, Prisma and the job queue. Break circular imports by extracting a module or using domain events, never `forwardRef`.
- Every fire-and-forget promise has a `.catch`. Job handlers catch, report and rethrow so pg-boss retries.
- One `configureApp(app)` function applies the global prefix, pipes, filters and interceptors. Both `main.ts` and the integration-test harness use it, so tests run the production pipeline.
- `enableShutdownHooks()`: close Prisma and pg-boss on shutdown, and make the readiness endpoint return 503 while draining.
- Sentry: `instrument.ts` is imported first, `SentryModule` comes from `@sentry/nestjs/setup`, and the problem+json filter is decorated with `@SentryExceptionCaptured()` so unexpected errors still reach Sentry.
- Behind the hosting proxy, the throttler's `getTracker` reads the client IP from the trusted proxy header. Health endpoints use `@SkipThrottle()`.
