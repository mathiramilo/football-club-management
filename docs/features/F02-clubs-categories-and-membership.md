# F02 — Clubs, Categories & Membership

> Status: **Draft v0.1** · Release: **R1** · Owner: Product · Last updated: 2026-10-22
> Source: Notion "División por categorías" · Related: [Roles](../product/02-personas-and-roles.md) · [F01](F01-accounts-and-onboarding.md) · [F03](F03-events-and-attendance.md) · OQ-01, OQ-08, OQ-21

## 1. Goal

Let a club coordinator set up the club, its categories and its people **in one evening**, and keep rosters accurate as players move between categories during the season.

From the Notion brief:
- Each club can have several categories (e.g. *Mayor*, *Reserva*, *Sub-20*).
- Each player, *profe* and DT can belong to several categories.
- Each activity can be defined for one or more categories.
- DTs can assign players to categories dynamically.

Refinements made in this document:
- A club-level **Club Admin** role (see [Roles](../product/02-personas-and-roles.md)).
- **Invite links** with optional approval.
- **Managed profiles** for players without the app.
- Membership **history** (start and end dates), so analytics stay correct when players move.
- Category **format** and **gender** attributes (OQ-21).

## 2. Scope

| In (R1) | R2 / Later |
|---|---|
| Create and edit a club; Owner and Club Admins | Bulk import from CSV or spreadsheet paste (R2) |
| Categories with templates, format, gender, age group, settings | Seasons and season rollover (Later, OQ-19) |
| Invite links and codes (player and staff), join requests | Audit-log viewer for admins (Later) |
| Managed (account-less) player profiles and claim links | Guardian contacts (Later) |
| Member directory; assigning, moving and removing members | Medical clearance (*ficha médica*) expiry tracking (Later, OQ-17) |
| Venues | Fee and payment tracking (*cuotas*) (Later, OQ-17) |
| Category settings (event defaults, reminders, visibility) | |
| Admin onboarding checklist; delete club | |

## 3. Business rules

| ID | Rule |
|---|---|
| BR-CLUB-01 | A club requires a name (2–60 characters), country and time zone (defaulted from the device). Optional: short name (≤ 12 characters, used in compact UI), crest (square image, ≤ 500 KB after on-device compression) and primary/secondary colors. |
| BR-CLUB-02 | Category names are unique, case- and accent-insensitive, among the club's non-archived categories. |
| BR-CLUB-03 | Category attributes: name and format (required, default `f11`); optional gender (`men`, `women`, `mixed`), age group (free text, e.g. "Sub-20"), calendar color, and a minimum number of players for practice. |
| BR-CLUB-04 | **Archiving** a category with future events requires confirming what happens to them: events linked only to this category are cancelled (sends N-06); events also linked to other categories stay scheduled, the archived category is unlinked from them, and its players are removed per BR-CLUB-05. Archiving ends all its memberships. History stays available in analytics. Club Admins can restore an archived category; restoring does not restore memberships. |
| BR-CLUB-05 | **Roster changes propagate to future events.** When a player's category membership starts, they are added as a `pending` invitee to every event of that category that has not started. They get no individual invitation for events more than 7 days away; the weekly agenda covers those. When a membership ends, the player is removed from events of that category that have not started, **unless** they were individually called up or are still eligible through another linked category. Past invitations are never changed. |
| BR-CLUB-06 | **Move** (transfer) with effective date D (default today; a future date is allowed) ends membership A on the day before D and starts membership B on D. **Add** creates membership B from D and keeps A (dual membership, e.g. a *Sub-20* player who also trains with *Primera*). Membership dates are **inclusive calendar days** in the club time zone: `starts_on` is the first day as a member and `ends_on` the last (see also BR-ROLE-10). |
| BR-CLUB-07 | Every staff member of the club can see the club directory (to call up players from other categories): name, photo, categories, positions and status. **Email and phone** are visible only to Club Admins and to staff of the member's own categories. |
| BR-CLUB-08 | Invite links are created per category and role. Player links require approval by default (OQ-08); a DT or Club Admin who creates one can turn that off. **Player links created by Coaches always require approval**, because Coaches cannot add players to rosters. **Staff links always require approval**, because staff can access health-related data. DT links can only be created by Club Admins; Coach links by Club Admins or DTs. |
| BR-CLUB-09 | Join requests expire after 30 days. Player and Coach requests are approved by the category's DTs or the Club Admins. **DT requests are approved by Club Admins only**, since only Club Admins can grant the DT role. |
| BR-CLUB-10 | **Duplicate detection** runs when staff create a managed profile, when a join request is created, and when someone joins directly through a link without approval. A match is a club member with the same normalized full name (case- and accent-insensitive) or the same email. On creation and on review, staff see a warning with a **Merge** action (BR-AUTH-11). On a direct join, the join completes, and a "Posible duplicado" item with the same **Merge** action appears in the category's join-requests screen for its approvers (BR-CLUB-09), notified through N-09. |
| BR-CLUB-11 | Managed profile fields: first and last name (required); nickname, positions, jersey number, birthdate, email and phone (optional). Email and phone are only used to send the claim link and only when staff choose to. The platform never sends marketing to managed profiles. |
| BR-CLUB-12 | Removing a member from the club ends all their category memberships and revokes access immediately. Data is retained per the retention policy ([Privacy](../product/06-privacy-and-compliance.md#6-retention)). If the same account rejoins later, its history reconnects. |
| BR-CLUB-13 | **Club deletion** is Owner-only and requires typing the club name. The club is hidden immediately and permanently deleted after 30 days, with all its data (events, attendance, content, wellness). During those 30 days the Owner can restore it. Club Admins are notified (N-19). |
| BR-CLUB-14 | **Category settings defaults**: <br>• Practice duration 90 min. <br>• Match duration 105 min (`f11`), 80 min (`f9`, `f8`, `f7`), 60 min (`f5`, `futsal`). <br>• RSVP deadline: 2 h before start for practices and other events, 24 h before for matches (range 0–72 h). <br>• Lock after deadline: off. <br>• Reminders to non-responders: 24 h before start and 1 h before the deadline. A reminder that would fall at or after the deadline, or within 2 h of another reminder for the same event, is skipped (BR-NOTIF-13). <br>• Weekly agenda digest: Monday 10:00. <br>• Players can see teammates' individual attendance: on (OQ-09). |
| BR-CLUB-15 | A category warns Club Admins when it has no DT, and staff when it has no players. Neither blocks usage. |

## 4. User stories

### CLUB-01 · Create a club
**Release:** R1 · **Priority:** Must · **Size:** M · **Platforms:** Web, Mobile

As a club coordinator or DT, I want to create my club so that I can bring my categories and players into the app.

**Acceptance criteria**
- From the first-run choice "Crear un club", I enter name, country and time zone (required), plus crest and colors (optional) (BR-CLUB-01).
- On creation I become Owner and Club Admin (BR-ROLE-06), and I am asked "¿También dirigís una categoría?". If yes, I create or select a category and become its DT.
- I land on the club home. Once CLUB-15 ships (GA), the home shows the admin onboarding checklist.

### CLUB-02 · Edit club profile and settings
**Release:** R1 · **Priority:** Must · **Size:** S · **Platforms:** Web, Mobile

As a Club Admin, I want to edit the club's profile so that it stays accurate.

**Acceptance criteria**
- I can edit every field from CLUB-01. Changing the time zone shows a warning that future event times will be shown in the new zone, and stored instants are not shifted.
- Changes appear for all members on their next refresh.

### CLUB-03 · Create categories
**Release:** R1 · **Priority:** Must · **Size:** M · **Platforms:** Web, Mobile

As a Club Admin, I want to create the club's categories quickly, starting from common templates, so that the structure mirrors the real club.

**Acceptance criteria**
- Templates for common category names (*Primera / Mayor*, *Reserva*, *Sub-20*, *Sub-18*, *Sub-16*, *Femenino*, *Senior / Veteranos*, *Futsal*) can be selected together and edited before saving.
- Each category has the attributes in BR-CLUB-03. Duplicate names are rejected (BR-CLUB-02).
- New categories get the default settings from BR-CLUB-14.

### CLUB-04 · Edit or archive a category
**Release:** R1 · **Priority:** Must · **Size:** S · **Platforms:** Web, Mobile

As a Club Admin, I want to rename or archive a category so that the structure follows the season.

**Acceptance criteria**
- Renaming keeps all history.
- Archiving follows BR-CLUB-04, including a confirmation that lists the future events that will be cancelled.
- Archived categories appear under an "Archivadas" filter and can be restored by Club Admins.

### CLUB-05 · Create and share invite links
**Release:** R1 · **Priority:** Must · **Size:** M · **Platforms:** Web, Mobile

As a DT or Club Admin, I want a link I can paste in the team's WhatsApp group so that players add themselves to the category.

**Acceptance criteria**
- From a category I can create an invite link for **players** or **staff** (respecting BR-CLUB-08), with approval on or off, an expiry (BR-AUTH-10) and an optional maximum number of uses.
- "Compartir" opens the native share sheet with a ready message ("Sumate a **Primera** de **Club X** en la app: <link>") and the link preview shows crest, club and category.
- I can see active links with their use count, copy them, show the 6-character code (from GA, AUTH-07) and revoke them.
- A default player link is created automatically with each category. It never expires and has no use limit; revoking it immediately creates a new default link. Its approval setting follows BR-CLUB-08.

### CLUB-06 · Review join requests
**Release:** R1 · **Priority:** Must · **Size:** M · **Platforms:** Web, Mobile

As a DT or Club Admin, I want to approve or reject join requests quickly so that only real players get in.

**Acceptance criteria**
- New requests trigger N-09 to approvers, debounced to at most one notification per category every 30 minutes.
- The requests list shows name, photo, age, the positions the player selected, the link used and the request date, plus duplicate warnings with a **Merge** action (BR-CLUB-10).
- I can approve or reject one request, or approve all. Approving adds the player to the category (BR-CLUB-05) and sends N-10.
- Requests expire after 30 days (BR-CLUB-09).

### CLUB-07 · Add players without an account (managed profiles)
**Release:** R1 · **Priority:** Must · **Size:** M · **Platforms:** Web, Mobile

As a DT, I want to add my players by name even if they haven't installed the app so that I can track the whole squad from day one.

**Acceptance criteria**
- "Agregar jugadores" lets me add several players in one go (one row each: first name, last name, optional position and number). On web I can paste a list of names, one per line.
- Managed profiles show a "Sin cuenta" badge everywhere staff see them, and a "Enviar link" action that generates a claim link (AUTH-09).
- Managed profiles are invited to events, can be RSVP'd by proxy (EVT-12) and appear in roll call.
- Duplicate warnings apply (BR-CLUB-10).

### CLUB-08 · Browse the club member directory
**Release:** R1 · **Priority:** Must · **Size:** M · **Platforms:** Web, Mobile

As staff, I want to search all club members so that I can find a player and see where they play.

**Acceptance criteria**
- The list can be searched by name or nickname and filtered by category, role (DT, Coach, Player), status (active, pending, managed) and position line.
- Each row shows photo, display name, categories with role badges and primary position. Contact details follow BR-CLUB-07.
- On web the list is paginated or virtualized and stays responsive with 1,000 members.

### CLUB-09 · Assign a member to categories and roles
**Release:** R1 · **Priority:** Must · **Size:** M · **Platforms:** Web, Mobile

As a Club Admin (or a DT for my own categories), I want to assign a person to a category with a role so that they get the right access.

**Acceptance criteria**
- From a member's profile I can add a category membership with a staff role (DT, Coach or none), an optional staff title (for Coach), the `is_player` flag and a start date, within the limits in [Roles § 4.1](../product/02-personas-and-roles.md#41-club-and-membership).
- Invalid combinations are rejected (BR-ROLE-03).
- The member is notified (N-18), and future events are updated (BR-CLUB-05).

### CLUB-10 · Move a player to another category
**Release:** R1 · **Priority:** Must · **Size:** M · **Platforms:** Web, Mobile

As a DT or Club Admin, I want to move a player from *Sub-20* to *Primera*, or add them to both, so that rosters follow the season.

**Acceptance criteria**
- "Mover" and "Agregar a otra categoría" are both available and explained in plain language (BR-CLUB-06), with an effective date (default today).
- A DT can use "Agregar a otra categoría" to bring any club member into a category they lead. "Mover" ends the source membership, so a DT can use it only when they lead **both** the source and the destination category. Otherwise a Club Admin moves the player, or the DT uses "Agregar" and the source category's DT or a Club Admin ends the old membership.
- For a move effective 12/10/2026, the history shows "Primera desde 12/10/2026 · Sub-20 hasta 11/10/2026" (BR-CLUB-06).
- The affected future events update per BR-CLUB-05, and the player receives N-18.

### CLUB-11 · Remove a member from a category or from the club
**Release:** R1 · **Priority:** Must · **Size:** S · **Platforms:** Web, Mobile

As a DT (category) or Club Admin (club), I want to remove people who no longer belong so that lists and stats stay clean.

**Acceptance criteria**
- Removing from a category ends that membership (BR-ROLE-10). Removing from the club follows BR-CLUB-12.
- A confirmation shows the consequences (e.g. "Se lo quitará de 6 actividades futuras").
- The removed member receives N-18.

### CLUB-12 · Manage Club Admins and transfer ownership
**Release:** R1 · **Priority:** Must · **Size:** S · **Platforms:** Web, Mobile

As the Owner, I want to grant admin rights to other coordinators and transfer ownership so that the club doesn't depend on one person.

**Acceptance criteria**
- Club Admins can grant or revoke Club Admin for other members; nobody can revoke the Owner's admin status.
- The Owner can transfer ownership to another Club Admin, who must accept within 7 days. Until they accept, nothing changes.
- All changes are recorded in the audit log. The member whose admin status or ownership changed gets N-18; the other Club Admins get N-19.

### CLUB-13 · Manage venues
**Release:** R1 · **Priority:** Should · **Size:** S · **Platforms:** Web, Mobile

As staff, I want to save the places where we train and play so that I don't retype addresses for each event.

**Acceptance criteria**
- A venue has a name (required), plus an optional address, map URL and notes (e.g. "entrada por calle X"). When a map URL is pasted, coordinates are extracted from it where possible.
- Venues are shared across the club and can be selected when creating events. A venue can only be deleted if no future events use it; otherwise it is archived.

### CLUB-14 · Configure category settings
**Release:** R1 · **Priority:** Must · **Size:** M · **Platforms:** Web, Mobile

As a DT or Club Admin, I want to set my category's defaults so that new events and reminders behave the way my team works.

**Acceptance criteria**
- I can edit every default in BR-CLUB-14. Changes apply to events created afterwards. Reminder changes also apply to future events that already exist.
- The wellness schedule is **not** part of category settings. It lives in the category's wellness screen (WELL-03) because its permissions differ ([Roles § 4.5](../product/02-personas-and-roles.md#45-wellness-health-related-data)).
- Each setting shows its default and a one-line explanation.

### CLUB-15 · Follow an onboarding checklist
**Release:** R1 · **Priority:** Should · **Size:** S · **Platforms:** Web, Mobile

As a new Club Admin, I want a checklist so that I know the next step to get my club running.

**Acceptance criteria**
- The checklist steps are: 1) create categories, 2) invite staff, 3) invite players or add managed profiles, 4) create the first practice (recurring), 5) share the practice link. Each step deep-links to the right screen and ticks itself off automatically.
- The checklist can be dismissed, and it disappears once all steps are done.

### CLUB-16 · Import players in bulk
**Release:** R2 · **Priority:** Could · **Size:** M · **Platforms:** Web

As a Club Admin, I want to import a roster from a spreadsheet so that large clubs can onboard quickly.

**Acceptance criteria**
- I can upload a CSV file, or paste from Google Sheets or Excel, with these columns: first name, last name, nickname, category, position, number, birthdate, email.
- A preview validates every row, flags duplicates and unknown categories, and lets me fix problems before import. Imported players are created as managed profiles.

### CLUB-17 · Delete the club
**Release:** R1 · **Priority:** Should · **Size:** S · **Platforms:** Web

As the Owner, I want to delete the club so that its data is removed when we stop using the product.

**Acceptance criteria**
- Deletion follows BR-CLUB-13, including a 30-day restore period and an explicit list of what will be deleted.

## 5. Edge cases

| Case | Expected behavior |
|---|---|
| A player belongs to two categories linked to the same event | Invited once. Category attribution for analytics follows [F04 § 3](F04-attendance-analytics.md#3-metric-definitions). |
| A DT removes their own DT role | Allowed. If no other DT remains, the confirmation warns that the category will have no DT, and Club Admins see the BR-CLUB-15 warning. |
| A player is moved with a future effective date | Events before that date keep the current invitations; events from that date onwards are re-evaluated by a scheduled job on that date. |
| The approver is also the requester (staff link used by an admin) | Auto-approved. |
| A category is archived while players have pending RSVPs | The events are cancelled (N-06) and the RSVPs are kept for audit. |
| Two clubs with the same name | Allowed. Clubs are distinguished by crest, short name and country. |

## 6. Telemetry

`club_created {country}`, `category_created {format, from_template}`, `invite_link_created {role, approval_required}`, `invite_link_shared {channel}`, `join_request_decided {decision, hours_to_decision}`, `managed_profiles_created {count}`, `member_moved {type: move|add}`, `onboarding_step_completed {step}`.

## 7. Open questions

- **OQ-01** Confirm the role model (DT per category, separate Club Admin).
- **OQ-08** Default approval for player links.
- **OQ-17** Payments and medical clearance tracking: future modules?
- **OQ-21** Women's, mixed and futsal categories at launch? (Recommendation: yes. They are attributes only, with no extra logic.)
