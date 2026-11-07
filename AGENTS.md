# Remi

TanStack Start (React 19) frontend app with file-based routing.

## Commands

```bash
cd frontend
pnpm dev          # dev server on port 3001
pnpm build        # production build to dist/
pnpm test         # Vitest
pnpm lint
pnpm format       # prettier --write + eslint --fix
pnpm check        # prettier --check only
#--react doctor to keep clean react code
pnpx react-doctor@latest
```

## Key conventions

- **File-based routing**: routes in `src/routes/`. Root layout is `src/routes/__root.tsx`.
- **Generated code**: `src/routeTree.gen.ts` is auto-generated — do not edit manually. Re-run `pnpm dev` to regenerate.
- **Path aliases**: `#/*` and `@/*` both map to `./src/*`.
- **Router**: `src/router.tsx` defines the router instance.
- **Server functions**: use `createServerFn` from `@tanstack/react-start` for server-side logic.
- **Data loading**: the weekly planner loads its data client-side through hooks (`usePlannerWeek`), because it depends on browser-only state (guest data in localStorage, the browser's IANA time zone, AI previews). Put new server-only page data in a route `loader` instead.

## Tech stack

- TanStack Start, TanStack Router
- React 19, TypeScript strict mode, Vite
- Nitro for SSR/production server
- Vitest for testing
- ESLint + Prettier (TanStack config)

## Test convention

- NEVER write unit tests after you write code
- Highly prefer E2E tests as the sole testing mechanism. Use them to verify complex feature work. At the end of E2E tests, produce verifiable and repeatable artifact.
- If you must test a system in isolation, FIRST write all the ways it could fail, THEN write the code

## Pull requests

Every pull request needs a conventional-commit title (`type: description` or `type(scope): description`) and a filled [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md). PR policy requires non-empty Summary, Why, Scope, Out of scope, How to test, and Risk sections. The template source of truth is [https://github.com/Manuelji022/.github/blob/main/PULL_REQUEST_TEMPLATE.md](https://github.com/Manuelji022/.github/blob/main/PULL_REQUEST_TEMPLATE.md).

### Small and stacked pull requests

Reviewers should be able to read a PR in minutes and verify it in one sitting.

- **One concern per PR.** Target 300 source LOC and 10 files or fewer. The `PR policy` check flags PRs over 400 LOC and fails PRs over 800 LOC without a "Large PR justification" section. Needing that section is a signal to split, not to justify.
- **Split by reviewable unit**, not by file type: pure logic or server contract first, then the component, then the wiring. Each PR is independently green (`pnpm lint`, `pnpm check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and the relevant E2E harness) and leaves no dead code, unused flag or half-visible feature behind.
- **Independent work branches from `main`.** Only stack when a PR needs code from another open PR. Keep stacks at 4 PRs or fewer; merge the bottom ones before stacking further.
- **Stacked PRs:** branch from the previous branch and open the PR with `--base <previous-branch>`. The PR body must start its `Summary` with a `Stack` line: position (`2/4`), the base PR link, and the merge order of the whole stack.
- **Merge bottom-up, one at a time.** Before merging a PR, retarget the next one to `main` (`gh pr edit <next> --base main`) so deleting the merged head branch does not close it, then rebase it with `git rebase --onto origin/main <old-base-branch> <branch>` and `git push --force-with-lease` (own stack branches only), and wait for CI again.
- **Fix at the right level.** A fix belongs in the lowest PR that introduced the problem; restack the PRs above it afterwards. Never put a fix for a lower PR in an upper one.
- **Every PR says how to verify it:** exact steps (including `pnpm db:migrate` when the feature touches the database), the commands run with their result, screenshots for UI changes, and what was not verified.

## Agent orchestration (Orca)

Follow the repository's [Orca workflow instructions](ORCA.md) when using Orca for worktrees, terminals, or agent orchestration. The Orca CLI contract can change, so load the current skills specified in that guide before using the CLI.
