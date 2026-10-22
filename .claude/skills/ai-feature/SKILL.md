---
name: ai-feature
description: Add or change an AI capability in the API's ai module (R3) - plan generation pipeline, chat assistant tools, prompts, structured outputs, pseudonymization, usage logging, quotas and the eval gate. Use for AI- stories, any change to a system prompt, model, tool or the data sent to the Anthropic API.
argument-hint: <capability, e.g. tool get_event_availability> [story ID]
---

# AI feature

Specs: `docs/tech/04-ai-architecture.md`, `docs/features/F09-ai-coaching-assistant.md` (BR-AI-*, quality bar § 6), `docs/product/06-privacy-and-compliance.md` § 5, ADR-010. Conventions are in the `ai-assistant` rule.

Changes to the data sent to the AI provider need **2 approvals, one from the tech lead**.

## 0. Re-verify the API surface

Load the `claude-api` skill. Compare model IDs, parameters and behaviors (structured outputs, strict tools, effort, refusals and fallback, caching, compaction) against § 2 of the AI architecture doc. If anything changed, update the doc in the same PR before coding against it.

## 1. Classify the change

| Change | Where |
|---|---|
| Plan generation | Worker pipeline: context build → model call with structured output → server validation → one repair attempt → persist version (§ 3) |
| Chat tool | Tool registry in `modules/ai/tools/` (§ 4) |
| Prompt | New versioned file (`plan-system.v{n+1}.md`); never edit a shipped version |
| Model or effort per route | Config, gated by evals and a product cost decision (OQ-14) |

## 2. Data minimization (BR-AI-07)

For every field the change sends to the model, check it against the table in § 6:
- player identities → per-conversation aliases (`J-07`), created **when the tool result is produced**; the alias map is stored encrypted;
- no absence reasons, notes, contact data, birthdates or photos;
- wellness → aggregates and per-alias flags only, access-logged, and only if the requester has wellness access;
- never individual nutrition plans or `return_to_play` routines.

## 3. A new chat tool

1. Input schema in `packages/contracts/src/ai/`, converted to JSON Schema; the tool is `strict: true` with `additionalProperties: false`. Bound list sizes (`limit ≤ 20`, `days ≤ 30`).
2. Execute with the **session's** club and user, never with a club or user ID taken from model arguments. Validate the input against the schema, then authorize every ID the model passes through the policy module, exactly like an endpoint.
3. Return compact JSON with aliases. Wrap user-authored text as labelled untrusted data.
4. Tools never write. A tool that leads to a write returns a UI action card (like `offer_plan_generation`) that a person confirms.
5. Access-log health-data reads.

## 4. Model calls

- Stable content first (tools, system rules, cached catalog), volatile content last. Check cache hits in `usage.cache_read_input_tokens`.
- Set `output_config.effort` explicitly. Stream long outputs; `max_tokens` generous but capped per route.
- Check `stop_reason` before reading content; handle refusals (fallback, then "No pude responder eso").
- Bounded SDK retries, then a user-facing retry; failed generations don't consume quota; circuit breaker on sustained provider failure.
- Append responses to history unchanged.

## 5. Usage, quotas, logs

- Write an `ai_usage` row per request: tokens, cache tokens, latency, outcome, cost estimate.
- Enforce per-club quotas and per-user rate limits (BR-AI-11) before calling the model.
- Never log message content, prompts or tool results.

## 6. Evals (gate)

- Add or update scenarios in the versioned eval set: plan scenarios, chat prompts and red-team cases (medical advice, other clubs' data, injection inside exercise descriptions, off-topic, consent-less wellness).
- Run deterministic checks plus the rubric grader. The F09 § 6 targets must pass before a prompt, model or tool change ships. Report the before/after numbers in the PR.

## 7. Backend tests (mandatory)

- tool authorization: other club's IDs → not found; categories without staff role → denied;
- pseudonymization: tool results contain aliases, never names; restricted fields absent;
- validation and repair of plan drafts (invalid exercise IDs, phase order, duration ±10%);
- quota enforcement and quota not consumed on failure;
- `ai_usage` written; no content in logs.

Fake the Anthropic client at its boundary in tests; real model calls belong to the eval harness only.
