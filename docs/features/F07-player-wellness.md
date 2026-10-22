# F07 — Player Wellness Check-ins

> Status: **Draft v0.1** · Release: **R2** · Owner: Product · Last updated: 2026-10-22
> Source: Notion "Estado físico jugadores" · Related: [Privacy & compliance](../product/06-privacy-and-compliance.md) · [F03](F03-events-and-attendance.md) · [F10](F10-notifications.md) · OQ-05, OQ-10, OQ-11

## 1. Goal

Give staff a **current, trustworthy picture of how each player feels physically** so that they can adapt training load and prevent injuries. Players must be able to report it in **under 30 seconds**.

From the Notion brief:
- Players report how they feel through a survey: how loaded they feel (e.g. 1–5) and whether they have any pain.
- Weekly notifications remind players to fill it in.
- Coaches and DTs see the current state of their players, as a summary and individually.

Refinements made in this document:
1. **This is health data.** Pain and physical condition are sensitive personal data under data protection law: Uruguay's Law 18.331, Argentina's Law 25.326 and the GDPR all treat health data specially. It requires **explicit consent**, strict access control, an access log, a retention policy and, for minors, **guardian consent**. This is the highest-risk feature from a compliance point of view; see [Privacy](../product/06-privacy-and-compliance.md).
2. **Scale direction and anchors.** "Load" is defined as 1 = very fresh, 5 = very loaded (higher is worse), with a label on every value. Unlabelled scales produce inconsistent answers.
3. **Pain details.** Body area, side, intensity (0–10) and training impact turn "yes, I have pain" into something actionable.
4. **Flags.** Simple, explainable rules highlight who needs attention. They are not medical diagnoses.
5. **Frequency.** A weekly check-in, as requested, is the R2 default. Sports science typically uses more frequent (pre-session) monitoring. More items (sleep, stress, soreness, mood, as in the Hooper index) and pre-session mode are options for later (OQ-10).
6. **Multi-category players** get one check-in shared with all their staff, not one per category.

## 2. Scope

| In (R2) | R3 / Later |
|---|---|
| Consent (player and guardian); revocation and deletion | Extra items: sleep, stress, soreness, mood (R3, OQ-10) |
| Weekly schedule per category; reminders | Ad-hoc check-in requests (R3) |
| Check-in: load and pain (body area, side, intensity, impact, note) | Pre-session check-in mode (Later) |
| Player history | Configurable flag thresholds (Later) |
| Squad board, individual history | Session RPE and load monitoring (sRPE, ACWR) (Later) |
| Flags; critical-flag alerts; flags in squad availability | Physio / medical module (Later) |

## 3. Check-in content (R2)

| # | Question (UI es) | Type | Required |
|---|---|---|---|
| 1 | **¿Qué tan cargado/a te sentís?** | 1 *Muy fresco/a* · 2 *Fresco/a* · 3 *Normal* · 4 *Cargado/a* · 5 *Muy cargado/a*. Each value shows a label, an emoji and a color (green → red). | ✅ |
| 2 | **¿Tenés algún dolor o molestia?** | Sí / No | ✅ |
| 2a | *If yes:* **¿Dónde?** | Body map, or a list of areas (up to 3 reports). For each: side (izq. / der. / ambos / n/a), **intensity 0–10**, and **¿Te limita para entrenar?** (*Entreno normal* / *Entreno con molestias* / *No puedo entrenar*) | ✅ (when yes) |
| 3 | **¿Algo más que quieras contarle al cuerpo técnico?** | Free text, ≤ 280 characters | – |

**Body areas** (code): `head_neck`, `shoulder`, `arm_elbow`, `wrist_hand`, `chest_ribs`, `upper_back`, `lower_back`, `abdomen`, `hip_groin`, `glute`, `thigh_front` (quadriceps), `thigh_back` (hamstring), `thigh_inner` (adductor), `knee`, `shin`, `calf`, `achilles`, `ankle`, `foot`, `other`.

## 4. Business rules

### Schedule and coverage
| ID | Rule |
|---|---|
| BR-WELL-01 | Wellness is **off by default** for each category. Staff enable it and set the weekly **check-in moment** (weekday and time; default Monday 09:00, club time zone). Enabling shows a short summary of the data-handling commitments. |
| BR-WELL-02 | A check-in belongs to the **player's club membership**, not to a category. It is visible to staff of every category where the player is currently active (BR-ROLE-10, [Roles § 4.5](../product/02-personas-and-roles.md#45-wellness-health-related-data)). |
| BR-WELL-03 | Players can submit a check-in at any time, not only when reminded. At most one check-in is stored per player per calendar day: a second submission on the same day **replaces** the first and is marked "editado". |
| BR-WELL-04 | A category **cycle** runs from one check-in moment to the next. A player is **covered** for a cycle if they submitted a check-in between **48 h before** the cycle start and the cycle end. |
| BR-WELL-05 | At the check-in moment, N-11 goes to consenting players who are not covered. N-12 follows 24 h later if they are still not covered. A player receives at most one N-11 every 48 h across all their categories. When the player's N-02 ("Tu semana") is due within 2 h after N-11, only N-02 is sent and it carries the check-in call to action (BR-NOTIF-14). |
| BR-WELL-06 | **Current state** = the player's most recent check-in if it is at most 7 days old; otherwise "Sin datos recientes", with the date of the last check-in. |
| BR-WELL-07 | **Response rate** for a category cycle = covered consenting players ÷ active consenting players of the category. Players without consent are listed separately, not counted. |

### Flags
| ID | Rule |
|---|---|
| BR-WELL-08 | Each check-in gets the **highest** flag whose condition matches: <br>🔴 **Red**: any pain with impact *No puedo entrenar*, **or** pain intensity ≥ 7. <br>🟠 **Amber**: pain intensity 4–6, **or** impact *Entreno con molestias*, **or** load = 5. <br>🟡 **Watch**: load = 4, **or** pain intensity 1–3. <br>🟢 **OK**: none of the above. <br>⚪ **No data**: no check-in in the last 7 days. <br>Thresholds are fixed; per-category configuration is Later. |
| BR-WELL-09 | A **red** check-in sends N-13 to the staff of the player's categories, at most once per player per 24 h. Staff can turn N-13 off in their notification preferences (its own group, BR-NOTIF-11). |
| BR-WELL-10 | Flags appear next to the player in squad availability ([F03](F03-events-and-attendance.md) EVT-11) **for staff only**. |
| BR-WELL-11 | Flags are decision aids, not diagnoses. The check-in screen and the staff board show the disclaimer: "Esta herramienta no reemplaza la evaluación de un profesional de la salud. Ante dolor intenso o persistente, consultá a un médico o fisioterapeuta." |

### Consent, privacy and retention
| ID | Rule |
|---|---|
| BR-WELL-12 | **Explicit consent** is required before a player's first check-in. It is separate from the terms of service, versioned, and states what is collected, who can see it, the purpose, the retention period and how to revoke. Without consent, the player gets no reminders and cannot submit, and staff see "Sin consentimiento" (no reason given). |
| BR-WELL-13 | **Minors** (16–17, BR-AUTH-05): consent must be given by a **guardian**. The player enters the guardian's name and email; the guardian receives N-17 (email) with a consent page. Wellness unlocks only after the guardian accepts. The request can be re-sent once every 24 h, and expires after 14 days. When the player turns 18, they confirm consent themselves before their next check-in. |
| BR-WELL-14 | **Revocation**: the player (or the guardian, through a link in the consent email) can revoke consent at any time. Collection stops immediately. The player can also choose "Borrar mi historial", which deletes all their check-ins within 30 days; otherwise history is kept under the retention policy (OQ-11). |
| BR-WELL-15 | **Retention**: check-ins are deleted 24 months after submission (OQ-11). Aggregated, non-identifiable statistics may be kept. |
| BR-WELL-16 | **Access logging**: every time staff view an individual's wellness data (board row expanded, history opened, AI tool access), the access is recorded (who, whose data, when). Access logs are kept for 24 months. |
| BR-WELL-17 | Players never see other players' wellness data. There is no wellness ranking. |
| BR-WELL-18 | Wellness data is never shown in push notification **content** on the lock screen. N-13 says "Hay una alerta de estado físico en Primera" with no name or body area. |

## 5. User stories

### WELL-01 · Give consent for wellness check-ins
**Release:** R2 · **Priority:** Must · **Size:** M · **Platforms:** Mobile, Web

As a player, I want to understand and accept how my physical-state data will be used before I share it.

**Acceptance criteria**
- The first time I open the check-in, I see a plain-language consent screen (BR-WELL-12) that names the people who will see my data (e.g. "el cuerpo técnico de Primera y Sub-20"). I must actively accept; there is no pre-ticked box.
- Consent is stored with version, timestamp and platform. I can review it later under Settings → Privacidad.

### WELL-02 · Guardian consent for minors
**Release:** R2 · **Priority:** Must · **Size:** M · **Platforms:** Mobile, Web, Email

As a 17-year-old player, I want to ask my parent to approve the check-ins so that I can use them like my teammates.

**Acceptance criteria**
- Minors see "Necesitamos la autorización de tu madre, padre o tutor/a" and a form for guardian name and email (BR-WELL-13).
- The guardian receives an email with a mobile-friendly consent page that explains the purpose, the data, who sees it and how to revoke. They accept by confirming their name and ticking the consent box.
- On acceptance, the player is notified (N-22) and wellness unlocks. N-22 also tells the player when the request expires or the email bounces. The player can see the request status (sent, accepted, expired) and re-send it.

### WELL-03 · Configure the check-in schedule
**Release:** R2 · **Priority:** Must · **Size:** S · **Platforms:** Web, Mobile

As a *profe*, I want to choose when my players are asked to check in so that I get the data before I plan the week.

**Acceptance criteria**
- In category settings ([F02](F02-clubs-categories-and-membership.md) CLUB-14), staff can enable or disable wellness and set the weekday and time (BR-WELL-01).
- The screen previews "Los jugadores recibirán el recordatorio los lunes a las 09:00".

### WELL-04 · Check-in reminders
**Release:** R2 · **Priority:** Must · **Size:** S · **Platforms:** Mobile, Server

As a player, I want a reminder when it's time to check in so that I don't forget.

**Acceptance criteria**
- N-11 and N-12 are sent per BR-WELL-05. Tapping them opens the check-in directly.
- The Home screen shows a "Check-in de la semana" card until I am covered. From R2, "Tu semana" (EVT-18) includes the check-in as its first step.

### WELL-05 · Submit a check-in
**Release:** R2 · **Priority:** Must · **Size:** M · **Platforms:** Mobile, Web

As a player, I want to report how I feel in a few taps so that my coaches can plan sensibly.

**Acceptance criteria**
- The flow has the questions in § 3. Answering "No" to pain lets me finish in **2 taps after the load question**, and the median completion time is under 30 seconds.
- The pain flow uses a front/back **body map** with tappable areas plus an accessible list alternative; up to 3 areas.
- Without a connection, submitting queues the check-in and shows the queued state (NFR-OFF-01).
- After submitting, I see a confirmation, and if I reported intensity ≥ 7 or *No puedo entrenar*, the disclaimer and advice from BR-WELL-11.

### WELL-06 · Correct today's check-in
**Release:** R2 · **Priority:** Must · **Size:** S · **Platforms:** Mobile, Web

As a player, I want to fix a mistake in today's check-in so that the data is right.

**Acceptance criteria**
- On the day of submission, "Editar" reopens the check-in pre-filled. Saving replaces it (BR-WELL-03).
- On later days, I submit a new check-in instead.

### WELL-07 · See my wellness history
**Release:** R2 · **Priority:** Should · **Size:** S · **Platforms:** Mobile, Web

As a player, I want to see my own trend so that I understand how my body is responding.

**Acceptance criteria**
- A chart of load over the last 12 weeks, plus a list of my pain reports by date.
- Only I and authorized staff can see it (BR-WELL-17).

### WELL-08 · Squad wellness board
**Release:** R2 · **Priority:** Must · **Size:** L · **Platforms:** Web, Mobile

As a *profe* or DT, I want a board of my squad's current state so that I can plan training load and spot problems.

**Acceptance criteria**
- Summary for the current cycle: response rate (BR-WELL-07), number of players per flag, average load, and share of players with pain.
- Player list: flag, load (with ▲▼ compared to the previous check-in), pain areas with intensity and impact, note indicator and last check-in date. Sorted by severity by default and filterable by flag and line.
- Players without consent or without recent data are grouped at the bottom.
- An aggregate body heat-map shows how many players report pain in each area (Should).
- Opening a player's details is recorded in the access log (BR-WELL-16).

### WELL-09 · Individual wellness history (staff)
**Release:** R2 · **Priority:** Must · **Size:** M · **Platforms:** Web, Mobile

As staff, I want to see a player's history so that I can tell a one-off from a trend.

**Acceptance criteria**
- Load chart (12 weeks, extendable), pain report timeline with areas and intensity, notes and flags.
- From R3, the player's attendance is overlaid (ANL-11). Access is logged.

### WELL-10 · Wellness flags in squad availability
**Release:** R2 · **Priority:** Should · **Size:** S · **Platforms:** Mobile, Web

As a DT, I want to see who is going **and** how they feel so that I adjust the session before it starts.

**Acceptance criteria**
- In EVT-11, staff see the current flag icon next to each invitee (BR-WELL-10). Tapping it opens the player's latest check-in (logged).
- The summary bar adds a "3 con alerta" chip for staff.

### WELL-11 · Critical alerts to staff
**Release:** R2 · **Priority:** Should · **Size:** S · **Platforms:** Mobile, Server

As a *profe*, I want to know immediately when a player reports they can't train so that I can contact them.

**Acceptance criteria**
- N-13 is sent per BR-WELL-09 and BR-WELL-18. It opens that player's check-in after authentication.

### WELL-12 · Revoke consent or delete my wellness data
**Release:** R2 · **Priority:** Must · **Size:** S · **Platforms:** Mobile, Web

As a player (or a guardian), I want to stop sharing my physical-state data and optionally erase it.

**Acceptance criteria**
- Settings → Privacidad → "Check-ins de estado físico" shows the consent status, the "Revocar" action and the option "Borrar mi historial" (BR-WELL-14).
- Revocation takes effect immediately: no more reminders, and staff see "Sin consentimiento".
- Guardians can revoke from the link in their consent email.

### WELL-13 · Request an extra check-in
**Release:** R3 · **Priority:** Could · **Size:** S · **Platforms:** Mobile, Web

As a *profe*, I want to ask the squad for a check-in now (e.g. before Saturday's match) so that I have fresh data.

**Acceptance criteria**
- "Pedir check-in" sends N-11 to consenting players without a check-in in the last 24 h. It is limited to one request per category per day.

### WELL-14 · Additional wellness items
**Release:** R3 · **Priority:** Could · **Size:** M · **Platforms:** Mobile, Web

As a *profe*, I want to add sleep, stress, muscle soreness and mood to the check-in so that I get a fuller picture (Hooper-style).

**Acceptance criteria**
- Each extra item can be enabled per category, uses a labelled 1–5 scale where higher is worse, and is included in the board and history. A composite wellness score is shown only when all four are enabled.

## 6. Edge cases

| Case | Expected behavior |
|---|---|
| A player is in two categories with different check-in moments | One reminder per 48 h at most (BR-WELL-05). One check-in covers both cycles when it falls in both windows (BR-WELL-04). |
| A player leaves a category | That category's staff lose access to the player's wellness data immediately (BR-ROLE-10). |
| A player has no consent but staff ask "how does Juan feel?" through the AI | The tool returns "sin consentimiento" with no data ([F09](F09-ai-coaching-assistant.md)). |
| A guardian email bounces | The request status shows "No pudimos enviar el email"; the player can correct the address. |
| The player's device date or time is wrong | The server timestamp decides the day and cycle. |
| A check-in is submitted with an unrealistic combination (e.g. intensity 9 with *Entreno normal*) | Accepted. The flag follows the most severe condition (red). |

## 7. Telemetry

Telemetry never includes wellness values. Events: `wellness_consent_given {by: player|guardian}`, `wellness_consent_revoked {delete_history}`, `wellness_checkin_submitted {duration_s, has_pain, source: reminder|home|weekly}`, `wellness_board_viewed`, `wellness_player_history_viewed`, `wellness_alert_opened`.

## 8. Open questions

- **OQ-05** Minors: is guardian consent by email enough? (legal)
- **OQ-10** Weekly vs. pre-session frequency; extra items.
- **OQ-11** Retention period (24 months?) and deletion behavior on revocation.
