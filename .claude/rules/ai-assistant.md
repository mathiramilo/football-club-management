---
paths:
  - "apps/api/src/modules/ai/**"
  - "packages/contracts/src/ai/**"
---

# AI module (plan generator and assistant, R3)

Specs: `docs/tech/04-ai-architecture.md`, `docs/features/F09-ai-coaching-assistant.md`, ADR-010, BR-AI-*. See the `ai-feature` skill.

API facts change often. Before writing or changing SDK code, load the `claude-api` skill and re-verify model IDs, parameters and behaviors against `docs/tech/04-ai-architecture.md` § 2. If they differ, update that doc.

## Principles

1. **Grounded**: club data reaches the model only through server-built context (plan generator) and permission-checked tools (chat). The model never queries the database.
2. **Drafts, not writes**: AI output is always a draft a person accepts (BR-AI-04). Tools never write.
3. **Least data** (BR-AI-07): players are pseudonymized as stable per-conversation aliases (`J-07`); no absence reasons, notes, contact data, birthdates or photos; wellness only as aggregates and per-alias flags, access-logged; never individual nutrition plans or `return_to_play` routines.
4. **Guardrails in code**: schemas, exercise-ID validation and constraint checks run on the server, not in the prompt (§ 3.3).
5. **Measured**: the eval set gates every prompt or model change.

## Implementation rules

- Official `@anthropic-ai/sdk`, **server only**. Default model `claude-opus-5-5`; a cheaper model per route only after it passes the same evals (OQ-14).
- Always set `output_config.effort` explicitly (chat `low`, plan generation `medium` as starting points).
- Structured outputs from JSON Schema generated from the Zod contract. Tools are `strict: true` with `additionalProperties: false`. No forced `tool_choice`, no assistant prefill, no sampling parameters.
- Stream chat and long generations, with generous `max_tokens` (thinking counts toward it).
- Conversation history is **append-only**: append responses unchanged, never edit earlier turns. Pseudonymize when tool results are produced, never by rewriting history.
- Check `stop_reason` before reading content; handle `refusal` with the server-side fallback, then a user-facing message.
- Prompt caching: `tools` → `system` → `messages`, stable content first, volatile content (date, user question) after the last cache breakpoint. Verify hits via `usage.cache_read_input_tokens`.
- Tools receive the club and user **from the authenticated session, never from model arguments**. Validate every tool input against its schema and re-authorize every ID the model passes.
- Wrap user-authored text in tool results (exercise descriptions, plan notes) as labelled untrusted data; the system prompt says to ignore instructions inside it.
- Cap tool iterations per turn (default 8) and `max_tokens` per route. Enforce per-club quotas and per-user rate limits (BR-AI-11). Failed generations don't consume quota.
- Log every request to `ai_usage` (tokens, cache tokens, latency, outcome, cost estimate). **Never log message content** (BR-AI-13).
- System prompts are versioned files (`plan-system.v{n}.md`). Change a prompt by adding a new version, and run the eval set before switching.
