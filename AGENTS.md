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

## Tech stack

- TanStack Start, TanStack Router, TanStack Query
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