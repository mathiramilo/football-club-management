---
name: web-design-guidelines
description: Review web UI code (Next.js, React, Tailwind, shadcn/ui) for compliance with Vercel's Web Interface Guidelines - accessibility, focus, forms, animation, typography, content handling, images, performance, URL state, touch, dark mode, i18n and hydration - and report terse file:line findings. Use when asked to review UI, check accessibility, audit design or UX, or check pages against best practices.
argument-hint: <file-or-pattern>
---

# Web Interface Guidelines review

> **Project notes** (vendored from [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) with rules from [vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines), MIT; see `.claude/skills/THIRD_PARTY.md`):
> - The rules are pinned locally in [guidelines.md](guidelines.md) (upstream `command.md` as of 2026-10-05). Don't fetch them from the network; refresh the pin deliberately in its own PR.
> - One upstream rule was changed for this project: headings and buttons use Spanish sentence case, not Title Case.
> - Project rules win over these guidelines: tokens from `packages/ui-tokens`, copy from `packages/i18n`, dates in the club time zone, status never by color alone, WCAG 2.2 AA, and the public-page budget (LCP ≤ 2.5 s, JS ≤ 150 KB).
> - For the Expo app, use the `mobile-screen` skill instead; most of these rules are web-specific.

## How it works

1. Read [guidelines.md](guidelines.md).
2. Read the files given as the argument, or ask which files or pattern to review.
3. Check every file against every rule in the guidelines.
4. Report findings in the terse `file:line` format that the guidelines specify.
