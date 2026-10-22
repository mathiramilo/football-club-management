# Working Agreements

> Status: **Draft v0.1** · Owner: Product + Tech Lead · Last updated: 2026-10-22

## 1. Workflow

1. **Discovery**: the product owner writes or updates the feature spec (`docs/features/…`), including business rules, stories and acceptance criteria. Open points go to [Open questions](../product/05-open-questions.md).
2. **Refinement** (weekly, ≈ 1 h): the team reviews the next stories against the Definition of Ready, splits XL items and re-estimates.
3. **Delivery**: one ticket per story, or per platform slice (`EVT-08-api`). Small PRs.
4. **Review and acceptance**: the PR is reviewed, the change is deployed to staging, and the product owner checks the acceptance criteria on staging (mobile preview build or OTA channel).
5. **Release**: per [Architecture § 7](../tech/01-architecture-overview.md#7-environments-and-delivery).

## 2. Definition of Ready

A story can enter a sprint when:
- [ ] It has an ID, a user-story statement and testable acceptance criteria in its feature spec.
- [ ] The business rules it depends on are written (BR-xxx) and the open questions it depends on are answered or explicitly defaulted.
- [ ] Permissions are covered by the [permission matrix](../product/02-personas-and-roles.md#4-permission-matrix).
- [ ] UX is available: designs for new screens, or an explicit "reuse pattern X".
- [ ] Copy (es) is available for new user-facing strings, notifications and emails.
- [ ] API or data-model impact is identified (new endpoints, migrations).
- [ ] Size ≤ L (XL items are split).
- [ ] Telemetry events are listed (from the spec).

## 3. Definition of Done

- [ ] Acceptance criteria are met and verified by the product owner on staging (iOS, Android and web where applicable).
- [ ] **Backend tests** cover the new behavior: domain rules, endpoint integration and authorization, including cross-tenant and role negatives (NFR-MAINT-01, NFR-SEC-03).
- [ ] No frontend unit or component tests are added (team standard, NFR-MAINT-02). Critical flows are covered by QA end-to-end suites when available.
- [ ] Lint, typecheck and tests are green in CI. No new critical vulnerabilities.
- [ ] The API contract is updated (`packages/contracts`) with no breaking change to `v1`.
- [ ] Strings are externalized (es). No hard-coded copy.
- [ ] Telemetry events are implemented with no personal free text or health data.
- [ ] Observability: errors are reported, and logs are structured without sensitive fields.
- [ ] Accessibility checks pass: labels, contrast, dynamic type, and color is never the only signal.
- [ ] Docs are updated: if behavior differs from the spec, the spec is updated in the same PR (NFR-MAINT-06).
- [ ] Feature-flagged if it must not reach all clubs yet.

## 4. Git and pull requests

- **Branches**: `feat/EVT-08-rsvp-in-app`, `fix/EVT-15-offline-sync`, `chore/TECH-07-outbox`.
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/) (`feat(events): add RSVP endpoint (EVT-08)`).
- **PRs**: small and reviewable (target < 400 changed lines excluding generated code). Every PR has a description (what, why, how to test) and links its ticket or story ID. Screenshots or recordings for UI changes.
- **Reviews**: at least 1 approval. Changes to the authorization policy, health-data access or AI data exposure need 2 approvals, one of them from the tech lead.
- **Main** is always deployable (to staging). Production deploys are tagged releases.

## 5. Story template (for new stories in specs)

```markdown
### XXX-NN · <Short title>
**Release:** R? · **Priority:** Must|Should|Could · **Size:** S|M|L|XL · **Platforms:** Mobile, Web, Server

As a <role>, I want <capability> so that <outcome>.

**Acceptance criteria**
- Given <context>, when <action>, then <observable result>.
- …
```

Keep the metadata line format exact: the backlog index is generated from it.

## 6. Bugs and severity

| Severity | Definition | Response |
|---|---|---|
| P1 | Data leak or permission bypass; data loss; RSVP, roll call or sign-in broken for many users; health-data exposure | Hotfix immediately; incident process ([Privacy § 11](../product/06-privacy-and-compliance.md#11-security-incidents)) |
| P2 | A core flow is degraded for some users; wrong metrics; notifications not sent | Fix within the current sprint |
| P3 | Minor functional issue with a workaround | Prioritize in the backlog |
| P4 | Cosmetic | Batch |

## 7. Documentation maintenance

- `docs/` is the single source of truth for product behavior. Notion (or any other tool) may link here but must not fork the specs.
- Status headers (`Draft`, `Proposed`, `Accepted`) and "Last updated" dates are kept current.
- Decisions go to [Open questions § 3](../product/05-open-questions.md#3-decided) (product) or the [ADR log](../tech/adr-log.md) (technical).
