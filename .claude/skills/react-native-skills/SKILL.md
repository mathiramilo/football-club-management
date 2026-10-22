---
name: react-native-skills
description:
  React Native and Expo best practices for building performant mobile apps. Use
  when building React Native components, optimizing list performance,
  implementing animations, or working with native modules. Triggers on tasks
  involving React Native, Expo, mobile performance, or native platform APIs.
license: MIT
metadata:
  author: vercel
  version: '1.0.0'
---

# React Native Skills

> **Project notes** (vendored from [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) `vercel-react-native-skills` at `063bee9`, MIT; see `.claude/skills/THIRD_PARTY.md`). The rules date from January 2026, so where an API differs from what `apps/mobile/package.json` has installed, the installed version wins. These notes override the generic guidance below where they conflict:
> - **Lists use `@shopify/flash-list` v2** (tech stack). Read the `LegendList` examples as FlashList: no `estimatedItemSize`, `getItemType` for mixed rows, no `entering` animations on rows.
> - **Reanimated 4**: call JS from a worklet with `scheduleOnRN` from `react-native-worklets`, never the removed `runOnJS`. Read and write shared values with `.get()` / `.set()`.
> - **Gesture Handler**: Expo SDK 58 installs v3, whose API is hooks (`useTapGesture`), not the `Gesture.Tap()` builder in `animation-gesture-detector-press`. `Pressable` stays the default; use a gesture only when the press drives a UI-thread animation.
> - **Navigation**: Expo Router's native stack. `NativeTabs` is not in the stack; adopting it needs an ADR (`adr` skill).
> - **Sheets** (`ui-native-modals`): the stack picks `@gorhom/bottom-sheet` for in-screen pickers and filters, and `presentation: 'formSheet'` when the sheet is its own route. Confirm bottom-sheet works with Gesture Handler 3 first (`mobile-expo` rule).
> - **New libraries**: zeego (`ui-menus`) and Galeria (`ui-image-gallery`) are not in the stack. Propose them with the `adr` skill before using them.
> - **Styling** (`ui-styling`) is NativeWind classes from the shared preset; style objects only for Reanimated animated styles.
> - **State**: server data lives in TanStack Query (persisted to MMKV), local UI state in Zustand. Never copy server data into component or store state.
> - Monorepo rules match ours: native dependencies are declared in `apps/mobile`, one version across the workspace.
> - `design-system-compound-components`, `scroll-position-no-state` and `state-ground-truth` are in `rules/` but not in the index below.
> - The examples contain comments for the reader; React code in this repo has none.
> - Dropped from upstream: the compiled `AGENTS.md` (it duplicates `rules/`), `README.md`, `metadata.json` and the rule template.

Comprehensive best practices for React Native and Expo applications. Contains
rules across multiple categories covering performance, animations, UI patterns,
and platform-specific optimizations.

## When to Apply

Reference these guidelines when:

- Building React Native or Expo apps
- Optimizing list and scroll performance
- Implementing animations with Reanimated
- Working with images and media
- Configuring native modules or fonts
- Structuring monorepo projects with native dependencies

## Rule Categories by Priority

| Priority | Category         | Impact   | Prefix               |
| -------- | ---------------- | -------- | -------------------- |
| 1        | List Performance | CRITICAL | `list-performance-`  |
| 2        | Animation        | HIGH     | `animation-`         |
| 3        | Navigation       | HIGH     | `navigation-`        |
| 4        | UI Patterns      | HIGH     | `ui-`                |
| 5        | State Management | MEDIUM   | `react-state-`       |
| 6        | Rendering        | MEDIUM   | `rendering-`         |
| 7        | Monorepo         | MEDIUM   | `monorepo-`          |
| 8        | Configuration    | LOW      | `fonts-`, `imports-` |

## Quick Reference

### 1. List Performance (CRITICAL)

- `list-performance-virtualize` - Use FlashList for large lists
- `list-performance-item-memo` - Memoize list item components
- `list-performance-callbacks` - Stabilize callback references
- `list-performance-inline-objects` - Avoid inline style objects
- `list-performance-function-references` - Extract functions outside render
- `list-performance-images` - Optimize images in lists
- `list-performance-item-expensive` - Move expensive work outside items
- `list-performance-item-types` - Use item types for heterogeneous lists

### 2. Animation (HIGH)

- `animation-gpu-properties` - Animate only transform and opacity
- `animation-derived-value` - Use useDerivedValue for computed animations
- `animation-gesture-detector-press` - Use Gesture.Tap instead of Pressable

### 3. Navigation (HIGH)

- `navigation-native-navigators` - Use native stack and native tabs over JS navigators

### 4. UI Patterns (HIGH)

- `ui-expo-image` - Use expo-image for all images
- `ui-image-gallery` - Use Galeria for image lightboxes
- `ui-pressable` - Use Pressable over TouchableOpacity
- `ui-safe-area-scroll` - Handle safe areas in ScrollViews
- `ui-scrollview-content-inset` - Use contentInset for headers
- `ui-menus` - Use native context menus
- `ui-native-modals` - Use native modals when possible
- `ui-measure-views` - Use onLayout, not measure()
- `ui-styling` - Use StyleSheet.create or Nativewind

### 5. State Management (MEDIUM)

- `react-state-minimize` - Minimize state subscriptions
- `react-state-dispatcher` - Use dispatcher pattern for callbacks
- `react-state-fallback` - Show fallback on first render
- `react-compiler-destructure-functions` - Destructure for React Compiler
- `react-compiler-reanimated-shared-values` - Handle shared values with compiler

### 6. Rendering (MEDIUM)

- `rendering-text-in-text-component` - Wrap text in Text components
- `rendering-no-falsy-and` - Avoid falsy && for conditional rendering

### 7. Monorepo (MEDIUM)

- `monorepo-native-deps-in-app` - Keep native dependencies in app package
- `monorepo-single-dependency-versions` - Use single versions across packages

### 8. Configuration (LOW)

- `fonts-config-plugin` - Use config plugins for custom fonts
- `imports-design-system-folder` - Organize design system imports
- `js-hoist-intl` - Hoist Intl object creation

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/list-performance-virtualize.md
rules/animation-gpu-properties.md
```

Each rule file contains:

- Brief explanation of why it matters
- Incorrect code example with explanation
- Correct code example with explanation
- Additional context and references
