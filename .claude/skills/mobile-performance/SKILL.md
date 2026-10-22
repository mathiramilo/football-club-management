---
name: mobile-performance
description: Diagnose and fix Expo / React Native performance on low-end Android - slow cold start, janky lists or animations, re-render storms, laggy typing, bottom-sheet jank, memory growth, large bundle or app size, heavy data usage - with a measure, fix, re-measure loop against the project's NFR targets. Use when the app feels slow, before a release on the reference device, or when a change touches lists, startup, images, sheets or animations.
---

# Mobile performance

Distilled for this project from Callstack's react-native-best-practices ([callstackincubator/agent-skills](https://github.com/callstackincubator/agent-skills), MIT), Expo's skills (MIT), and Software Mansion's and Vercel's React Native guidance. See `.claude/skills/THIRD_PARTY.md`. Callstack's full guide, with profiling walkthroughs for Xcode Instruments, Android Studio and memory, is worth reading for deep investigations.

## Targets

| Metric | Target | Source |
|---|---|---|
| Cold start to interactive Home | ≤ 3 s on a reference low/mid Android (Galaxy A0x/A1x class); ≤ 2 s on a recent iPhone | NFR-PERF-03 |
| RSVP perceived completion | ≤ 300 ms (optimistic UI) | NFR-PERF-02 |
| Store download size | ≤ 40 MB | NFR-DATA-03 |
| Weekly player session transfer | ≤ 2 MB | NFR-DATA-04 |
| Scrolling roll call, agenda, directory | Steady 60 fps on the reference Android | UX § 7 |

## Rules of engagement

1. **Measure → fix → re-measure → validate.** No memoization, atomic-state or React Compiler changes without profiler evidence. If the numbers don't improve, revert.
2. **Measure on a release build on the slowest supported device.** Dev builds and Expo Go hide or invent problems. Measure TTI on cold starts only.
3. **Check installed versions before giving API advice.** FlashList v2 has no `estimatedItemSize`. Reanimated 4 uses `scheduleOnRN` from `react-native-worklets` (`runOnJS` is removed). Gesture Handler v2 uses the `Gesture.*()` builder; v3 uses hooks.
4. Report before and after numbers, the device and the build type. Never claim an improvement without numbers.

## Symptom → first move

| Symptom | Measure with | Typical fixes |
|---|---|---|
| Slow cold start | Cold-start TTI markers (`react-native-performance`); Expo Atlas (`EXPO_UNSTABLE_ATLAS=true npx expo export`) | The root layout waits only for what it must (SecureStore token, query-cache restore), then renders. Defer non-critical work (analytics init, prefetches) until after first render. Avoid heavy imports at the root and barrel imports from workspace packages. Create `Intl` formatters once, not per render. |
| List jank | React DevTools profiler; perf monitor (UI and JS fps) | FlashList with stable keys and `getItemType` for mixed rows. Light rows: no heavy work or inline object creation in `renderItem`. No `entering` animations on rows. Images through `expo-image` with sized variants. |
| Re-render storms | Profiler: commit timeline, re-render counts, slowest components | Split contexts by update frequency. Zustand selectors instead of whole-store reads. TanStack Query `select` to subscribe to the slice a component needs. React Compiler only after evidence, enabled in its own PR. |
| Animation drops frames | Perf monitor on a release build | Use the `expo-animation` skill: UI-thread worklets, `transform` and `opacity` only, no `setState` in gesture or scroll handlers. |
| Typing lag | Profiler while typing | Uncontrolled `TextInput` (`defaultValue`) unless the value is masked or validated on every keystroke. React Hook Form's uncontrolled inputs fit this. |
| Bottom-sheet jank | Profiler during drag | Drive visuals from `animatedIndex` or `animatedPosition` shared values, not `onAnimate` plus `setState`. Lists in sheets: `useBottomSheetScrollableCreator` with FlashList v2. Inputs: `BottomSheetTextInput` with `keyboardBehavior="interactive"`. On iOS, wrap modals in `FullWindowOverlay`. Confirm the bottom-sheet version supports the installed Reanimated major. |
| Memory growth | Heap snapshots before and after repeating a flow | Clean up listeners and subscriptions. Check large images, the query cache `gcTime`, and the persisted-cache size (`maxAge`, `buster`). |
| Bundle or app too big | Expo Atlas; EAS build size; store reports | Remove barrel imports. Import `date-fns` functions individually. Add Intl polyfills only where Hermes lacks the API. Enable R8 and resource shrinking through `expo-build-properties`. Check native libraries for 16 KB page alignment (Google Play requirement). |
| Too much data on mobile | Network inspector during a weekly player session | Sized WebP image variants, no video autoplay on cellular, rely on the persisted cache, no polling (NFR-DATA-01/02). |

## Monorepo specifics

- Native dependencies must be listed in `apps/mobile/package.json` for autolinking to find them. Keep one version of each native library across the workspace; check with `pnpm why <package>` and pin with pnpm overrides if needed.
- `packages/domain` and `packages/contracts` are bundled into the app: keep them free of heavy dependencies.

## Verify

Repeat the original measurement on the same device and build type. Include the numbers in the PR, and note what you couldn't measure.
