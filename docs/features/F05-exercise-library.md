# F05 — Exercise Library

> Status: **Draft v0.1** · Release: **R2** · Owner: Product · Last updated: 2026-10-22
> Source: Notion "Listado de ejercicios" · Related: [F06](F06-session-planning.md) · [F08](F08-routines-and-nutrition.md) · [F09](F09-ai-coaching-assistant.md) · OQ-12, OQ-13, OQ-23

## 1. Goal

Give each club a **searchable, structured library of exercises** that:
- staff reuse across sessions and seasons,
- players can study before practice, which cuts explanation time on the field, and
- the AI assistant can plan with ([F09](F09-ai-coaching-assistant.md)).

From the Notion brief:
- Coaches and DTs upload exercises with name, description, videos, photos and notes.
- They indicate which exercises are included in each practice.
- Players can view an exercise's information to understand it before practice.

Refinements made in this document:
- **Structured metadata** (type, intensity, players, space, equipment, duration). Without it, search is weak and AI planning is impossible. Name, type and description are the minimum; a **completeness indicator** encourages the rest.
- **Cold start.** An empty library makes the product feel empty and makes AI planning useless. A platform-curated **starter library** (OQ-13) solves this.
- **Media costs and limits.** Video storage and streaming is the most expensive part of the platform. Limits, compression and a managed video provider are needed (OQ-12).
- **Quick capture on mobile**: record a drill at the field, complete it later on web.
- **Player access** is limited to exercises in published plans or assigned routines (OQ-23).

## 2. Scope

| In (R2) | R3 / Later |
|---|---|
| Create, edit, duplicate and archive exercises with structured metadata | Favorites and collections (R3) |
| Photos, uploaded videos and external video links | AI-suggested metadata from the description (R3) |
| Search and filters | Tactical board / diagram editor (Later) |
| Exercise detail for staff and players | Sharing exercises between clubs / marketplace (Later) |
| Starter library (browse and copy) | Comments on exercises (Later) |
| Quick capture (mobile drafts) | |

## 3. Exercise model and taxonomy

| Field | Required | Values / limits | Visible to players |
|---|---|---|---|
| Name | ✅ | ≤ 80 characters | ✅ |
| Type | ✅ | see below | ✅ |
| Description | ✅ (to complete a draft) | basic rich text (bold, lists, line breaks), ≤ 4,000 characters | ✅ |
| Game moments | – | multi: attacking organization, defensive organization, attack→defense transition, defense→attack transition, set pieces | ✅ |
| Physical focus | – | multi: aerobic endurance, intermittent / repeated sprints, speed, agility / change of direction, strength, power, mobility, coordination | ✅ |
| Intensity | – (default medium) | low, medium, high | ✅ |
| Default duration | – | minutes (1–120) | ✅ |
| Work structure | – | sets × reps or time, work / rest (e.g. "4 × 4' / 2' pausa") | ✅ |
| Players | – | min, max | ✅ |
| Goalkeepers needed | – | 0, 1, 2 | ✅ |
| Space | – | dimensions (length × width in meters) **or** preset: small area, ¼ field, ½ field, full field | ✅ |
| Equipment | – | multi: balls, cones, discs, bibs, mini-goals, full-size goals, poles, hurdles, ladder, mannequins, hoops, resistance bands, plus custom | ✅ |
| Coaching points | – | bullet list, ≤ 10 items | ✅ |
| Rules / scoring | – | text | ✅ |
| Variations and progressions | – | bullet list | ✅ |
| Suitable formats | – | multi: format values from the glossary | ✅ |
| Tags | – | free text, club-level suggestions | ✅ |
| Staff notes | – | text | ❌ never |
| Media | – | see BR-EXR-05 | ✅ |
| Status | system | `draft`, `active`, `archived` | – |
| Source | system | `starter` (platform starter library, `club_id` null), `club`, `starter_copy`, `ai_suggested` | – |

**Exercise types** (code · UI es): `warmup` · Activación · `technical` · Técnica · `tactical` · Táctica · `physical` · Físico · `small_sided_game` · Juego reducido · `rondo` · Rondo · `possession` · Posesión · `finishing` · Definición · `set_pieces` · Pelota parada · `goalkeeping` · Arqueros · `cooldown` · Vuelta a la calma · `injury_prevention` · Prevención.

## 4. Business rules

| ID | Rule |
|---|---|
| BR-EXR-01 | The library is **club-scoped** and shared by all staff of the club, across categories. |
| BR-EXR-02 | An exercise is `active` once it has name, type and description. A **completeness indicator** (percentage of the optional fields filled in) is shown to staff with the hint "Completar jugadores, espacio y materiales mejora las búsquedas y las sugerencias de la IA". |
| BR-EXR-03 | Edit and archive permissions follow the [permission matrix](../product/02-personas-and-roles.md#44-training-content): Club Admins and DTs can edit any exercise; Coaches can edit their own. |
| BR-EXR-04 | An exercise used in a session plan, template or routine cannot be deleted, only **archived**. Archived exercises disappear from search but still render in existing plans and routines, and can be restored. Unused drafts can be deleted. |
| BR-EXR-05 | **Media limits** (OQ-12): <br>• Up to 10 photos, resized on the device to ≤ 1,600 px on the long edge. <br>• Up to 3 uploaded videos, each ≤ 2 minutes and ≤ 200 MB before processing, transcoded to adaptive streaming. <br>• Up to 5 external links from an allow-list: YouTube, Vimeo, Instagram, TikTok, Google Drive, Dropbox. YouTube and Vimeo are embedded; the others open externally. |
| BR-EXR-06 | **Player access** (OQ-23): a player can see an exercise only when it is in a **published** session plan of an event they are invited to, or in a routine assigned to them ([F08](F08-routines-and-nutrition.md)). Staff notes are never shown to players. |
| BR-EXR-07 | **Drafts** (quick capture) are visible only to their author until completed. |
| BR-EXR-08 | **Starter library** exercises are read-only. "Copiar a mi club" creates an editable club copy with an attribution ("Basado en Biblioteca base"). Later changes to the starter exercise do not propagate to copies. |
| BR-EXR-09 | **Search** is full-text over name, description, coaching points and tags; it is accent- and case-insensitive with Spanish stemming. Filters exist for every taxonomy field. Sort options: recently used (default), most used, newest, name. |
| BR-EXR-10 | Usage (number of plans and routines containing the exercise, and the last time it was used) is tracked for sorting and for the AI. |
| BR-EXR-11 | Uploaded media must respect the terms of service (the uploader owns the rights or has permission). Club Admins can archive any exercise. The platform keeps a takedown process for rights claims ([Privacy](../product/06-privacy-and-compliance.md)). |

## 5. User stories

### EXR-01 · Create an exercise
**Release:** R2 · **Priority:** Must · **Size:** L · **Platforms:** Web, Mobile

As a *profe* or DT, I want to add an exercise with its key information so that I can reuse it and players can understand it.

**Acceptance criteria**
- The form has the fields from § 3, grouped into collapsible sections: Basics (name, type, description), Organization (players, goalkeepers, space, equipment, duration and structure), Coaching (coaching points, rules, variations), Classification (game moments, physical focus, intensity, formats, tags), Media, and Staff notes.
- It saves as `active` when the requirements in BR-EXR-02 are met; otherwise the form shows what is missing.
- Equipment and tags autocomplete from values already used in the club.
- Web is the primary authoring surface. Mobile supports the full form in a single scrolling layout.

### EXR-02 · Add photos
**Release:** R2 · **Priority:** Must · **Size:** M · **Platforms:** Web, Mobile

As staff, I want to attach photos or images of a drill diagram so that the setup is easy to understand.

**Acceptance criteria**
- Photos can come from the camera, the gallery or (on web) drag-and-drop. They are compressed before upload (BR-EXR-05), can be reordered, and the first one is the cover.
- Uploads go directly to storage with signed URLs; the app shows progress and retries on failure.

### EXR-03 · Upload videos
**Release:** R2 · **Priority:** Must · **Size:** L · **Platforms:** Web, Mobile

As staff, I want to upload a short video of the drill so that players see it in motion.

**Acceptance criteria**
- Videos can be recorded or picked from the gallery, within the limits in BR-EXR-05. Videos that are too long show a trim hint.
- On mobile data, a warning shows the file size before uploading. Uploads are resumable or retried automatically.
- While processing, the exercise shows "Procesando video" and stays usable. When processing finishes, playback is adaptive and the cover image is generated automatically.
- Videos never autoplay on mobile data.

### EXR-04 · Add external video links
**Release:** R2 · **Priority:** Must · **Size:** S · **Platforms:** Web, Mobile

As staff, I want to paste a YouTube or Instagram link so that I can reuse content without uploading it.

**Acceptance criteria**
- Links are validated against the allow-list (BR-EXR-05). YouTube and Vimeo are embedded with a thumbnail. Other links open in the external app or browser, with a title and the platform's icon.

### EXR-05 · Search and filter the library
**Release:** R2 · **Priority:** Must · **Size:** M · **Platforms:** Web, Mobile

As staff, I want to find "a rondo for 12 players with no goals in 15 minutes" quickly so that I can plan faster.

**Acceptance criteria**
- Search and filters follow BR-EXR-09, with results in under 500 ms (p95) for libraries of up to 2,000 exercises.
- Filter chips show active filters and can be cleared. The latest filters are remembered per user.
- Each result card shows cover image, name, type, intensity, players, duration and media icons.

### EXR-06 · View an exercise
**Release:** R2 · **Priority:** Must · **Size:** M · **Platforms:** Mobile, Web

As a player or staff member, I want a clear exercise page so that I understand what we'll do.

**Acceptance criteria**
- The page shows media (carousel and video player) and the key facts (players, space, duration, equipment) as icons, followed by description, coaching points, rules and variations.
- Players see the page only per BR-EXR-06 and never see staff notes. Staff also see usage (BR-EXR-10) and their notes.
- Mobile layout is optimized for reading; long text is collapsible.

### EXR-07 · Edit, duplicate or archive an exercise
**Release:** R2 · **Priority:** Must · **Size:** S · **Platforms:** Web, Mobile

As staff, I want to maintain the library so that it stays useful.

**Acceptance criteria**
- Editing follows BR-EXR-03. Edits are reflected in every plan that uses the exercise, while each plan item keeps its own overrides ([F06](F06-session-planning.md)).
- "Duplicar" creates a copy named "(copia)".
- Archiving, restoring and deleting follow BR-EXR-04.

### EXR-08 · Browse and copy from the starter library
**Release:** R2 · **Priority:** Should · **Size:** L · **Platforms:** Web, Mobile

As a new club, I want to start from a set of proven exercises so that my library isn't empty on day one.

**Acceptance criteria**
- The starter library tab has the same search and filters. Exercises show a "Biblioteca base" badge.
- I can copy one exercise or a whole pack (e.g. "Activaciones", "Rondos", "Prevención de lesiones") into the club library (BR-EXR-08).
- The starter library launches with **at least 60 exercises** with complete metadata and diagrams or photos; content ownership is resolved in OQ-13.

### EXR-09 · Quick capture from the field
**Release:** R2 · **Priority:** Should · **Size:** M · **Platforms:** Mobile

As a *profe* at practice, I want to record a drill and save it with just a name so that I can complete it later.

**Acceptance criteria**
- "Captura rápida" opens the camera. After recording, I enter a name and save it as a **draft** (BR-EXR-07); the upload continues in the background.
- Drafts appear in a "Borradores" list with a completion call to action. On web, completing a draft opens the full form.

### EXR-10 · Favorites
**Release:** R3 · **Priority:** Could · **Size:** S · **Platforms:** Web, Mobile

As staff, I want to star exercises so that I find my go-to drills quickly.

**Acceptance criteria**
- Favorites are per user, shown in a filter chip and prioritized in plan building.

### EXR-11 · AI-suggested metadata
**Release:** R3 · **Priority:** Could · **Size:** S · **Platforms:** Web, Mobile

As staff, I want the app to suggest type, intensity, equipment and tags from my description so that completing metadata takes seconds.

**Acceptance criteria**
- After a description is entered, "Sugerir datos" proposes values for empty fields only. Staff accept or edit each value; nothing is saved without confirmation. AI usage counts toward the club quota ([F09](F09-ai-coaching-assistant.md)).

## 6. Edge cases

| Case | Expected behavior |
|---|---|
| Video processing fails | Exercise shows "No pudimos procesar el video" with retry and remove actions. The rest of the exercise works. |
| A player opens a link to an exercise they no longer have access to (plan unpublished) | "Este ejercicio no está disponible". |
| An exercise is edited while a player is viewing it | The player sees the new version on refresh. No versioning in R2. |
| A club reaches its storage quota (if pricing defines one) | Uploads are blocked with a clear message; external links still work. |
| An external link becomes private or is deleted | The embed shows a fallback card with the link. No automatic check. |

## 7. Telemetry

`exercise_created {type, completeness, has_video, source}`, `exercise_media_added {kind, size_mb, network}`, `exercise_searched {has_query, filters_count, results}`, `exercise_viewed {role, from}`, `starter_exercise_copied {count, pack}`, `quick_capture_saved`, `exercise_archived`.

## 8. Open questions

- **OQ-12** Video uploads in R2 or links only? Which provider and limits?
- **OQ-13** Who creates the starter library content, and under what license?
- **OQ-23** Should players be able to browse the whole library?
