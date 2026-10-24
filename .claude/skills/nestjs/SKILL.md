---
name: nestjs
description: NestJS framework reference for apps/api - the real request lifecycle and enhancer order, custom decorators and metadata, providers and injection tokens, dynamic modules, the problem+json exception filter, lifecycle hooks and shutdown, the worker application context, OpenAPI generation, Express 5 routing, testing modules with Vitest, and NestJS 11 vs 12 differences. Use when writing or debugging NestJS plumbing (guards, interceptors, pipes, filters, modules, providers, decorators, bootstrap, the test harness) or when Nest behaves unexpectedly. For a whole endpoint use api-endpoint; for permissions use authorization-policy; for jobs use background-job.
---

# NestJS

Written for this project from the NestJS docs (MIT) and ideas from amirtaherkhani's nestjs-skills, mattiavalerio's nestjs-architecture, ECC's nestjs-patterns (all MIT) and Kadajett's nestjs-best-practices (ideas only). See `.claude/skills/THIRD_PARTY.md`. The `backend-nestjs` rule holds the architecture (modules, tenancy, pipeline, request context); this skill holds the framework mechanics behind it.

## 0. Version first

- Read the `@nestjs/core` major in `apps/api/package.json`, then the docs for it: `https://docs.nestjs.com/llms.txt` lists every chapter, and each one is available as `.md`. The installed version wins over memory.
- **NestJS 12** (August 2026): core packages are ESM-only (a CommonJS app still works through `require(esm)` on Node ≥ 20.19 or ≥ 22.12; the CLI needs Node ≥ 22.22.3); `nest new` offers ESM with Vitest; native Standard Schema validation (`@Body({ schema })` + `StandardSchemaValidationPipe`) and serialization (`StandardSchemaSerializerInterceptor`); `errorCode` on `HttpException`; lifecycle hooks ordered by module hierarchy; `@Optional()` no longer inherited; opt-in route conflict checks.
- **Decided (ADR-004, 2026-10-23):** NestJS 12 as ESM, with native Standard Schema for validation, serialization and OpenAPI. Never add `nestjs-zod`: its 5.x line supports Nest 10–11 only.
- Ignore the docs' pointers to `@nestjs/observe`: Sentry and Pino cover observability here.

## 1. The request lifecycle

Nest's real order, which our pipeline follows:

| Step | Order inside the step | Ours |
|---|---|---|
| Middleware | global, then module-bound | request id and CLS context |
| Guards | global → controller → route, in binding order | auth → club context → policy (`@Can`) |
| Interceptors (in) | global → controller → route | idempotency (`@RequiresIdempotencyKey`) |
| Pipes | global → controller → route → parameter; parameters last to first | Zod validation |
| Handler | | thin controller → service |
| Interceptors (out) | route → controller → global | role-shaped serializer |
| Exception filters | route → controller → global; only one catches | problem+json filter |

Consequences:
- Guards run before validation. A guard that needs a body field reads it raw and treats it as untrusted, or the check moves into the service.
- The idempotency interceptor runs before validation, so a replayed request never reaches the pipe. Exceptions from pipes and handlers flow back through interceptors (`catchError`): store only the outcomes the idempotency spec says to store.
- Errors thrown in middleware reach only global filters.
- An enhancer with dependencies is never built with `new`: resolve it from the container in `configureApp` (`app.get(PolicyGuard)`) or register it as an `APP_GUARD` / `APP_INTERCEPTOR` / `APP_PIPE` / `APP_FILTER` provider. `APP_*` providers run in registration order.

## 2. Decorators and metadata

```ts
export const Can = Reflector.createDecorator<PolicyAction>();

@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly policy: PolicyService) {}

  canActivate(context: ExecutionContext) {
    const action = this.reflector.get(Can, context.getHandler());
    return this.policy.authorize(action);
  }
}
```

- Use `getAllAndOverride` when a handler decorator overrides a class one (`@Public()`).
- Compose repeated stacks with `applyDecorators` (`@Can` + `@ApiOperation` + error responses).
- `@CurrentClubActor()` and `@CurrentActor()` are `createParamDecorator`s that read the CLS context set by the guards, never the raw request.
- Fail at boot, not at request time: a startup check with `DiscoveryService` (`DiscoveryModule`) walks every controller method and throws if a route has neither `@Can` nor `@Public` (NFR-SEC-02).

## 3. Providers and injection

- Singleton scope only. Per-request data lives in `ClsService` (`backend-nestjs` rule).
- External providers sit behind injection tokens so tests can swap them: clock, push, email, storage, video, LLM. Use a `Symbol` or an abstract class as the token, never a string.
- `useFactory` with `inject` for providers built from config; an async factory for anything that must be ready at boot.
- Constructor injection only. `ModuleRef.get` is not a service locator, and `forwardRef` is not a fix for a cycle.
- Nest 12: a subclass that relies on `@Optional()` declares its own constructor and repeats the marker.

## 4. Dynamic modules

- Modules that take options (Prisma, pg-boss, config) are built with `ConfigurableModuleBuilder`, which generates `forRoot` / `forRootAsync` and `MODULE_OPTIONS_TOKEN`.
- Config: the Zod env schema is parsed once at boot. `@nestjs/config` 12 accepts it as `validationSchema`; otherwise pass `validate: (env) => envSchema.parse(env)`.

## 5. The exception filter

One global `@Catch()` filter, decorated with `@SentryExceptionCaptured()`, replies through `HttpAdapterHost` with `application/problem+json`:

| Thrown | Status | `code` |
|---|---|---|
| `DomainError` | its catalog status | its catalog code |
| Validation failure (Zod) | 400 | the catalog's validation code, with `errors[]` per field |
| `HttpException` | its status | `errorCode` if set (Nest 12), else a generic code by status |
| Prisma `P2002` / `P2025` | 409 / 404 | the catalog code for the case |
| Anything else | 500 | generic; `detail` never carries the original message |

- Check `host.getType()`: only `http` writes a response.
- Codes come from the catalog in `packages/contracts`. Never invent one in the filter.

## 6. Lifecycle, shutdown and the worker

- Hooks: `onModuleInit` → `onApplicationBootstrap`; on shutdown `onModuleDestroy` → `beforeApplicationShutdown(signal)` → `onApplicationShutdown`. They only run on signals after `enableShutdownHooks()`. In Nest 12 the order follows the module hierarchy; never depend on the order between sibling providers.
- `worker.ts` uses `NestFactory.createApplicationContext(WorkerModule)`. **No HTTP pipeline runs there**: no guards, pipes, interceptors or filters. Each job handler wraps its work in `cls.run(…)` with the actor and club it acts for, calls repositories with an explicit club context, authorizes explicitly when it acts on behalf of a user, and reports to Sentry before rethrowing.

## 7. OpenAPI

- The document comes from the same Zod schemas as validation, through `@nestjs/swagger`, which converts Zod 4.2+ schemas itself (`~standard.jsonSchema`, `openapi-3.0` target). Follow the installed version's docs.
- `core/contract/create-openapi-document.ts` builds it. Its `operationIdFactory` makes IDs `<controller><Method>` (`eventsListInvitees`): they become Orval hook names, and renaming one breaks clients (`orval` skill).
- One `@ApiTags` per module; it becomes an Orval `tags-split` folder.
- problem+json errors are documented once, as a global `default` response. `@Public()` also marks the operation so the document gives it `security: []`. `extensibleEnum` values move from `enum` to `x-extensible-enum`.
- `src/write-openapi.ts` writes the document from `NestFactory.create(AppModule, { preview: true })`: preview mode resolves the module graph without running any provider factory, so no database or secret is needed. It calls `applyGlobalPrefix`, not `configureApp`, because mounting Better Auth needs a real instance.
- `@nestjs/swagger` documents a single `@Query('name', { schema })` as required even when the schema is optional. Use one object schema for the query.

## 8. Routing

- Express 5 path syntax (Nest 11+): wildcards are named (`*splat`, `{*splat}`), optional segments are `{/:param}`.
- Declare static routes before parameter routes (`me` before `:id`), or turn on Nest 12's `routeConflictPolicy`.
- `trust proxy` is set on the Express instance (`NestExpressApplication`), so `req.ip` and the throttler see the client IP.
- `NestFactory.create(AppModule, { rawBody: true })` for webhook signature checks (`/v1/webhooks/{provider}`); read `req.rawBody`.

## 9. Testing

Rules in `backend-testing`. The Nest-specific parts:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    globalSetup: './test/global-setup.ts',
  },
});
```

No SWC plugin: Vite 8's Oxc transform emits decorator metadata from `tsconfig.json`.

```ts
const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(PUSH_SENDER)
  .useValue(fakePush)
  .compile();
const app = moduleRef.createNestApplication();
configureApp(app);
await app.init();
```

- `vi.fn()` and `vi.spyOn`; no Jest globals or `@nestjs/testing` Jest helpers.
- Generate with `nest g … --no-spec`; write real tests instead of the CLI's stubs.
- Test guards, interceptors and filters through HTTP, not by hand-building an `ExecutionContext`.

## Never

class-validator or class-transformer DTOs · TypeORM · Jest · BullMQ, Redis or Kafka · `EventEmitter2` for cross-module events (use the outbox) · request-scoped providers · `forwardRef` · `ModuleRef` as a service locator · per-request state on a singleton.
