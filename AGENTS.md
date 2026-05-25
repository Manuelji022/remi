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