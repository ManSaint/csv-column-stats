# csv-column-stats

## Ground rules
- Never report a check as passing without running it and reading the output. Paste the output.
- If a command fails, fix the cause. Do not work around it or disable the check.
- Edit existing files in preference to creating new ones. No new docs unless asked -
  README.md is the exception and must be kept current with what the project actually does.
- The Bash tool on this machine is Git Bash (POSIX). xcopy, copy, del and %VAR% all fail
  there - use cp -r, rm, $VAR, or the PowerShell tool.

## Stack
Bun - Next.js App Router - TypeScript strict - Tailwind CSS v4 - Biome
Unit tests: Vitest. E2E and accessibility: Playwright + axe-core.

## Commands
```bash
bun run dev          # dev server
bun run build        # production build
bun run lint         # biome check .
bun run lint:fix     # biome check --write .
bun run typecheck    # tsc --noEmit
bun run test         # vitest run
bun run test:e2e     # playwright test
bun run test:a11y    # playwright test a11y  (axe-core, WCAG 2.2 AA)
```
Always use `bun run <script>`. Bare `bun build` and `bun test` are Bun's own bundler and
test runner - they ignore the package.json script of the same name and appear to succeed
while doing something else.

## Project structure
- `app/` - routes only: `page.tsx`, `layout.tsx`, route handlers. No reusable UI here
- `components/` - React components, one per file
- `lib/` - pure logic with no React imports; this is where testable behaviour lives
- `e2e/` - Playwright specs (E2E and accessibility)
- Unit tests sit beside what they test: `lib/foo.ts` -> `lib/foo.test.ts`

Extract a component once it passes ~150 lines or holds more than one concern. Icons, form
fields and other presentational pieces get their own file under `components/`.

Never write the same value twice in two formats - derive one from the other. A hex constant
and its RGB equivalent side by side will drift.

## Definition of done
Not complete until each of these has been run and passed:
1. `bun run lint` exits 0
2. `bun run typecheck` exits 0
3. `bun run test` exits 0
4. `bun run test:e2e` exits 0 for any user-visible change
5. `bun run test:a11y` exits 0 for any new or changed route

"Should pass" and "I made the change" are not completion.

## Planning rules
Every plan written for this project must include, as explicit tasks:
- A Playwright E2E task for each user-visible surface it adds
- An a11y task adding each new route to ROUTES in `e2e/a11y.spec.ts`
- A final task updating README.md: what it does, a screenshot, and anything a newcomer
  needs. The README must not still contain the README-STUB marker when the work is done
- File paths for every new file, following the project structure above
- A commit at the end of each task

For any third-party dependency the plan introduces, look up its current API with Context7
and write the verified import paths and signatures into the task text. Each task runs in a
fresh subagent context that cannot see research done elsewhere, so anything not written
into the plan is lost.

A plan missing these is incomplete. Add them before executing it.

## Accessibility (WCAG 2.2 AA)
Decided at design time, verified at test time:
- Body text >= 4.5:1; large text, UI components and focus rings >= 3:1. Check both themes
- Colour is never the only signal
- Interactive targets >= 24x24 CSS px
- Every interactive element is keyboard reachable and has a visible focus ring
- Real semantic elements - a div with a click handler is a defect, not a style choice

## Enforcement
`.claude/settings.json` runs a PreToolUse gate on `git commit`: lint, typecheck and test
must pass or the commit is denied. Change the gated set via `claudeCommitGate.checks` in
package.json. Never bypass the gate with `--no-verify`.

## Deployment
Vercel deploys a preview for every PR once the repo is connected in the Vercel dashboard
(Settings -> Git). Production deploys are manual, after review.

## Project-specific context
<!-- Add notes here as you learn them. -->
