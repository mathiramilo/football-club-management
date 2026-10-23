<!--
Changes to the authorization policy, health-data access or data sent to the AI provider need
2 approvals, one from the tech lead. If this PR has any, start the description with:
"⚠️ Needs 2 approvals, one from the tech lead."
-->

## <STORY-ID> · <title>

Spec: docs/features/<file>.md#<anchor>

### What

### Why

### How to test

### Screenshots (UI changes)

<!-- Synthetic clubs and people only. Never real player data, even from staging. -->

### Notes

- Docs updated:
- Requires 2 approvals (policy / health data / AI data): yes|no

### Definition of Done

<!-- docs/delivery/working-agreements.md § 3. Mark n/a items done and say why in Notes. -->

- [ ] Acceptance criteria met
- [ ] Backend tests cover the new behavior, including cross-tenant and role negatives
- [ ] No frontend unit or component tests added
- [ ] Contract updated in `packages/contracts`, no breaking change to `v1`
- [ ] Strings externalized (es)
- [ ] Telemetry and logs carry no free text, health data or tokens
- [ ] Accessibility checked (labels, contrast, dynamic type, not color alone)
- [ ] Spec updated if behavior differs from it
- [ ] Feature-flagged if it must not reach every club yet
