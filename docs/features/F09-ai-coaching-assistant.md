# F09 — AI Coaching Assistant

> Status: **Draft v0.1** · Release: **R3** · Owner: Product · Last updated: 2026-10-22
> Source: Notion "AI integration" · Related: [AI architecture](../tech/04-ai-architecture.md) · [F05](F05-exercise-library.md) · [F06](F06-session-planning.md) · [Privacy](../product/06-privacy-and-compliance.md) · OQ-04, OQ-14

## 1. Goal

Give staff an assistant that knows **their club**: its exercise library, recent sessions, attendance, upcoming events and squad state. It:
- answers coaching questions with that context, and
- drafts complete practice plans that the coach reviews and saves.

The win is **time**. Planning a good session should take 5 minutes instead of 45.

From the Notion brief:
- Coaches and DTs can chat with a chatbot to ask questions and get advice for planning future practices.
- Coaches and DTs can ask the AI to plan practices based on the exercises they uploaded.

Refinements made in this document:
1. **Two capabilities, built in this order**:
   1. A **plan generator**: structured input, structured output, and the clearest value.
   2. A **chat assistant**: open-ended, grounded through tools.
2. **Grounding over general knowledge.** Plans use exercises from the club's library by default. New exercises can only be **suggestions**, clearly marked as such and saveable as drafts. Without this, the AI would just be a generic chatbot, which coaches can already get elsewhere.
3. **Human in the loop.** The AI never writes club data directly. It produces **drafts**; staff decide.
4. **Permission-aware context.** The AI sees only what the requesting user may see, enforced by the tools on the server.
5. **Health data minimization.** Wellness data reaches the model only as aggregates and pseudonymized flags (see [AI architecture § 6](../tech/04-ai-architecture.md#6-privacy-and-data-minimization)).
6. **No medical advice.** Injury and pain questions get general safety guidance and a referral to a professional.
7. **Cost control.** Monthly quotas per club, per-user rate limits and usage visibility (OQ-04, OQ-14).
8. **Dependencies.** Plan generation needs a populated library ([F05](F05-exercise-library.md), starter library) and the plan structure ([F06](F06-session-planning.md)). That is why AI ships in R3.

## 2. Scope

| In (R3) | Later |
|---|---|
| Plan generator from parameters, optionally linked to a practice | Weekly AI digest for staff (attendance + wellness summary) |
| Refining a generated plan through instructions | Microcycle / multi-week planning |
| Chat assistant with club-context tools | Voice input at the field |
| Conversation history | Player-facing assistant (routines, nutrition Q&A) |
| Feedback (thumbs up/down with reason) | Video analysis |
| Club quotas, usage view, AI on/off per club | Automatic metadata from video |
| Saving AI-suggested new exercises as drafts | |

## 3. Business rules

| ID | Rule |
|---|---|
| BR-AI-01 | Only users with a **staff role** (DT or Coach) in at least one category can use the AI, and only in the context of their categories. Club Admins without a staff role cannot ([Roles § 4.6](../product/02-personas-and-roles.md#46-ai-assistant)). |
| BR-AI-02 | AI can be **disabled per club** by the Owner or a Club Admin. When disabled, AI entry points are hidden and no club data is sent to the model provider. |
| BR-AI-03 | Every data access by the AI goes through **server-side tools** that apply the requesting user's permissions ([Roles](../product/02-personas-and-roles.md)). The model never receives data the user could not see in the UI. |
| BR-AI-04 | The AI **never writes** club data on its own. It produces **drafts** (session plans, exercise suggestions) that staff open, edit and save explicitly. |
| BR-AI-05 | Generated plans use **library exercises** whenever possible, referenced by ID. Suggested new exercises are allowed only as clearly marked "sugerido por IA" items, at most 2 per plan by default. The server validates every reference; unknown or inaccessible IDs are rejected and trigger one automatic repair attempt. |
| BR-AI-06 | Generated plans must fit the requested duration within ±10%, follow block order (warm-up → main → cool-down) and respect the stated constraints: number of players, goalkeepers, equipment and space. The server checks these rules and shows warnings for any violation that remains. |
| BR-AI-07 | **Player identities** in tool results and generated context are **pseudonymized**: names are replaced by stable per-conversation aliases on the server and restored in the UI. **Wellness data** is exposed only as aggregates (average load, number per flag) and per-alias flags. Free-text wellness notes, absence reasons, individual nutrition plans and `return_to_play` routines are never sent (BR-CONT-07). See [AI architecture § 6](../tech/04-ai-architecture.md#6-privacy-and-data-minimization). |
| BR-AI-08 | Medical and injury questions get general, conservative information plus a recommendation to consult a doctor or physiotherapist. The AI never diagnoses and never prescribes treatment or medication. |
| BR-AI-09 | Responses are in the user's language (default Spanish, Río de la Plata variant), using local football terminology from the [Glossary](../product/03-glossary.md). |
| BR-AI-10 | Every AI output is labelled "Generado con IA" with "Revisá antes de usar". Plans list the library exercises used, with links. |
| BR-AI-11 | **Quotas**: each club has a monthly AI allowance (plan tier, OQ-04). There is also a per-user rate limit (default 20 requests per 10 minutes). When the quota is exhausted, AI features show a clear message and the rest of the product keeps working. |
| BR-AI-12 | Conversations are stored per user, are private to that user, and are deleted after 12 months or when the user deletes them or their account. Plan generations are kept with the session plan they produced. |
| BR-AI-13 | Every model call is logged for cost and quality: club, user, feature, model, input/output/cache tokens, latency and outcome. Message content is **not** copied into general application logs. |
| BR-AI-14 | Off-topic requests (unrelated to football, coaching, training or club management) are politely declined. |

## 4. Plan generator — inputs and outputs

**Inputs** (form, pre-filled from the linked practice when there is one):

| Input | Pre-fill source | Required |
|---|---|---|
| Category | practice | ✅ |
| Date and duration | practice | ✅ |
| Objectives / focus (free text and chips: e.g. *presión tras pérdida*, *definición*, *salida desde el fondo*) | – | ✅ |
| Expected players and goalkeepers | current RSVPs (`going`), editable | ✅ |
| Available equipment and space | category defaults / last used | – |
| Desired intensity (low / medium / high) | derived from the match calendar (e.g. day before match → low), editable | – |
| Context toggles: consider next match, squad wellness, recent sessions (avoid repetition) | on | – |
| Extra instructions | – | – |

**Output**: a draft session plan in the [F06](F06-session-planning.md) structure:
- objectives,
- blocks with items, each holding an exercise ID or a suggested exercise, duration, structure, groups and player notes,
- a short **rationale** per block, and
- **warnings** (e.g. "Solo hay 1 arquero; se adaptó el ejercicio 3").

## 5. User stories

### AI-01 · Generate a practice plan
**Release:** R3 · **Priority:** Must · **Size:** XL (split: form & context, generation & validation, draft UI) · **Platforms:** Web, Mobile

As a DT or *profe*, I want the app to draft a practice plan from my objectives, my players and my library so that I start from a good proposal instead of a blank page.

**Acceptance criteria**
- From a practice ("Planificar con IA") or from the AI section, the form in § 4 opens pre-filled.
- Progress is visible while the plan is generated ("Armando el plan…"). p95 time to a complete draft is ≤ 60 s. If it takes longer, the user can leave the screen and gets N-16 when the draft is ready.
- The draft opens in the plan builder ([F06](F06-session-planning.md)) in "Borrador IA" mode, with rationale per block, warnings, exercise links, and "sugerido" badges on new exercises (BR-AI-05, BR-AI-06, BR-AI-10).
- Nothing is saved to the practice until I press "Usar este plan" (BR-AI-04).

### AI-02 · Refine a generated plan
**Release:** R3 · **Priority:** Must · **Size:** M · **Platforms:** Web, Mobile

As staff, I want to ask for changes ("hacelo más corto", "cambiá el rondo por algo con arcos") so that the draft fits exactly what I need.

**Acceptance criteria**
- A refinement input in "Borrador IA" mode produces a new draft version. Up to 5 versions per generation are kept, and I can switch between them.
- Manual edits to the draft are kept as context when refining.

### AI-03 · Save the plan and suggested exercises
**Release:** R3 · **Priority:** Must · **Size:** S · **Platforms:** Web, Mobile

As staff, I want to accept the plan and keep any good new exercise ideas.

**Acceptance criteria**
- "Usar este plan" saves it as the practice's session plan (BR-PLAN-12). If the practice already has a plan, I must confirm replacing it.
- Suggested exercises can be saved to the library as **drafts** with source `ai_suggested`, pre-filled with the AI's description and metadata, for staff to review.

### AI-04 · Chat with the assistant
**Release:** R3 · **Priority:** Must · **Size:** L · **Platforms:** Web, Mobile

As a DT, I want to ask questions such as "¿qué trabajamos las últimas 3 semanas?", "¿quiénes vienen faltando?" or "ideas para trabajar transiciones con 14 jugadores" and get answers based on my club's data.

**Acceptance criteria**
- Responses stream as they are generated, in Spanish by default (BR-AI-09).
- The assistant uses tools to read data (see [AI architecture § 4](../tech/04-ai-architecture.md#4-tools-chat-assistant)). The UI shows a discreet "Consultó: asistencia de Primera (últimas 8 semanas)" note for transparency.
- Answers that reference exercises or players show tappable chips that open the exercise or player (pseudonymized references are restored to names in the UI, BR-AI-07).
- When a question calls for a plan, the assistant offers "Armar un plan" and opens the generator pre-filled (AI-01) instead of writing a plan in chat.
- Medical, off-topic and missing-consent cases follow BR-AI-08, BR-AI-14 and BR-WELL-12: tools return "sin consentimiento" with no data ([F07 § 6](F07-player-wellness.md#6-edge-cases)).

### AI-05 · Conversation history
**Release:** R3 · **Priority:** Should · **Size:** S · **Platforms:** Web, Mobile

As staff, I want to return to previous conversations so that I can continue where I left off.

**Acceptance criteria**
- Conversations are listed by recency, with automatic titles that can be renamed and deleted (BR-AI-12).
- Long conversations stay usable: older context is summarized automatically, without errors (see [AI architecture](../tech/04-ai-architecture.md)).

### AI-06 · Give feedback on AI output
**Release:** R3 · **Priority:** Must · **Size:** S · **Platforms:** Web, Mobile

As staff, I want to rate a plan or answer so that the product improves.

**Acceptance criteria**
- 👍 / 👎 on every answer and draft. 👎 asks for a reason (*No usó mis ejercicios*, *No respeta los jugadores o materiales*, *Muy genérico*, *Error en los datos*, *Otro*) and an optional comment.
- Feedback is stored with the generation record and reviewed in the evaluation process ([AI architecture § 8](../tech/04-ai-architecture.md#8-quality-and-evaluation)).

### AI-07 · Suggested prompts
**Release:** R3 · **Priority:** Should · **Size:** S · **Platforms:** Web, Mobile

As a first-time user, I want examples of what to ask so that I discover what the assistant can do.

**Acceptance criteria**
- An empty conversation shows 4 contextual suggestions based on my data, e.g. "Planificá la práctica del martes" when the next practice has no plan, or "¿Quiénes tienen alertas físicas?" when wellness is enabled.

### AI-08 · Quotas and usage visibility
**Release:** R3 · **Priority:** Must · **Size:** M · **Platforms:** Web, Server

As a Club Admin, I want to see how much AI the club uses so that we stay within our plan.

**Acceptance criteria**
- Club settings → IA shows usage this month (plans generated, messages), the remaining allowance, and top users by count only (no content).
- Quotas and rate limits are enforced per BR-AI-11. At 80% of the quota, Club Admins see a notice.

### AI-09 · Enable or disable AI for the club
**Release:** R3 · **Priority:** Must · **Size:** S · **Platforms:** Web

As a Club Admin, I want to decide whether the club uses AI so that we stay in control of our data.

**Acceptance criteria**
- A toggle with an explanation of what data is sent and to whom (model provider), following BR-AI-02. AI is enabled by default for new clubs (OQ-14).
- The privacy policy and the in-app explanation name the AI provider as a sub-processor ([Privacy](../product/06-privacy-and-compliance.md)).

## 6. Quality bar (acceptance for launch)

AI features ship only when the evaluation set ([AI architecture § 8](../tech/04-ai-architecture.md#8-quality-and-evaluation)) meets the following:

| Criterion | Target |
|---|---|
| Valid structure (schema-valid, block order) | 100% |
| Only valid exercise references (after repair) | 100% |
| Duration within ±10% | ≥ 95% |
| Respects players, goalkeepers and equipment constraints | ≥ 90% |
| Coach-rated "usable with minor edits" (pilot coaches, 1–5 scale ≥ 4) | ≥ 70% |
| Medical red-team prompts handled per BR-AI-08 | 100% |
| Cross-tenant / permission red-team prompts leak no data | 100% |

## 7. Edge cases

| Case | Expected behavior |
|---|---|
| Library has fewer than 15 active exercises | The generator warns "Tu biblioteca tiene pocos ejercicios; el plan incluirá más sugerencias", allows up to 5 suggested exercises and offers the starter library. |
| No RSVPs yet for the practice | Expected players defaults to the category's average attendance over the last 8 events, editable. |
| Provider outage or timeout | A friendly error with retry. The quota is not consumed for failed generations. The rest of the app is unaffected. |
| The model refuses or flags a request | Handled per [AI architecture § 7](../tech/04-ai-architecture.md#7-reliability-safety-and-refusals). The user sees a neutral "No pude responder eso" message. |
| A user asks about a player outside their categories | The tool returns "sin acceso", and the assistant says so without revealing whether the player exists. |
| Prompt injection inside exercise descriptions | Tool results are treated as data, never as instructions. Covered by the red-team set. |

## 8. Telemetry

`ai_plan_requested {has_event, players, duration}`, `ai_plan_generated {latency_ms, suggested_count, warnings, repaired}`, `ai_plan_refined`, `ai_plan_accepted {edits_before_accept}`, `ai_chat_message_sent {tools_used}`, `ai_feedback {rating, reason}`, `ai_quota_reached`. AI costs are tracked in the usage log (BR-AI-13), not in product telemetry.

## 9. Open questions

- **OQ-04** Which plan tiers include AI, and how big are the quotas?
- **OQ-14** Model and cost trade-offs per feature; AI on by default; acceptable data sharing with the model provider.
