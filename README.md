# csv-column-stats

<!-- README-STUB: replace this whole block with a real description before opening a PR -->
> One line on what this does and who it is for.

## What it does

Describe the problem it solves and how it works, in a short paragraph. Add a screenshot or
a GIF here - it is the single highest-value thing in a README.

## Getting started

```bash
bun install
bun run dev
```

Open http://localhost:3000.

## Commands

| Command | Does |
| --- | --- |
| `bun run dev` | dev server |
| `bun run build` | production build |
| `bun run lint` | Biome check |
| `bun run typecheck` | route typegen + tsc |
| `bun run test` | unit tests (Vitest) |
| `bun run test:e2e` | end-to-end tests (Playwright) |
| `bun run test:a11y` | accessibility scan (axe-core, WCAG 2.2 AA) |

## Testing

Unit tests live beside the code they cover. End-to-end and accessibility specs live in
`e2e/`. Every route is scanned against WCAG 2.2 A + AA - add new routes to the
`ROUTES` array in `e2e/a11y.spec.ts`, since an unlisted route is not covered.

## Tech stack

Bun, Next.js App Router, TypeScript strict, Tailwind CSS v4, Biome, Vitest, Playwright.

## Deployment

Deployed on Vercel. Every pull request gets a preview build; production deploys are manual.
