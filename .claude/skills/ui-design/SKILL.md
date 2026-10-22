---
name: ui-design
description: Shape, critique or polish UI for this product's staff portal, public link pages and Expo app so screens look designed rather than generic - surface mode, one question per screen, typography, color and club theming, control states, data tables, KPIs, charts, motion, copy, a refuse list of generic-AI patterns, and a polish order. Use when designing a new screen, reviewing or polishing an existing one, or when UI looks bland, cluttered or inconsistent. Pair with web-page or mobile-screen for the build.
argument-hint: <shape | critique | polish> <screen, S-xx or path>
---

# UI design

Adapted for this project from Impeccable ([pbakaus/impeccable](https://github.com/pbakaus/impeccable), Apache-2.0), taste-skill's app-screen guidance (MIT), Emil Kowalski's skills (MIT), ui-ux-pro-max (MIT), Jakub Krehel's `better-*` skills (MIT), Dammyjay93's interface-design (MIT), Expo's design-system skill (MIT) and Vercel's Web Interface Guidelines (MIT). See `.claude/skills/THIRD_PARTY.md`. Project rules win over all of them: tokens from `packages/ui-tokens`, copy from `packages/i18n`, WCAG 2.2 AA, status never by color alone, field mode, low-end Android, and the 150 KB public-page budget.

## 0. Context first

- Read the screen in `docs/ux/01-information-architecture-and-flows.md` (inventory `S-xx`, its flow, § 6 voice and § 7 visual notes) and the feature spec of its story.
- Name the user and the scene: a player on a bus with one bar of signal, a DT at the field at night under floodlights, a coordinator at a desk. The scene decides contrast, density and target sizes.
- Read the tokens in `packages/ui-tokens` and the existing primitives before inventing anything.

## 1. Pick the mode

- **Operate** (almost every screen: staff portal, agenda, roll call, availability, settings): the user completes a task. Precision and restraint; familiar patterns earn their place; the brand lives in details (club accent, crest).
- **Persuade, lightweight** (public `/e/…`, `/j/…`, `/c/…` pages): one job, RSVP or join, fast and trustworthy. No hero sections or decorative imagery.
- **Read** (help, legal, consent pages): structure for comprehension.

Choose light, dark or high contrast from the scene, not the product category: roll call and availability need the field-mode style; night use needs a well-tested dark mode.

## 2. `shape`: plan before code

Write down, before any JSX:
1. The one question the screen answers ("¿Quiénes van el martes?") and its one primary finding or action.
2. The primary CTA (≤ 3 words, *voseo*).
3. What is visible without scrolling on a 360 dp Android phone, or at 1280 px for the portal.
4. Every state: loading, empty, error, offline, partial data, permission-dependent.

The biggest block answers the question. The most frequent job is one tap or click away.

For a new surface or a visual direction (the app shell, the public pages, a design-system pass), not for every screen, explore the domain before any visuals:
- At least five concepts from the club's world (chalk lines on the pitch, floodlights, kits and crests, the team sheet, the tactics board) and the colors that really exist there.
- One signature element that could only belong to this product, and three defaults you are rejecting.
- Then test it. Remove the product name: can you still tell what it's for? Swap the typeface or layout for the usual one: if nothing changes, you defaulted there. Squint: does one thing still lead?

## 3. Craft floor (every UI edit)

**Typography**
- One family, from the tokens. A fixed scale with ratio 1.125–1.2; no fluid `clamp()` in app UI.
- Web body text ≥ 16 px; mobile follows dynamic type up to 200%.
- Tabular figures for every number that is compared (counts, rates, times).

**Color**
- Tokens only. The club's primary color is an accent (header, active tab), never a background for body text, and always contrast-checked.
- Secondary text on a colored surface is derived from that surface's hue, never plain grey.
- Icons, control borders and focus rings need 3:1 contrast. Test dark mode contrast on its own.
- Keep status hues (Voy green, No voy red, warning amber) at least 15° of OKLCH hue away from the club accent. When a club's color is itself green or red, the accent stays on chrome and never marks status.
- Measure contrast on the rendered pair, and fix a failing pair by changing lightness, not hue. White text on a Tailwind `500` fill usually fails 4.5:1; use `600`. Each club sets its own colors, so fill and text steps come from a contrast check, never the raw club hex.

**States**
- Every control: default, hover (web), focus-visible, pressed, disabled, loading, error.
- Skeletons, not spinners. Delay loaders 150–300 ms, then keep them ≥ 300 ms. Loading copy ends with "…" ("Guardando…").
- Pressed states never shift layout.

**Layout**
- Spacing from the token scale. Dropdowns and popovers portal out of `overflow` containers (table row menus).
- Status is color + icon + label: Voy ✓ green, No voy ✕ red, Sin responder ? grey; wellness flags with icon and text.
- Design with worst-case synthetic data: "María José de la Cruz Fernández" and "Jo", "1 integrante" and "128 integrantes", zero invitees, "Sub-17 Femenino B (tarde)". Rows use `min-height`, never a fixed height; grid tracks use `minmax(0, 1fr)`; a truncated value always has a way to be read whole.

**Refuse list** (generic-AI tells; don't ship them):
- Grids of identical icon + heading cards.
- A big-number hero, or icon circles and sparklines on every KPI.
- Small uppercase labels above every heading.
- Gradient text, glass effects as decoration, thick colored left borders on cards or alerts.
- Emoji as icons (the wellness flag dots in the spec are the documented exception, always paired with text).
- A modal as the first idea; centered everything; zebra-striped tables; accent colors that aren't tokens.

## 4. Data screens (portal and staff mobile)

**KPIs**: one container split by dividers, label above value, value 24–30 px. Always numerator and denominator (BR-ANL-04); "Pocos datos" below the minimum (BR-ANL-01). Color a change by whether it is good or bad, not by its direction. Zero or undefined is grey; a change from zero reads "+4 (nuevo)".

**Tables**
- Numbers right-aligned in tabular figures; headers small, grey, sentence case.
- Sort arrow only on the active column. A missing value is a grey dash; a real 0 is printed.
- At most one status mark per row; chips never wrap or squeeze.
- Sticky headers must not hide the focused row (WCAG 2.4.11).

**Charts**: one hue per chart and at most four per screen; 2 px lines, no gradient fill, 3–5 faint gridlines. An empty chart draws the zero line and one sentence. Provide a table or text alternative.

**State in the URL** (web): filters, sort, pagination and tabs live in search params so views can be shared and reloaded.

## 5. Mobile specifics

- Touch targets ≥ 44×44 pt (48 dp): use `hitSlop` rather than growing the visual. Primary actions on field screens sit in the thumb zone and work one-handed.
- Pickers and filters in bottom sheets. Use the platform's stack header and navigation; never hand-roll headers or screen transitions.
- Avoid these: custom centered modal dialogs, a full-screen spinner between states, inputs hidden by the keyboard, `TouchableOpacity` (use `Pressable`).
- Motion goes through the `expo-animation` skill and its frequency gate.
- Tokens, primitives and drift audits follow the `expo-design-system` skill. Review against its 20 named native tells (`references/native-slop.md`: The Web Modal, Everything's a Card, Wireframe Borders, 16-Everything, The Squish Reflex, The Grand Entrance, Keyboard Blindness, Dark-Mode Amnesia, …) and name the tell in findings.
- Behavior pass before calling a screen done: every enabled control does something; a form never closes before its save succeeds or is queued offline; walk the main task once with a failure and its recovery; data and error messages are selectable text.
- On Android, also check with `adb shell settings put system font_scale 2.0` and `adb shell cmd uimode night yes`.

## 6. Motion

Motion only shows a state change: 150–250 ms, ease-out, no page-load choreography. Web: animate `transform` and `opacity` only, never `transition: all`. Reduced motion keeps the state change (opacity, color) and drops movement.

## 7. Copy

Follow the `i18n-and-copy` rule. An action keeps one name across its states ("Publicar" → "Publicado"). Errors say what happened and what to do. Empty states explain the value and the next step.

Undo beats confirmation. Routine, reversible actions (changing an RSVP, a roll-call mark) happen at once and offer "Deshacer". Confirm only what can't be undone, affects other people or touches many items: cancelling or editing an event notifies its invitees, so its dialog says how many (EVT-03). The title names the action and its object ("¿Cancelar la práctica del martes?"), the confirm button repeats it ("Cancelar práctica"), and the dismiss button is "Volver". Never "Sí / No" or "Aceptar".

## 8. `critique`

Review the screen (code and, when possible, the rendered result) against sections 1–7, the `accessibility` skill (web) or the `mobile-screen` accessibility checklist, and the performance budget. Report findings by priority, each with `file:line` and the fix:
1. Broken or unclear task (no single question, primary action buried).
2. Missing states.
3. Design-system drift (hard-coded values, one-off components, refuse-list items).
4. Visual polish (hierarchy, spacing, typography, color).
5. Cleanup.

These go to the top on sight, however minor the surface: a control with no accessible name; no visible focus; an action reachable by pointer but not keyboard; meaning carried by color alone; content clipped at 320 px, 200% zoom or 200% font scale; a truncated value that can't be read whole; hidden content with no cue; an error with no way to recover; a status color used against its meaning; a state change shown only by motion; a destructive action with no confirmation or undo.

Propose the cheapest fix that works, in this order: delete, use the platform, reuse a token or component, correct the value, add something new.

## 9. `polish`

Fix in the critique's priority order. Fix drift at the narrowest level: add a missing token, reuse an existing component, or fix the local defect. Verify by looking at the rendered result at the sizes it ships at: a 360 dp Android emulator, an iPhone, and 1280 px and 768 px for the portal, in light and dark, and at 200% font scale. Batch fixes, then look again, rather than screenshotting after every tweak.

## Optional: Impeccable as a personal plugin

For deeper design-direction work, a developer can install Impeccable for themselves (`/plugin marketplace add pbakaus/impeccable`). It is **not** committed to this repo: its launcher downloads a native binary on first run, its hooks run that binary after every edit, and it writes `PRODUCT.md`, `DESIGN.md` and `.impeccable/` at the repo root. If you use it, don't commit those artifacts without team agreement, and ignore its suggestion to add unit tests (NFR-MAINT-02).

## Optional: a marketing landing page

No marketing site is specified yet; "landing" in `docs/` means the `/e`, `/j` and `/c` link pages. A marketing page needs a story with an ID in the backlog first. When it has one, Hallmark ([nutlope/hallmark](https://github.com/nutlope/hallmark), MIT) is the recommended personal skill for it. Its honest-copy gates apply regardless: no invented metrics, client logos or testimonials ("+500 clubes"), and real screenshots instead of fake device frames. Don't commit its `.hallmark/` folder or the comments it stamps into CSS.
