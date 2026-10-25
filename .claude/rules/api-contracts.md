---
paths:
  - "packages/contracts/**"
  - "packages/api-client/**"
  - "apps/api/src/**/*.controller.ts"
---

# API contracts (contract-first)

Spec: `docs/tech/03-api-guidelines.md`. An endpoint change starts in `packages/contracts`. See the `api-endpoint` skill for the full workflow.

## Flow

1. Zod schemas, enums and error codes in `packages/contracts/src/<context>/`.
2. The API validates with the same schemas (`@Body({ schema })` and NestJS 12's `StandardSchemaValidationPipe`) and generates the OpenAPI document from them.
3. Orval generates `packages/api-client` (typed fetch + TanStack Query hooks). A thin hand-written wrapper adds auth, `X-App-Version`, `X-Platform`, `Idempotency-Key` and problem+json mapping. See the `orval` skill.
4. CI fails on breaking changes to `v1` (NFR-MAINT-03).

## `v1` is additive-only

Old mobile versions stay in use for months. In `v1` you may add endpoints, optional request fields, response fields and enum values that clients tolerate. You may not remove or rename fields, make an optional field required, narrow a type or change a meaning. A breaking change needs a new endpoint or `/v2`.

Clients must tolerate unknown response fields and unknown enum values (render a safe fallback).

## Conventions

| Topic | Rule |
|---|---|
| Shape | REST, JSON, `camelCase` fields, plural resource nouns, base path `/v1` |
| Tenancy | Club resources under `/v1/clubs/{clubId}/…`; public, non-personal endpoints under `/v1/public/…` (`GET /v1/app-config` is the one exception); the caller's own data under `/v1/me/…` |
| IDs | UUID v7 strings |
| Time | Instants as ISO 8601 with offset; local dates as `YYYY-MM-DD`; include the club `timezone` where relevant |
| Pagination | Cursor-based: `?limit=50&cursor=…` → `{ items, nextCursor }`; default 50, max 200 |
| Filters | Explicit query params (`?categoryId=…&from=…&to=…&sort=-startsAt`); no generic query language |
| Errors | problem+json with `type`, `title`, `status`, `detail`, `code` (e.g. `RSVP_LOCKED`) and `errors[]` for validation. Clients map `code` to localized copy |
| Concurrency | `If-Match: <version>` on versioned documents → 409 on mismatch |
| Idempotency | `Idempotency-Key` header (UUID) on mutating mobile requests |
| Streaming | Server-Sent Events for AI chat and generation progress |
| Realtime | None in R1: clients refetch on focus, pull-to-refresh and relevant push |
| Webhooks | `/v1/webhooks/{provider}` with signature verification |

## Error codes

Codes are `SCREAMING_SNAKE_CASE`, stable forever, and listed in one catalog in `packages/contracts` with their HTTP status. Adding a code also adds its Spanish message in `packages/i18n` (`errors.<CODE>`).
