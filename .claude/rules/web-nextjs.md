---
paths:
  - "apps/web/**"
---

# Web: Next.js (App Router)

Specs: `docs/tech/00-tech-stack.md` § 3, ADR-003, ADR-014, `docs/ux/01-information-architecture-and-flows.md` § 3.3–3.4. See the `web-page` skill.

## Next.js is not the backend

All business logic, data access and authorization stay in the NestJS API. The web app never connects to Postgres, never imports from `apps/api`, and never reimplements a rule that lives in the API or `packages/domain`. Route handlers and Server Actions exist only for web concerns (session cookies, association files, OG images), not for domain writes.

## Next.js knowledge

Next.js 16.3+ ships version-matched docs in `node_modules/next/dist/docs`, and with `agentRules` on (the default) `next dev` writes `apps/web/AGENTS.md` pointing at them. Read those docs before writing Next.js code: the installed version wins over memory. When TECH-09 scaffolds `apps/web`, add `apps/web/CLAUDE.md` containing `@AGENTS.md` so Claude Code loads them.

`create-next-app` also turns on `experimental.agentFeedback`, which needs Next.js telemetry, has the agent run `next internal agent-feedback-instructions` and opens issue-report forms in the browser. Set it to `false` at TECH-09, and decide whether to keep `experimental.agentUpgrade`, whose reminders stop `next dev` and `next build` when an agent runs them.

Task skills: `next-bundle-optimizer` (bundle audits against the public-page budget), `react-best-practices` (performance rules), `web-page`, `shadcn`, `orval` (the generated client).

## Three surfaces

| Surface | Rendering | Notes |
|---|---|---|
| **Public pages**: `/e/{shareToken}`, `/j/{code}`, `/c/{claimToken}`, `/consent/{token}`, `/delete-account`, legal | Server Components, SSR, short edge caching | Open Graph tags via `generateMetadata` and a generated image (`opengraph-image.tsx` with `next/og`) for WhatsApp previews. **No personal data** in markup, metadata or images (EVT-07). Budget: LCP ≤ 2.5 s on 4G, JS ≤ 150 KB gzipped (NFR-PERF-04). Keep client components out of these routes unless needed. |
| **Staff portal** | Client components with TanStack Query hooks | Optimized for ≥ 1280 px, usable from 768 px (NFR-COMP-02). |
| **Player web fallback** | Mobile-first | The full player experience for players without the app. |

Use route groups to keep the surfaces apart, e.g. `app/(public)/…`, `app/(portal)/…`, `app/(player)/…`.

## Server rendering and data

- Server-side API calls go through functions wrapped in `React.cache()`, so `generateMetadata`, the page and `opengraph-image` share one request. Start independent requests together (`Promise.all`) and wrap slow sections in `<Suspense>`.
- Pass only the fields a client component needs across the server/client boundary.
- Never keep per-request data in module-level variables.
- Load heavy client libraries (Recharts, dnd-kit, Tiptap) with `next/dynamic`, load PostHog and Sentry replay after hydration, and use `optimizePackageImports` for icon libraries.
- OG images use `next/og` with flexbox-only layout.

## Session and auth

- Session in httpOnly, Secure, SameSite cookies on the shared parent domain (`app.` / `api.`). **Never put tokens in `localStorage`, `sessionStorage` or JS-readable cookies.** Final shape comes from the auth spike (ADR-007, TECH-04).
- Pages opened inside WhatsApp, Instagram or Facebook in-app browsers must work. Detect embedded webviews that block Google OAuth and offer email codes plus an "open in browser" hint (NFR-COMP-04).
- Serve `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` as JSON for universal links and App Links (NFR-COMP-03).

## Libraries

- **shadcn/ui** components (Radix primitives) live in the repo under `components/ui/`; extend them there instead of adding another component library, following the `shadcn` skill. Tailwind with the preset from `packages/ui-tokens`.
- **TanStack Table** for directories and per-player tables, **Recharts** for charts, **dnd-kit** for the plan builder and reordering, **Tiptap** (R3) for rich text stored as JSON.
- **next-intl** reading the catalogs in `packages/i18n`.
- `@sentry/nextjs` and `posthog-js` with privacy filters: no input capture, replay masked or off.

## Accessibility

WCAG 2.2 AA (NFR-A11Y-01): semantic elements, labelled controls, visible focus, keyboard access to every action (including drag and drop alternatives), sufficient contrast with club colors.
