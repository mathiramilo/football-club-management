# F04 — Attendance Analytics

> Status: **Draft v0.1** · Release: **R1** (core), R3 (advanced) · Owner: Product · Last updated: 2026-10-22
> Source: Notion "Métricas sobre prácticas y partidos" · Related: [F03](F03-events-and-attendance.md) · [F07](F07-player-wellness.md) · OQ-09, OQ-16, OQ-19

## 1. Goal

Turn RSVP and roll-call data into decisions:
- Who is committed and who is drifting away.
- Which training days work.
- Which lines are short.

The analytics must be **trustworthy**: every number shows its denominator and has an explanation one tap away.

From the Notion brief:
- Players, coaches and DTs can see metrics on practices and matches.
- Attendance percentages by day and by position, and individually per player.

Refinements made in this document:
- The overview calls this "Performance & Attendance Analytics", but the brief only defines **attendance**. Performance (goals, minutes, ratings) is undefined, so it is out of scope until specified (OQ-16). This feature is named **Attendance Analytics**.
- Every metric is defined precisely, in particular **confirmation** (RSVP) vs. **attendance** (roll call).
- "By day" is interpreted as **by weekday** (e.g. Tuesday vs. Thursday practices) plus a **trend over time**.
- Roll-call completion is surfaced as a **data-quality** metric.

## 2. Scope

| In (R1) | R3 / Later |
|---|---|
| Player: my attendance summary | Seasons as filters (Later, OQ-19) |
| Staff: category dashboard (trend, by event type) | Wellness × attendance insights |
| Staff: per-player table, at-risk players | CSV / PDF export |
| By position line, by weekday | Selection rate (after squad selection, EVT-21) |
| RSVP behavior (response rate, response time, no-shows, late drop-outs) | Match performance stats (OQ-16) |
| Player ranking (visibility per category, OQ-09) | Club comparisons over seasons |
| Club-wide overview (Club Admins) | Gamification (badges, streaks) |
| Filters: period, event type, category | |

## 3. Metric definitions

### 3.1 Eligible events

For any metric, an event is **eligible** if all of the following hold:
1. it is not cancelled,
2. its start time is within the selected period,
3. it matches the filters (type, category), and
4. for the attendance metrics, roll call has been saved (`completed`).

Events in the `attendance_missing` state are excluded from attendance metrics and counted in the **data quality** indicator.

A player is counted for an event only if they were an **invitee** of it.

### 3.2 Player metrics (for player *p*, over the eligible events where *p* was invited)

| Metric | Formula | Display |
|---|---|---|
| **Attendance rate** | (present + late) ÷ invited events with roll call | "12/16 · 75%" |
| **Punctuality** | late ÷ (present + late) | "2 llegadas tarde" |
| **Justified absences** | absent with `absence_justified` ÷ invited events with roll call | count and % |
| **Unjustified absences** | absent without `absence_justified` ÷ invited events with roll call | count and % |
| **No-shows** | events where RSVP was `going` at start time and attendance is `absent` | count |
| **Response rate** | events answered **before the deadline** ÷ invited events whose deadline has passed (roll call not required) | "90% respondió a tiempo" |
| **Median response lead time** | median of (event start − first response time) | "responde 2 días antes" |
| **Late drop-outs** | late changes from `going` to `not_going` (glossary) | count |
| **Current streak** | consecutive most recent events with present or late | "🔥 6 seguidas" |

### 3.3 Category metrics (category *c*)

- Events counted: eligible events linked to *c*.
- Invitations counted: invitees of those events who were **players of *c* on the event date** (active category membership, BR-CLUB-06), plus call-ups and walk-ins, which are **included by default** with a toggle to show members only. A player invited only through another linked category (e.g. a *Sub-20* player at a joint *Primera* + *Sub-20* practice) does not count for *c*.
- **Category attendance rate** = Σ(present + late) ÷ Σ invitations with roll call.
- **By line**: the same rate grouped by each invitee's **current** primary-position line. Using the current line is a deliberate simplification: positions rarely change, and storing position history is Later.
- **By weekday**: the same rate grouped by the event's local weekday, optionally split by start hour bucket (morning before 12:00, afternoon 12:00–18:00, evening after 18:00).
- **Trend**: rate per ISO week over the period, plus a 4-week moving average.
- **Response metrics**: the category-level aggregates of § 3.2.

### 3.4 Thresholds and minimum data

| ID | Rule |
|---|---|
| BR-ANL-01 | A rate based on fewer than **3** eligible events shows "Pocos datos" instead of a percentage. |
| BR-ANL-02 | **At-risk player**: attendance rate below **60%** over their last **8** eligible events, with at least 4 events. Per-category configuration of both values is Later. |
| BR-ANL-03 | **Data quality** = completed events ÷ (completed + `attendance_missing`) in the period. A banner is shown below 80%: "3 actividades sin lista; las métricas pueden no ser exactas". |
| BR-ANL-04 | Every percentage is shown with its numerator and denominator, and links to a "¿Cómo se calcula?" explanation. |
| BR-ANL-05 | Metrics reflect new RSVPs and roll calls within **5 minutes** (computed on read in R1; pre-aggregated later if needed — see [NFR](../tech/05-non-functional-requirements.md)). |
| BR-ANL-06 | **Player visibility** (OQ-09): a player always sees their own metrics and team aggregates. They see teammates' individual rates and the ranking only if the category setting "Mostrar ranking de asistencia" is on (default on). Absence reasons are never shown to players. |
| BR-ANL-07 | Default period: last 8 weeks. Presets: 4 weeks, 8 weeks, 3 months, this year, custom range. Seasons come Later (OQ-19). |
| BR-ANL-08 | Managed profiles are included in every staff metric. Players who left the category appear in historical views with a "Ya no está en la categoría" tag and are hidden from the default "current squad" filter. |

## 4. User stories

### ANL-01 · See my attendance
**Release:** R1 · **Priority:** Must · **Size:** M · **Platforms:** Mobile, Web

As a player, I want to see my attendance and my streak so that I know where I stand.

**Acceptance criteria**
- "Mis estadísticas" shows my attendance rate, streak, justified and unjustified absences, and response rate for the selected period, per category (BR-ANL-01, BR-ANL-04).
- It includes a list of my last 10 eligible events with my status in each.
- When I belong to several categories or clubs, I see one section per category.

### ANL-02 · Category attendance dashboard
**Release:** R1 · **Priority:** Must · **Size:** L · **Platforms:** Web, Mobile

As a DT, I want a dashboard of my category's attendance so that I see the trend and decide on training load and selection.

**Acceptance criteria**
- Headline tiles: attendance rate (practices), attendance rate (matches), response rate, and events in the period, each with its denominator.
- A weekly trend chart with a 4-week moving average.
- A data-quality banner when BR-ANL-03 applies, linking to the events without roll call.
- Filters: period (BR-ANL-07), event type, and members-only vs. including call-ups.
- Mobile shows the tiles and a simplified trend; web shows everything.

### ANL-03 · Per-player attendance table
**Release:** R1 · **Priority:** Must · **Size:** M · **Platforms:** Web, Mobile

As a DT, I want a table of all my players' attendance so that I can compare commitment fairly.

**Acceptance criteria**
- Columns: player (photo and name), line, attendance rate with fraction, late, justified, unjustified, no-shows, response rate and streak.
- The table can be sorted by any column. Rows below the at-risk threshold (BR-ANL-02) are highlighted with an icon, not by color alone.
- Selecting a row opens the player detail (ANL-07).
- The default filter is "current squad" (BR-ANL-08).

### ANL-04 · Attendance by position line
**Release:** R1 · **Priority:** Must · **Size:** S · **Platforms:** Web, Mobile

As a DT, I want to see attendance per line so that I spot, for example, that defenders rarely come on Tuesdays.

**Acceptance criteria**
- A bar per line (GK, DEF, MID, FWD, no position) shows the rate and the fraction (§ 3.3).
- It can be combined with the weekday breakdown on web (matrix: line × weekday).

### ANL-05 · Attendance by weekday
**Release:** R1 · **Priority:** Must · **Size:** S · **Platforms:** Web, Mobile

As a DT, I want to compare attendance by training day so that I can decide whether to move or drop a session.

**Acceptance criteria**
- A bar per weekday that had events in the period, with rate, fraction and number of events. The hour bucket split is optional.
- Weekdays with fewer than 3 events show "Pocos datos" (BR-ANL-01).

### ANL-06 · Response behavior
**Release:** R1 · **Priority:** Should · **Size:** S · **Platforms:** Web, Mobile

As a DT, I want to know who answers late, changes late or doesn't show up so that I can talk to them.

**Acceptance criteria**
- The category's response rate and median response lead time, plus top lists for "más cambios tardíos" and "más faltazos" (no-shows) over the period.

### ANL-07 · Player detail (staff view)
**Release:** R1 · **Priority:** Must · **Size:** M · **Platforms:** Web, Mobile

As staff, I want a player's full attendance history so that I can back up conversations with facts.

**Acceptance criteria**
- Shows the ANL-01 metrics plus the full event list with RSVP history (including late changes and proxies), attendance, and absence reasons and notes.
- From R2, a wellness summary links to [F07](F07-player-wellness.md) when the viewer has access.

### ANL-08 · Team attendance ranking (players)
**Release:** R1 · **Priority:** Should · **Size:** S · **Platforms:** Mobile, Web

As a player, I want to see the team's attendance ranking so that I'm motivated to keep showing up.

**Acceptance criteria**
- Shown only when the category setting allows it (BR-ANL-06). The list is sorted by attendance rate and then by streak, with my own row highlighted.
- It contains no absence reasons and no unjustified/justified breakdown.

### ANL-09 · Club-wide overview
**Release:** R1 · **Priority:** Should · **Size:** M · **Platforms:** Web

As a Club Admin, I want to compare categories so that I know which ones need support.

**Acceptance criteria**
- One row per active category: attendance rate, response rate, events, players, data quality and at-risk player count.
- Selecting a row opens that category's dashboard.

### ANL-10 · Export attendance
**Release:** R3 · **Priority:** Should · **Size:** S · **Platforms:** Web

As a DT or Club Admin, I want to download attendance data so that I can share it with the board or analyze it in a spreadsheet.

**Acceptance criteria**
- CSV export of the per-player table and of the raw event × player matrix for the current filters. File names include category and period.

### ANL-11 · Wellness and attendance insights
**Release:** R3 · **Priority:** Could · **Size:** M · **Platforms:** Web

As a *profe*, I want to see attendance next to wellness trends so that I can correlate load and availability.

**Acceptance criteria**
- A combined weekly chart of category attendance rate and average load ([F07](F07-player-wellness.md)), plus the share of players with pain. Visible only to staff with wellness access.

## 5. Edge cases

| Case | Expected behavior |
|---|---|
| A player moved from *Sub-20* to *Primera* mid-period | Each category counts the player's invitations from the days they were its member (§ 3.3), plus call-ups to its events. The player's personal view shows both categories. |
| An event linked to two categories | It counts in both categories' metrics, each with its own members plus call-ups (§ 3.3). Each invitee counts once in their own personal metrics. |
| A walk-in added during roll call | Source `walk_in`; counts like a call-up who was present. |
| All events in the period lack roll call | Attendance tiles show "Sin datos de asistencia". Response metrics are still shown. |
| A player deleted their account | Rows are anonymized ("Ex-jugador/a #12") and still count in category aggregates. |

## 6. Telemetry

`analytics_viewed {view, role, period}`, `analytics_filter_changed {filter}`, `player_detail_viewed`, `ranking_viewed`, `export_downloaded {kind}`.

## 7. Open questions

- **OQ-09** Do players see teammates' individual rates by default?
- **OQ-16** Define "performance" (match stats) and when it ships.
- **OQ-19** Seasons: date-range filters until seasons ship (Later).
