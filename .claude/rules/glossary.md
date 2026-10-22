# Ubiquitous language

Use the terms in `docs/product/03-glossary.md` exactly: in table, model, type, route and variable names, and in the Spanish labels of UI copy. If a term is missing or wrong, change the glossary first, then the code.

Naming per layer: tables `snake_case` plural (`event_invitees`), Prisma models `PascalCase` singular (`EventInvitee`), TypeScript and JSON fields `camelCase` (`rsvpStatus`), enum values `snake_case` strings (`not_going`), REST paths plural nouns (`/events/{eventId}/invitees`).

## Core terms

| Code | Values | UI (es) |
|---|---|---|
| `club` | the tenant | Club |
| `category` (a team inside a club) | `format`: `f11`, `f9`, `f8`, `f7`, `f5`, `futsal` | Categoría |
| `club_membership` (may have no user: managed profile) | `is_owner`, `is_admin` | Integrante del club |
| `category_membership` | `staff_role`: `dt`, `coach`, null · `is_player` | Integrante de la categoría |
| `event` | `type`: `practice`, `match`, `other` | Actividad |
| `event_series` | weekly recurrence | Serie / Práctica recurrente |
| `event_invitee` | one row per person and event; `source`: `category`, `call_up`, `walk_in` | Invitado/a |
| `rsvp_status` | `pending`, `going`, `not_going` (+ `arriving_late`) | Confirmación: Voy / No voy / Llego tarde |
| `rsvp_reason` (required when `not_going`, staff-only) | `injury_illness`, `work_study`, `personal`, `travel`, `other` | Motivo |
| `attendance_status` (roll call) | `present`, `late`, `absent` (+ `absence_justified`) | Asistencia |
| `meet_at` | call time | Hora de citación |
| `invite_link` · `join_request` | role: `player`, `coach`, `dt` | Link de invitación · Solicitud para unirse |
| Line (position group) | `gk`, `def`, `mid`, `fwd` | Arqueros, Defensas, Mediocampistas, Delanteros |
| `exercise` · `session_plan` | plan block: `warmup`, `main`, `cooldown` | Ejercicio · Plan de práctica |
| `wellness_checkin` | `load_level` 1–5, **higher is worse** | Check-in de estado físico |
| `training_impact` | `none`, `limited`, `cannot_train` | ¿Te limita para entrenar? |
| `routine` · `nutrition_plan` · `content_assignment` | assignment targets a category **xor** a person | Rutina · Plan de nutrición · Asignación |

## Distinctions that matter

- **RSVP** is the player's intention. **Roll call** records actual attendance. **Squad selection** (*convocatoria*, R3) is the DT's published list. Three different things.
- **Call-up** (`call_up`) is an invitee added individually, usually from another category. It is not squad selection.
- **Staff** means DTs and Coaches together. A **Club Admin** is not staff by role alone, and has no access to individual health data unless they also hold a staff role.
- **Practice** is the event; the **session plan** is its content. Don't call a practice a "training" or a "session" in code or copy.
- **Managed profile**: a player created by staff with no account. It cannot sign in, receive push or submit check-ins.
- **No-show** (*faltazo*): `going` when the event started, then marked `absent`.
- **Late change** is any RSVP change after the deadline. A **late drop-out** is a late change from `going` to `not_going`: it notifies staff (N-07) and is what analytics count.
- **Membership dates** (`starts_on`, `ends_on`) are inclusive calendar days in the club time zone. A move effective D ends the old membership on D − 1 (BR-CLUB-06).
