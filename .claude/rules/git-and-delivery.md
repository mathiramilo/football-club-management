# Git, PRs and Definition of Done

Full text: `docs/delivery/working-agreements.md`.

## Git

- Branches: `feat/EVT-08-rsvp-in-app`, `fix/EVT-15-offline-sync`, `chore/TECH-07-outbox`.
- Conventional Commits (enforced by commitlint). Scope is the backend module or the app/package touched; the story ID goes at the end of the subject:
  `feat(events): add RSVP endpoint (EVT-08)` · `fix(mobile): resume paused RSVPs after restart (EVT-15)` · `chore(contracts): add RSVP_LOCKED error code (EVT-09)`.
- Per-platform tickets keep the story ID with a suffix: `EVT-08-api`, `EVT-08-mobile`.
- `main` is always deployable to staging. Never commit, push or open a PR unless asked.

## Pull requests

- Small: target < 400 changed lines, excluding generated code. Split by layer or platform if bigger.
- Description: what, why, how to test, and the story ID with a link to its spec. Screenshots or recordings for UI changes.
- Changes to the authorization policy, health-data access or data sent to the AI provider need **2 approvals, one from the tech lead**. Say so at the top of the PR description.

## Tests

- **Backend tests are mandatory** for new behavior: unit tests for `packages/domain`, integration tests for endpoints against real Postgres (including authorization and cross-tenant negatives), and job tests for scheduling rules (NFR-MAINT-01, NFR-SEC-03).
- **No frontend unit or component tests** in `apps/web` or `apps/mobile` (NFR-MAINT-02). Never add them unasked and never request them in a review. QA's Playwright (web) and Maestro (mobile) end-to-end suites are separate and QA-owned.

## Definition of Done (summary)

Acceptance criteria met · backend tests cover the new behavior · lint, typecheck and tests green · contract updated in `packages/contracts` with no breaking change to `v1` · strings externalized (es) · telemetry without free text or health data · structured logs without sensitive fields · accessibility checked · spec updated if behavior differs · feature-flagged if it must not reach every club yet.

Run the `definition-of-done` skill before calling work finished.
