# F08 — Routines & Nutrition Plans

> Status: **Draft v0.1** · Release: **R3** · Owner: Product · Last updated: 2026-10-22
> Source: Notion "Rutinas y nutrición" · Related: [F05](F05-exercise-library.md) · [Privacy](../product/06-privacy-and-compliance.md)

## 1. Goal

Replace the PDFs that *profes* send over WhatsApp with **assigned, always-available programs**:
- training routines done outside club sessions (gym, prevention, mobility, recovery, return to play), and
- nutrition guidance.

Players should find "what I have to do this week" in one place, even offline at the gym.

From the Notion brief:
- Coaches and DTs create and upload training routines (separate from practices) and nutrition plans.
- Players can access these routines and plans.

Refinements made in this document:
- **Structured routines and file uploads are both supported.** Many *profes* already have their programs as PDFs and won't retype them. Structured routines reuse the exercise library and enable adherence tracking.
- **Assignments**: to whole categories or to individual players (e.g. a rehab routine), with validity dates.
- **Sensitivity**: individual routines and nutrition plans can reveal health conditions (injury, diet for a medical condition). Visibility is restricted to the assignee and their staff.
- **Professional responsibility**: nutrition content is the club's responsibility. The product shows a disclaimer and optionally the author's credential.
- **Adherence logging** (R3 Should) closes the loop for *profes*.

## 2. Scope

| In (R3) | Later |
|---|---|
| Structured routines (items from the library or ad-hoc, with sets, reps, time, load and rest) | Interactive workout player (timers, rest countdown) |
| File attachments (PDF, images) for routines and nutrition plans | Meal logging, macros, food databases |
| Nutrition plans (rich text and files) | Specialized staff roles with their own permissions (nutritionist, physio) |
| Assignment to categories or players, with dates | Integration with wearables |
| Player "Mis rutinas" and "Nutrición" sections, offline | |
| Routine session logging (done, RPE, comment) and adherence | |

## 3. Business rules

| ID | Rule |
|---|---|
| BR-CONT-01 | A **routine** has a title, goal type (`strength`, `mobility`, `conditioning`, `injury_prevention`, `recovery`, `return_to_play`, `individual_technique`, `other`), description, estimated duration, suggested weekly frequency, an ordered list of items and up to 5 attachments. An item is a library exercise or an ad-hoc item, with sets, reps **or** time, load (free text such as "60% 1RM", "RPE 7" or "peso corporal"), rest and notes. A routine needs at least one item **or** one attachment. |
| BR-CONT-02 | A **nutrition plan** has a title, a short summary, rich-text content (headings, lists, bold, links) and up to 5 attachments. It can show an optional author credential (e.g. "Lic. en Nutrición Ana Pérez"). |
| BR-CONT-03 | Attachments: PDF, JPG, PNG or WEBP, each ≤ 20 MB, scanned by the upload pipeline before they are served ([NFR](../tech/05-non-functional-requirements.md)). |
| BR-CONT-04 | An **assignment** links one content item to one or more categories and/or individual players, with optional start and end dates. The same content can have several assignments. Content is assigned by reference: players always see the latest version. |
| BR-CONT-05 | **Visibility**: content assigned to a category is visible to its current players while the assignment is active. Content assigned to an individual is visible **only to that player and to staff of the player's categories**. Unassigned content is visible to staff only. |
| BR-CONT-06 | Creating an assignment sends N-15 to the players concerned. Editing assigned content sends nothing unless staff tick "Avisar cambios importantes". |
| BR-CONT-07 | Nutrition plans always display: "Contenido orientativo preparado por el cuerpo técnico del club. No reemplaza la consulta con un/a profesional de la salud." Individual nutrition plans and `return_to_play` routines are **excluded from the AI assistant's context** ([F09](F09-ai-coaching-assistant.md)). |
| BR-CONT-08 | **Routine logs**: a player can log a session of an active routine with date (default today), completion (`full` or `partial`), optional session RPE (1–10) and an optional comment (≤ 280 characters). **Adherence** = logged sessions ÷ expected sessions (suggested frequency × active weeks). |
| BR-CONT-09 | Active routines and their attachments, and the player's nutrition plans, are cached for **offline** viewing on mobile (up to 100 MB per user, least recently used content evicted first). |
| BR-CONT-10 | Archiving content ends its assignments and hides it from players. Logs are kept. Club Admins, DTs and the author can archive. |

## 4. User stories

### CONT-01 · Create a structured routine
**Release:** R3 · **Priority:** Must · **Size:** M · **Platforms:** Web, Mobile

As a *profe*, I want to build a routine from my exercise library, with sets, reps and rest, so that players follow it exactly.

**Acceptance criteria**
- The routine form has the fields from BR-CONT-01. Items are added from the library (with the same search as [F05](F05-exercise-library.md)) or as ad-hoc items, and can be reordered.
- Library exercises in a routine become visible to its assigned players (BR-EXR-06).

### CONT-02 · Upload a routine or nutrition file
**Release:** R3 · **Priority:** Must · **Size:** S · **Platforms:** Web, Mobile

As a *profe* with existing PDFs, I want to upload them as-is so that I can start using the app without retyping.

**Acceptance criteria**
- Attachments follow BR-CONT-03. PDFs open in the in-app viewer with pinch-to-zoom and can be downloaded or shared.

### CONT-03 · Assign a routine
**Release:** R3 · **Priority:** Must · **Size:** M · **Platforms:** Web, Mobile

As a *profe*, I want to assign a routine to the whole *Sub-20* or to one injured player, for specific weeks.

**Acceptance criteria**
- "Asignar" lets me select categories and/or players (search) and set optional dates (BR-CONT-04). The confirmation shows how many players will receive it.
- Players receive N-15 (BR-CONT-06).
- The routine page lists its active and past assignments.

### CONT-04 · See my routines
**Release:** R3 · **Priority:** Must · **Size:** M · **Platforms:** Mobile, Web

As a player, I want a list of the routines I have to do so that I know my homework.

**Acceptance criteria**
- "Mis rutinas" lists active routines with goal, frequency and dates, with individual assignments marked "Para vos". Past routines appear under "Anteriores".
- The routine page shows items, with links to the exercise pages, and the attachments. It is available offline (BR-CONT-09).

### CONT-05 · Log a routine session
**Release:** R3 · **Priority:** Should · **Size:** M · **Platforms:** Mobile

As a player, I want to mark that I did today's routine so that my *profe* knows.

**Acceptance criteria**
- "Hecho" on a routine logs a session per BR-CONT-08 in two taps; RPE and a comment are optional.
- I can see my log history and edit or delete entries from the last 7 days.

### CONT-06 · Routine adherence (staff)
**Release:** R3 · **Priority:** Could · **Size:** M · **Platforms:** Web, Mobile

As a *profe*, I want to see who is doing their routines so that I can follow up.

**Acceptance criteria**
- Per routine and assignment: adherence per player (BR-CONT-08), last logged date and average RPE, sortable.

### CONT-07 · Create a nutrition plan
**Release:** R3 · **Priority:** Must · **Size:** S · **Platforms:** Web, Mobile

As staff, I want to publish nutrition guidance (pre-match meals, hydration, recovery) so that players have it at hand.

**Acceptance criteria**
- The form has the fields from BR-CONT-02, with a rich-text editor on web and a simplified editor on mobile.
- The disclaimer from BR-CONT-07 is always shown on the published page.

### CONT-08 · Assign a nutrition plan
**Release:** R3 · **Priority:** Must · **Size:** S · **Platforms:** Web, Mobile

As staff, I want to assign nutrition plans to categories or to individual players.

**Acceptance criteria**
- Same flow as CONT-03 (shared assignment component), following BR-CONT-04 to BR-CONT-06.

### CONT-09 · See my nutrition plans
**Release:** R3 · **Priority:** Must · **Size:** S · **Platforms:** Mobile, Web

As a player, I want to read my nutrition plans anytime, even offline.

**Acceptance criteria**
- The "Nutrición" section lists active plans (individual ones marked "Para vos"). Plans are readable offline (BR-CONT-09).

### CONT-10 · Duplicate content
**Release:** R3 · **Priority:** Should · **Size:** S · **Platforms:** Web, Mobile

As staff, I want to duplicate a routine or nutrition plan so that I can adapt it for another group.

**Acceptance criteria**
- "Duplicar" copies everything except assignments and logs, and appends "(copia)" to the title.

## 5. Edge cases

| Case | Expected behavior |
|---|---|
| A player leaves the category during an active team assignment | Access ends with the membership. Their logs are kept. |
| An individual routine is assigned to a player in two categories | Staff of both categories can see it (BR-CONT-05). |
| An attachment fails the security scan | Upload rejected with "No pudimos procesar el archivo". |
| A routine references an exercise that is later archived | The item still renders with the exercise content and an "archivado" badge for staff. |
| Offline cache full | Least recently viewed content is evicted. Active routines are kept with priority. |

## 6. Telemetry

`routine_created {goal, items, attachments}`, `nutrition_plan_created {attachments}`, `content_assigned {kind, targets: category|individual, players}`, `routine_viewed`, `routine_session_logged {completion, has_rpe}`, `nutrition_plan_viewed`, `attachment_opened {offline}`.
