---
name: web-page
description: Build or change a page in the Next.js web app - public server-rendered link pages with Open Graph previews (/e, /j, /c, /consent), staff portal screens with TanStack Query, shadcn/ui, TanStack Table and Recharts, or the player web fallback. Use for any new or changed web route, layout, table, chart or form.
argument-hint: <route or screen> [story ID]
---

# Web page (Next.js App Router)

Specs: `docs/ux/01-information-architecture-and-flows.md` § 3.3–3.4 and § 4, the feature spec, NFR-PERF-04, NFR-COMP-02/04, NFR-A11Y-01. Conventions are in the `web-nextjs` and `frontend` rules.

## 1. Pick the surface

| Surface | Choose when | Rendering |
|---|---|---|
| Public | Reached from a WhatsApp link without signing in: event, invite, claim, guardian consent, account-deletion info, legal | Server Components, SSR, short edge cache |
| Staff portal | Setup, rosters, analytics, library, planning, wellness board, content, AI | Client components with TanStack Query |
| Player fallback | A player using the web instead of the app | Mobile-first, same data hooks as the portal |

## 2. Public page

Public pages fetch from `/v1/public/…` on the server and render **no personal data**.

```tsx
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareToken } = await params;
  const event = await getPublicEvent(shareToken);
  const t = await getTranslations('public.event');
  return {
    title: t('metaTitle', { club: event.clubName, title: event.title }),
    openGraph: { title: event.title, description: t('metaDescription', { startsAt: event.startsAt }) },
  };
}
```

- Add `opengraph-image.tsx` next to the page, built with `ImageResponse` from `next/og`: crest, title, date. No names or photos of people.
- Primary CTA: open in the app (universal link / App Link), with a web fallback to sign in and RSVP.
- Detect in-app browsers (WhatsApp, Instagram, Facebook) that block Google OAuth and offer email codes plus an "open in browser" hint (NFR-COMP-04).
- Budget: LCP ≤ 2.5 s on simulated 4G, JS ≤ 150 KB gzipped. Keep `"use client"` islands small. Check with a Lighthouse run.
- Unknown or expired tokens render a friendly, non-revealing page.
- These pages open on phones, usually inside WhatsApp:
  - Inputs are at least 16 px, so iOS doesn't zoom on focus.
  - Never set `maximum-scale=1` or `user-scalable=no`.
  - Use `100svh` for a full-height hero and `100dvh` for an app shell, never `100vh`.
  - Hover styles apply only under `(hover: hover) and (pointer: fine)`. Tailwind v4's `hover:` covers the first half only.
  - Export `viewport` with one `themeColor` per color scheme and `interactiveWidget: 'resizes-content'`, so the keyboard resizes the layout.

## 3. Staff portal page

- Client components using the generated hooks from `packages/api-client`. Refetch on focus; optimistic updates for RSVP and roll call.
- Tables: TanStack Table with server-side pagination (cursor), sorting and filters mapped to the endpoint's query params.
  - Pass the query result straight into the table; never copy it into state. Column definitions and fallback arrays live at module scope.
  - Cursor, sort and filters go in the query key and the URL; use `manualPagination` / `manualSorting` and `placeholderData: keepPreviousData` while paging.
  - If TanStack Table v9 is installed, read its bundled skills in `node_modules/@tanstack/react-table/skills/`.
- Queries and mutations on web: don't retry 4xx responses; mutations use `retry: 0`; optimistic updates go cancel → snapshot → set → roll back on error → invalidate.
- React: derive values during render instead of syncing them with effects; never define components inside components; wrap filter changes in `startTransition`.
- Complex widgets (plan builder, table toolbars, composers with several modes) are compound components: use the `react-composition-patterns` skill.
- Charts: Recharts, always labelled with numerator and denominator (BR-ANL-04). Provide a table or text alternative for screen readers.
- Forms: React Hook Form + Zod resolver with the contract schema; server errors mapped by `code` to fields or a banner.
- Drag and drop (plan builder): dnd-kit, with a keyboard alternative.
- Components from `components/ui/` (shadcn), following the `shadcn` skill: `FieldGroup` + `Field` forms with `data-invalid` / `aria-invalid`, `gap-*` not `space-y-*`, semantic tokens only, a title on every `Dialog` and `Sheet`, `Empty` / `Skeleton` / `Alert` / `Badge` instead of custom markup, and `Spinner` + `disabled` for loading buttons. Add components with its CLI; don't add another UI library.
- Hide actions the user's role can't perform, using roles from the API. Never enforce in the client.
- Layout optimized for ≥ 1280 px, usable from 768 px.

## 3b. Interaction details (both surfaces)

From Vercel's Web Interface Guidelines (the `web-design-guidelines` skill has the full list):
- Filters, sort, pagination and tabs live in URL search params, so views survive reloads and can be shared.
- Forms: the submit button stays enabled until the request starts; errors appear inline and focus moves to the first one; never block paste (sign-in codes, WCAG 3.3.8); set `type`, `autoComplete` and `inputMode`; warn before leaving with unsaved changes.
- Loaders appear after 150–300 ms and stay ≥ 300 ms; loading copy ends with "…".
- Lists over about 50 rows are paginated or virtualized.
- Destructive actions confirm or offer an undo window.
- Images through `next/image` with dimensions; below-the-fold images lazy. Fonts through `next/font` (subset, `display: swap`).
- `color-scheme` and a `theme-color` meta that match the theme. Club and venue names get `translate="no"`.
- Plan the screen with the `ui-design` skill (`shape`) before building it.

## 4. Copy and dates

`next-intl` (`getTranslations` on the server, `useTranslations` in client components) with keys in `packages/i18n`. Dates in the club time zone, 24 h, weeks starting Monday.

## 5. Accessibility (WCAG 2.2 AA)

Semantic landmarks and headings, labelled inputs, visible focus, keyboard access for every action, contrast checked against club theme colors, status never by color alone.

## 6. Telemetry

PostHog events from the spec, IDs and enums only. No input autocapture.

## 7. Verify

No component tests (NFR-MAINT-02). Run the dev server and check the page at 1280 px and 768 px (portal) or a mobile viewport (public and player), in light and dark mode, with the keyboard only. For public pages, inspect the rendered metadata and OG image and run Lighthouse. Then review the changed files with the `web-design-guidelines` and `accessibility` skills, and finish with a `ui-design` `critique` pass. Report what you verified.
