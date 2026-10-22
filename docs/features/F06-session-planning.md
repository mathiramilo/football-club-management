# F06 — Session Planning

> Status: **Draft v0.1** · Release: **R2** · Owner: Product · Last updated: 2026-10-22
> Source: Notion "Listado de ejercicios" (assign exercises to practices) · Related: [F03](F03-events-and-attendance.md) · [F05](F05-exercise-library.md) · [F09](F09-ai-coaching-assistant.md)

## 1. Goal

Let staff build a practice plan from the exercise library in minutes, and let players see it **before** practice, so that field time goes to playing instead of explaining.

The Notion brief says only "indicate which exercises are included in each practice". This document turns that into a structured **session plan** with:
- **blocks** (warm-up, main part, cool-down),
- **per-item overrides** (duration, sets, notes),
- **templates**, and
- **controlled publishing** to players. Some coaches don't want to reveal the plan, or not too early.

The same structure is the output format of the AI plan generator ([F09](F09-ai-coaching-assistant.md)).

## 2. Scope

| In (R2) | R3 / Later |
|---|---|
| Plan builder for practices (blocks, items, reorder) | Field mode with block timer (R3) |
| Per-item overrides and groups | PDF export / print (R3) |
| Duration check against the event | Apply a template to many series instances (R3) |
| Publishing to players (now or scheduled) | Planned intensity / target RPE per session (R3), feeding load monitoring later |
| Player plan view | Plans for match warm-ups (Later) |
| Templates; copy from a past practice | Version history of plans (Later) |
| Ad-hoc items and saving them to the library | |

## 3. Plan structure

```text
Session plan (1 per practice)
├── Objective(s)            "Presión tras pérdida", "Definición"
├── Block: Warm-up          (Activación)
│   └── Item → exercise ref | ad-hoc  · duration · structure · intensity · group · player notes · staff notes
├── Block: Main part        (Parte principal)
│   └── Items…
└── Block: Cool-down        (Vuelta a la calma)
    └── Items…
```

## 4. Business rules

| ID | Rule |
|---|---|
| BR-PLAN-01 | An event of type `practice` has at most one session plan. Matches and "other" events have none in R2. |
| BR-PLAN-02 | Blocks are fixed and ordered: warm-up, main part, cool-down. Each holds zero or more items. Items can be reordered within a block and moved between blocks. |
| BR-PLAN-03 | An item is either a **reference to a library exercise** or an **ad-hoc item** (title plus optional description). Each item can override duration, work structure and intensity, and can carry player notes, staff notes and a group label (e.g. "Grupo A", "Arqueros"). Overrides never modify the library exercise. |
| BR-PLAN-04 | The plan shows total planned time against the event duration. A warning is shown when they differ by more than 10% or 10 minutes, whichever is larger. It never blocks saving. |
| BR-PLAN-05 | A plan is a **draft** (staff only) until **published**. Publishing can happen now, or automatically at a set time before the start (default when scheduled: 24 h). Unpublishing hides it from players again. |
| BR-PLAN-06 | Once a plan is published, the event card shows "📋 Plan disponible". A dedicated notification (N-14) is sent only if staff tick "Avisar a los jugadores" (default off) to avoid notification fatigue. |
| BR-PLAN-07 | Players see objectives, blocks, item names, durations, structures, group labels, player notes and the linked exercise pages. They never see staff notes. |
| BR-PLAN-08 | **Templates** are club-wide plans not tied to an event, with a name, objective and optional category tags. Using a template, or copying a past plan, **copies** its content into the event's plan; there is no live link. |
| BR-PLAN-09 | An ad-hoc item can be turned into a library exercise ("Guardar en biblioteca"). This creates a prefilled draft and links the item to it. |
| BR-PLAN-10 | Plans stay editable by staff after the event, so they can reflect what was actually done. There is no version history in R2. |
| BR-PLAN-11 | **Concurrent edits**: the plan carries a version number. Saving an outdated version shows "Otra persona modificó el plan" with the options to reload or overwrite. |
| BR-PLAN-12 | Plans created from an AI generation are marked `generated_by_ai` and linked to the generation record ([F09](F09-ai-coaching-assistant.md)). Otherwise they behave like any other plan. |
| BR-PLAN-13 | Archived exercises used in a plan still render, with an "Archivado" badge visible to staff. |

## 5. User stories

### PLAN-01 · Build a practice plan
**Release:** R2 · **Priority:** Must · **Size:** L · **Platforms:** Web, Mobile

As a DT or *profe*, I want to assemble a practice from my library so that the session is organized and repeatable.

**Acceptance criteria**
- From a practice, "Planificar" opens the builder with the three blocks (BR-PLAN-02) and a field for the objectives.
- **Web**: a two-pane layout with the library on the left (search and filters from [F05](F05-exercise-library.md)) and the plan on the right. Items are added by drag and drop or with "+" buttons.
- **Mobile**: "Agregar ejercicio" opens library search and inserts the exercise into the selected block. Items are reordered with drag handles.
- The plan auto-saves as a draft (debounced), with an indicator showing the save state.

### PLAN-02 · Customize items in the plan
**Release:** R2 · **Priority:** Must · **Size:** M · **Platforms:** Web, Mobile

As staff, I want to adjust duration, sets and notes for this session without changing the library exercise.

**Acceptance criteria**
- Each item can be expanded to edit the overrides in BR-PLAN-03. Overridden values are visually marked, and "Restablecer" reverts them to the library defaults.
- Player notes and staff notes are clearly labelled as such.

### PLAN-03 · Check the session timing
**Release:** R2 · **Priority:** Must · **Size:** S · **Platforms:** Web, Mobile

As staff, I want to see whether my plan fits the practice time so that I don't over-plan.

**Acceptance criteria**
- A running total per block and overall, compared with the event duration, with the warning in BR-PLAN-04.
- Web shows a horizontal timeline proportional to item durations.

### PLAN-04 · Publish the plan to players
**Release:** R2 · **Priority:** Must · **Size:** S · **Platforms:** Web, Mobile

As staff, I want to decide when players can see the plan so that they come prepared without spoilers.

**Acceptance criteria**
- "Publicar" offers "Ahora" or "Automáticamente X horas antes" (BR-PLAN-05), plus the "Avisar a los jugadores" checkbox (BR-PLAN-06).
- The publish state is visible in the event and the plan ("Borrador", "Se publica el lunes 18:00", "Publicado").
- Unpublishing is possible at any time.

### PLAN-05 · See the practice plan (player)
**Release:** R2 · **Priority:** Must · **Size:** M · **Platforms:** Mobile, Web

As a player, I want to see what we'll do at practice and watch the exercises beforehand so that I arrive knowing what's expected.

**Acceptance criteria**
- The event screen shows a "Plan de la práctica" section once the plan is published, with blocks, items, durations and groups (BR-PLAN-07).
- Tapping an item opens the exercise page ([F05](F05-exercise-library.md) EXR-06).
- The published plan and exercise text are cached for offline reading. Videos are not cached.

### PLAN-06 · Save and use templates
**Release:** R2 · **Priority:** Should · **Size:** M · **Platforms:** Web, Mobile

As a *profe*, I want to save a good session as a template so that I can reuse it with other categories or weeks.

**Acceptance criteria**
- "Guardar como plantilla" from any plan asks for a name, objective and optional category tags.
- "Usar plantilla" in an empty plan lists templates with search and a category filter, then copies the content (BR-PLAN-08).
- Templates can be edited, renamed and deleted by their author, DTs and Club Admins.

### PLAN-07 · Copy a plan from a past practice
**Release:** R2 · **Priority:** Should · **Size:** S · **Platforms:** Web, Mobile

As staff, I want to start from last week's plan so that I only adjust what changes.

**Acceptance criteria**
- "Copiar de otra práctica" lists recent practices with plans from my categories (latest first) and copies the selected one per BR-PLAN-08.

### PLAN-08 · Add ad-hoc items
**Release:** R2 · **Priority:** Should · **Size:** S · **Platforms:** Web, Mobile

As staff, I want to add a quick item that isn't in the library ("Charla técnica 10'") without creating a full exercise.

**Acceptance criteria**
- "Ítem libre" takes a title, duration and optional description.
- "Guardar en biblioteca" follows BR-PLAN-09.

### PLAN-09 · Field mode
**Release:** R3 · **Priority:** Could · **Size:** M · **Platforms:** Mobile

As staff at the field, I want a big-type view of the plan with a timer per block so that I can run the session from my phone.

**Acceptance criteria**
- A full-screen, high-contrast view lists the current item, the next item and the remaining time. The timer can be started, paused and skipped. The screen stays on while field mode is open.

### PLAN-10 · Export the plan to PDF
**Release:** R3 · **Priority:** Could · **Size:** S · **Platforms:** Web

As staff, I want to print the plan or share it as a PDF so that assistants without the app can follow it.

**Acceptance criteria**
- The PDF contains club crest, category, date, objectives, blocks and items with durations and coaching points, plus a QR code that links to the plan in the app.

### PLAN-11 · Apply a template to several practices
**Release:** R3 · **Priority:** Could · **Size:** M · **Platforms:** Web

As a *profe*, I want to apply a template to every Tuesday in the next month so that I plan a microcycle in one go.

**Acceptance criteria**
- Staff select a template and a set of future practices (from a series or individually). Practices that already have a plan show a warning, and their plans are replaced only if staff confirm.

### PLAN-12 · Set the planned session intensity
**Release:** R3 · **Priority:** Could · **Size:** S · **Platforms:** Web, Mobile

As a *profe*, I want to record the target intensity of each session so that I can later compare planned load with how players feel.

**Acceptance criteria**
- An optional target RPE (1–10) per plan, shown in the wellness views ([F07](F07-player-wellness.md)) and in the AI context ([F09](F09-ai-coaching-assistant.md)).

## 6. Edge cases

| Case | Expected behavior |
|---|---|
| A practice is cancelled with a published plan | The plan stays attached (staff can copy it). Players see the event as cancelled. |
| A practice is rescheduled after a scheduled publish time was set | The scheduled publish time moves with the event (it is stored relative to the start). |
| An exercise in the plan is deleted (an unused draft) | Not possible: once an exercise is used, deletion becomes archiving (BR-EXR-04). |
| A player is a call-up for the practice | They see the published plan like any invitee. |
| A plan with zero items is published | Allowed, but a warning is shown ("El plan está vacío"). |

## 7. Telemetry

`plan_created {from: blank|template|copy|ai}`, `plan_item_added {source: library|adhoc}`, `plan_published {mode: now|scheduled, notify}`, `plan_viewed {role}`, `plan_exercise_opened_by_player`, `template_saved`, `template_used`.
