# Glossary (Ubiquitous Language)

> Status: **Draft v0.1** · Owner: Product · Last updated: 2026-10-22

Use these terms **exactly** in specs, code (entity, table and type names), API resources and UI copy. The "UI (es)" column is the default Spanish label (Río de la Plata variant, *voseo*). If a term changes, update it here first.

## 1. Organization

| Term (code) | UI (es) | Definition |
|---|---|---|
| **Club** (`club`) | Club | The tenant. Every piece of club data belongs to exactly one club. |
| **Category** (`category`) | Categoría | A team inside a club (e.g. *Primera*, *Reserva*, *Sub-20*, *Femenino*). Has a **format** and, optionally, a gender and an age group. |
| **Format** (`category.format`) | Modalidad | Game format of a category: `f11`, `f9`, `f8`, `f7`, `f5`, `futsal`. Drives the squad-size warnings. |
| **Club membership** (`club_membership`) | Integrante del club | A person's link to a club. Holds club-specific data (positions, jersey number) and the club role. It may have no user account (a *managed profile*). |
| **Category membership** (`category_membership`) | Integrante de la categoría | A person's link to a category, with a staff role (DT, Coach or none), an `is_player` flag, and start and end dates. |
| **Owner** | Dueño/a del club | The club creator, or whoever ownership was transferred to. One per club. |
| **Club Admin** | Administrador/a | Club coordinator role (club scope). |
| **DT** (`dt`) | DT | Head coach (*Director Técnico*) of a category. Staff role. |
| **Coach** (`coach`) | Profe / Cuerpo técnico | Non-head staff of a category (fitness coach, assistant, goalkeeper coach, physio…). Staff role with a free-text **staff title**. |
| **Staff** | Cuerpo técnico | DTs and Coaches collectively. |
| **Player** (`is_player`) | Jugador/a | A category member who plays: is invited to events, RSVPs and is counted in attendance. |
| **Managed profile** | Perfil sin cuenta | A player created by staff with no user account yet. Can be claimed later by the real person. |
| **Invite link** (`invite_link`) | Link de invitación | A shareable URL or code that lets people request to join a category with a given role. |
| **Join request** (`join_request`) | Solicitud para unirse | A pending request created when someone uses an invite link and approval is required. |
| **Venue** (`venue`) | Cancha / Lugar | A saved location (name, address, map link) reused across events. |
| **Season** (`season`) | Temporada | A named date range used to filter analytics. Later; until then, date-range filters are used. |

## 2. Events and attendance

| Term (code) | UI (es) | Definition |
|---|---|---|
| **Event** (`event`) | Actividad | Anything players are invited to. Type is `practice`, `match` or `other`. Linked to one or more categories. |
| **Practice** (`practice`) | Práctica / Entrenamiento | Training session. Can have a **session plan**. |
| **Match** (`match`) | Partido | Game against an opponent. Has kickoff time, call time, opponent and home/away. |
| **Series** (`event_series`) | Serie / Práctica recurrente | A weekly recurrence rule that generated a set of events (e.g. "Tue & Thu 20:00 until 30/11"). |
| **Call time** (`meet_at`) | Hora de citación | When players must arrive. Defaults to 60 minutes before kickoff for matches. |
| **Invitee** (`event_invitee`) | Invitado/a | A player invited to an event because they belong to a linked category (`category`), were individually **called up** (`call_up`), or were added as a **walk-in** during roll call (`walk_in`). |
| **Call-up (guest)** | Invitado/a de otra categoría | An invitee added individually, typically from another category (e.g. a *Sub-20* player training with *Primera*). |
| **Squad selection** | Convocatoria / Convocados | Release 3: the DT's published list of players selected for a match, chosen from available players. **Not the same as RSVP.** |
| **RSVP** (`rsvp_status`) | Confirmación | The player's stated intention: `pending`, `going` or `not_going`. Optional `arriving_late` flag and note. |
| **Absence reason** (`rsvp_reason`) | Motivo | Required when `not_going`: `injury_illness`, `work_study`, `personal`, `travel`, `other`. Visible to staff only. |
| **RSVP deadline** (`rsvp_deadline`) | Límite para confirmar | After this time, RSVP changes are flagged as **late changes** (or blocked, if the event is locked). |
| **Late change** | Cambio tardío | Any RSVP change after the deadline. It is recorded as late. |
| **Late drop-out** | Baja tardía | A late change from `going` to `not_going`. Notifies staff (N-07) and is counted in analytics. |
| **Proxy RSVP** | Confirmado por el cuerpo técnico | An RSVP set by staff on behalf of a player. |
| **Squad availability** | Disponibilidad / Quiénes van | Event view grouping invitees by RSVP and by **line**, with warnings (no goalkeeper, not enough players). |
| **Roll call** | Pasar lista | Staff recording **actual** attendance after or during the event. |
| **Attendance status** (`attendance_status`) | Asistencia | `present`, `late` or `absent`, recorded at roll call. |
| **Justified absence** (`absence_justified`) | Falta justificada | An absence that is excused. Defaults to *true* when the player answered `not_going` before the deadline; staff can override. |
| **No-show** | Faltazo | Player was `going` when the event started but was marked `absent`. |
| **Nudge** | Recordatorio manual | Staff-triggered reminder to players who have not responded. |
| **Weekly agenda** | Tu semana | Weekly digest and screen listing the events of the next 7 days, with bulk RSVP ("Confirmar semana"). |

## 3. Positions

Each player has one **primary position** and optional secondary positions. Squad availability groups players by **line**.

| Line (code) | UI (es) | Detailed positions (11-a-side) — code · UI (es) |
|---|---|---|
| `gk` | Arqueros | `gk` · Arquero/a (UY: *golero/a*) |
| `def` | Defensas | `cb` · Zaguero/a central · `rb` · Lateral derecho/a · `lb` · Lateral izquierdo/a · `rwb`/`lwb` · Carrilero/a |
| `mid` | Mediocampistas | `dm` · Volante de contención · `cm` · Volante / Interior · `am` · Enganche / Mediapunta · `rm`/`lm` · Volante por derecha/izquierda |
| `fwd` | Delanteros | `rw`/`lw` · Extremo/a (puntero/a) · `st` · Centrodelantero/a |

Futsal positions (code · UI es → line): `gk` · Arquero/a → `gk` · `fx` · Cierre / Fixo → `def` · `ala` · Ala → `mid` · `piv` · Pívot → `fwd`. Every player stores one detailed position code; the line is derived from it. Players with no position appear under **"Sin posición"**.

## 4. Training content

| Term (code) | UI (es) | Definition |
|---|---|---|
| **Exercise** (`exercise`) | Ejercicio | A reusable drill with structured metadata (type, intensity, players, space, equipment, duration), description, coaching points and media. |
| **Exercise library** | Biblioteca de ejercicios | The club's collection of exercises. Shared across all categories of the club. |
| **Starter library** | Biblioteca base | Platform-curated exercises clubs can browse and copy into their own library (Release 2). |
| **Session plan** (`session_plan`) | Plan de práctica | The ordered content of a practice: blocks of exercises with durations and notes. |
| **Block** (`session_plan_items.block`) | Bloque | `warmup` (*Activación / Entrada en calor*), `main` (*Parte principal*), `cooldown` (*Vuelta a la calma*). |
| **Plan template** | Plantilla | A session plan saved for reuse, not tied to an event. |
| **Published plan** | Plan publicado | A plan made visible to invitees. Plans are hidden from players until published. |
| **Routine** (`routine`) | Rutina | A training program done outside club sessions (gym, mobility, prevention, recovery), structured and/or as files. |
| **Nutrition plan** (`nutrition_plan`) | Plan de nutrición | Nutrition guidance as rich text and/or files. |
| **Assignment** (`content_assignment`) | Asignación | Links a routine or nutrition plan to categories or to individual players, with optional validity dates. |

## 5. Wellness

| Term (code) | UI (es) | Definition |
|---|---|---|
| **Wellness check-in** (`wellness_checkin`) | Check-in de estado físico | A player's periodic self-report: load and pain (plus optional extra items in Release 3). |
| **Wellness cycle** | Semana de check-in | Runs from one category check-in moment to the next (7 days). A player is *covered* for a cycle if they checked in between 48 h before its start and its end (BR-WELL-04). |
| **Load** (`load_level`) | Carga | "How loaded do you feel?" on a 1–5 scale. 1 = *Muy fresco/a*, 5 = *Muy cargado/a*. **Higher is worse.** |
| **Pain report** (`pain_report`) | Dolor / Molestia | A body area, side, intensity (0–10) and training impact attached to a check-in. |
| **Training impact** (`training_impact`) | ¿Te limita para entrenar? | `none` (*Entreno normal*), `limited` (*Entreno con molestias*), `cannot_train` (*No puedo entrenar*). |
| **Wellness flag** | Alerta | `red`, `amber`, `watch` or `ok`, computed from a check-in using the rules in [F07](../features/F07-player-wellness.md) (BR-WELL-08). Shown as "Sin datos" when there is no check-in in the last 7 days. |
| **Health-data consent** | Consentimiento | Explicit, revocable consent to process wellness data. Given by a guardian for players under 18. |

## 6. AI

| Term (code) | UI (es) | Definition |
|---|---|---|
| **AI assistant** | Asistente IA | Chat for staff, grounded in the club's data through permission-checked tools. |
| **Plan generation** (`ai_plan_generation`) | Generar plan con IA | A request that produces a **draft** session plan from parameters and the club's library. Never saved without staff review. |
| **AI credit / quota** | Créditos de IA | The club's monthly allowance of AI usage. |

## 7. Notifications

| Term | UI (es) | Definition |
|---|---|---|
| **Notification type** (`N-xx`) | — | A catalogued notification with a trigger, audience, channels and defaults. See [F10](../features/F10-notifications.md). |
| **Quiet hours** | Horario de silencio | Window (default 22:00–08:00, club time zone) when non-urgent push notifications are held back. |
| **Inbox** | Notificaciones | In-app list of every notification a user received. |

## 8. Release and priority labels

| Label | Meaning |
|---|---|
| **R0** | Foundations: technical setup, no end-user release. |
| **R1** | MVP — "Squad & Attendance". |
| **R2** | "Training Hub" — exercise library, session planning, wellness. |
| **R3** | "Coach Pro" — routines and nutrition, AI assistant, advanced analytics. |
| **Later** | Validated idea, not scheduled. |
| **Must / Should / Could** | MoSCoW priority within a release. A release cannot ship without its *Must* items. |
| **S / M / L / XL** | Size: S ≤ 2 dev-days, M 3–5, L 6–10, XL > 10 (must be split before entering a sprint). |
