---
name: mobile-screen
description: Build or change a screen in the Expo (React Native) app - Expo Router route, NativeWind primitives, generated TanStack Query hooks, loading/empty/error/offline states, i18n, accessibility, field mode, deep links and telemetry. Use for any new or changed mobile screen, tab, sheet or flow.
argument-hint: <screen or S-xx> [story ID]
---

# Mobile screen (Expo)

Specs: `docs/ux/01-information-architecture-and-flows.md` (navigation § 3, screen inventory § 4, flows § 5, voice § 6, visual notes § 7), the feature spec of the story, NFR-PERF-03, NFR-OFF-02, NFR-A11Y-02–04. Conventions are in the `mobile-expo` and `frontend` rules.

## 1. Locate the screen

1. Find it in the screen inventory (`S-xx`) and the flow it belongs to. Note which roles see it and from which tab (player-only vs. staff navigation).
2. Read the acceptance criteria and the business rules that drive its states (deadlines, locks, permissions, warnings).
3. Check designs. If there are none and the story isn't marked "reuse pattern X", ask before inventing layout.

## 2. Route

- File under the Expo Router `app/` tree, in the right group and tab. Typed params; IDs only in the path.
- If the screen opens from a public link (`/e/…`, `/j/…`, `/c/…`) or a push, wire the deep link and test it cold (app killed) and warm.

## 3. Data

- Read with the generated hooks from `packages/api-client`. No hand-written fetches or types.
- If the data is in the offline-read list (agenda for the next 14 days, event details and availability, published plans, active routines and nutrition plans, own stats), make sure its queries are persisted and render from cache when offline.
- Writes in the offline list (RSVP, bulk RSVP, roll call, check-ins, routine logs) use the `offline-mutation` skill. Other writes show a clear "needs connection" state.
- Refetch on focus and pull-to-refresh. No polling, no realtime in R1.
- Show only what the API returned for this role. Hide, don't enforce.

## 4. States

Design every state before the happy path:
- **loading**: skeletons for lists and cards, no spinner-only screens;
- **empty**: value plus next step, with copy from the spec;
- **error**: what happened and what to do, mapped from the problem+json `code`;
- **offline**: cached content with an offline indicator, and sync state for queued writes. Loading isn't the same as offline: when a query's `fetchStatus` is `'paused'` and there is no cached data, show the offline state, not a skeleton;
- **failed refetch with data**: keep showing the data, with a non-blocking error;
- **saving**: disable repeat submits, keep the draft on failure, and dismiss only after success;
- **permission-dependent**: controls hidden for roles that can't use them.

Use the `ui-design` skill (`shape`) to plan the screen's single question and primary action before building it.

## 5. UI

- NativeWind classes with the shared token preset, on the project's own primitives. Status always uses color + icon + label.
- Lists: FlashList. Images: expo-image with sized variants. Video: expo-video with no autoplay on mobile data.
- Sheets for pickers and filters (`@gorhom/bottom-sheet`); a sheet that is its own route uses `presentation: 'formSheet'`. Destructive actions confirm.
- `Pressable` (not `TouchableOpacity`) with subtle press feedback; any other motion goes through the `expo-animation` skill's frequency gate.
- Forms: scroll views with inputs use `keyboardShouldPersistTaps="handled"`, and primary actions stay reachable above the keyboard.
- Use the platform stack header and transitions from Expo Router. No hand-rolled headers, no custom centered modal dialogs, no full-screen spinner between states.
- Field screens (roll call, availability, field mode) support the high-contrast style and one-handed use.
- Dates in the club time zone, 24 h, weeks starting Monday.

## 6. Copy

All strings in `packages/i18n` with *voseo* and glossary terms (`i18n-and-copy` rule). CTAs ≤ 3 words.

## 7. Accessibility

- `accessibilityLabel` and `accessibilityRole` on every interactive element; state (`accessibilityState`) for toggles and selected items.
- Works at 200% font scale without clipping or losing actions.
- Touch targets ≥ 44×44 pt. Logical focus order for screen readers.

## 8. Telemetry and errors

Implement the PostHog events listed in the spec (IDs and enums only). No names, free text or health data in events or Sentry breadcrumbs.

## 9. Verify

No component tests (NFR-MAINT-02). Run the app on an Android emulator or a low-end device and on iOS. Check each state, dark mode, 200% font scale, offline behavior and deep links. For lists, startup paths or heavy screens, check them with the `mobile-performance` skill. Finish with a `ui-design` `critique` pass. Report what you verified and what you couldn't.
