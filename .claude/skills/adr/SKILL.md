---
name: adr
description: Record, update or accept an architecture decision in docs/tech/adr-log.md - new ADRs, spike outcomes, accepting a Proposed ADR, superseding one, or proposing a library or approach that differs from the tech stack doc. Use whenever a technical choice is made or challenged.
argument-hint: <new | accept ADR-NNN | supersede ADR-NNN> <topic>
---

# Architecture decision record

Index: `docs/tech/adr-log.md`. Consolidated stack: `docs/tech/00-tech-stack.md`.

Statuses: **Proposed** (recommended, awaiting tech lead) · **Accepted** · **Open** (needs a spike or input) · **Superseded**.

## New ADR

1. Read the log and the tech stack doc. Confirm no existing ADR already covers the topic; if one does, update it instead.
2. Take the next number (`ADR-018`, …). Add a row to the index table: ID, title, status, decide-by.
3. Add a section in the log, in the existing format:

```markdown
## ADR-0NN · <Title>
- **Context**: the forces and constraints, citing NFRs, BRs and stories.
- **Decision**: what we chose, specifically (library, version policy, pattern).
- **Alternatives**: each option considered and why it lost.
- **Consequences**: what gets easier, what gets harder, what to watch, follow-ups.
```

4. If the decision changes a choice in `00-tech-stack.md` or `01-architecture-overview.md`, update those docs in the same PR so they don't contradict the log.

## Spike outcome

For Open ADRs with an R0 spike (tech stack § 8): record what was built, what was measured and the result in the ADR's Context, then write the Decision and set the status to Proposed (or Accepted if the tech lead has confirmed). Link the spike branch or PR.

## Accept

Set the status to Accepted in the index and the section. If the ADR needs more detail than a log section, move it to `docs/tech/adr/NNN-title.md` and keep the log row as the index entry with a link. Remove "Proposed" wording from the tech stack doc for that choice.

## Supersede

Never delete an ADR. Mark the old one **Superseded by ADR-0NN**, write the new one with a Context explaining what changed, and update every doc that referenced the old choice.

## Rules

- Never replace a library or pattern in code before its ADR says so.
- Facts about third-party services (pricing, limits, API behavior) carry the date they were checked.
- Technical decisions go here; product decisions go to `docs/product/05-open-questions.md` § 3.
