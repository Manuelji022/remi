# Better Auth user authentication with TanStack Start and Drizzle

## Original user request

The user has a working, empty PostgreSQL database available for the application and wants to start implementing user logic using Better Auth. They want to use TanStack Query and avoid exposing secrets in the client. They asked what approach to follow and where to start.

## Final agreed goal

Implement the simplest functional authentication foundation for Remi using:

- Better Auth
- Email/password authentication initially
- Google OAuth later, but not in this first implementation
- Drizzle ORM with PostgreSQL
- TanStack Start server-side capabilities, not a separate backend service
- Better Auth-required database tables generated/migrated into the currently empty database
- Minimal sign up, log in, log out, and session handling
- Minimal `/signup` and `/login` routes only for the first pass
- Better Auth React client used directly for authentication flows in the first pass, with TanStack Query reserved for application data unless a very thin wrapper is later useful

## Relevant context discovered during planning

- Repository root: `/home/manuelji/dev/remi`
- Frontend app lives in `frontend/`.
- The frontend is a TanStack Start app using React 19, TypeScript strict mode, Vite, Nitro, and file-based routing.
- Routes live in `frontend/src/routes/`.
- Root layout is `frontend/src/routes/__root.tsx`.
- Router instance is in `frontend/src/router.tsx`.
- Generated route tree `frontend/src/routeTree.gen.ts` must not be edited manually.
- Current `frontend/package.json` does not yet include Better Auth, Drizzle, or a Postgres driver as direct dependencies.
- No existing app-level `src/lib/` or `src/db/` auth/database modules were found.
- No existing API routes under `frontend/src/routes/api/**` were found.
- PostgreSQL infrastructure env examples exist under `infraestructure/postgres/`, but frontend-specific env files are not yet configured.

## Important constraints

- Do not expose database credentials, Better Auth secrets, OAuth secrets, or other sensitive values to the browser.
- Do not use `VITE_` prefixes for secret environment variables.
- Use TanStack Start server-side API route capabilities instead of introducing a separate backend service.
- Keep the first implementation intentionally minimal: no roles, permissions, organizations, profiles, password reset flow, email verification, or OAuth yet.
- Do not enable email verification or password reset in the first pass because no email provider/transactional email flow has been selected yet.
- Use Better Auth defaults where possible to reduce friction.
- Use Better Auth’s TanStack Start integration as documented.
- Use Better Auth’s Drizzle adapter as documented.
- Keep `tanstackStartCookies()` as the last Better Auth plugin so cookies are handled correctly by TanStack Start.
- Use Better Auth’s React client SDK directly for initial sign-up, sign-in, sign-out, and session reads.
- The sign-up UI should collect `name`, `email`, and `password`; Better Auth registration expects at least email and name for the user model.
- Do not manually edit `frontend/src/routeTree.gen.ts`; regenerate by running the dev server if needed.

## Agreed implementation approach

### Architecture

```txt
React UI
  -> Better Auth React client
  -> TanStack Start API route /api/auth/*
  -> Better Auth server instance
  -> Drizzle adapter
  -> PostgreSQL
```

### Main decisions

1. Authentication method: email/password now.
2. Future OAuth: Google OAuth later, not part of this first task.
3. Database ORM: Drizzle.
4. Postgres driver: `postgres` package.
5. Database schema: Better Auth default table/model names, such as `user`, `session`, `account`, and `verification`, unless the CLI generates a slightly different current schema.
6. Backend location: inside the existing TanStack Start frontend app using API routes/server-side code.
7. Initial UI routes: `/login` and `/signup` only.
8. TanStack Query usage: do not introduce it for auth in the first pass unless necessary. Prefer Better Auth’s React client methods/hooks directly. Use TanStack Query later for application data such as menus, recipes, preferences, and user-owned domain records.
9. Password policy: keep Better Auth defaults, optionally setting `minPasswordLength: 8` as a small explicit baseline.
10. Email verification and password reset: explicitly defer until an email provider and UX are selected.

## Reasoning behind the approach

- Better Auth already provides the auth API surface, session handling, secure cookies, and client SDK. Using it directly avoids unnecessary custom auth logic.
- Better Auth’s TanStack Start docs recommend using the client SDK for authentication rather than custom server actions, especially for flows that set cookies.
- TanStack Start API routes support standard `Request`/`Response` handlers, which matches Better Auth’s `auth.handler(request)` integration.
- The Better Auth documentation specifically recommends mounting a catch-all route at `src/routes/api/auth/$.ts` for TanStack Start.
- The Better Auth documentation specifically requires `tanstackStartCookies()` for cookie-setting flows like email sign-up/sign-in in TanStack Start.
- Drizzle keeps the schema and migrations explicit while still integrating through the official Better Auth Drizzle adapter.
- Using Better Auth default table names avoids extra adapter mapping and reduces the chance of schema mismatch.
- Keeping OAuth, roles, profiles, and email verification out of the first pass reduces implementation risk and allows validating the core auth flow first.
- Deferring TanStack Query for auth avoids SSR/hydration/provider complexity before it provides meaningful value. Better Auth’s `useSession`, `getSession`, `signUp.email`, `signIn.email`, and `signOut` are enough for the initial flow.

## Alternatives considered and rejected

### Separate backend service

Rejected for now because TanStack Start already provides server-side API routes and server functions. A separate backend would add deployment, CORS, cookie, and environment complexity before it is needed.

### Prisma instead of Drizzle

Rejected because the user explicitly chose Drizzle.

### Direct `pg` instead of Drizzle

Rejected because the user explicitly chose Drizzle and Better Auth has a documented Drizzle adapter.

### Custom/plural table names

Rejected for the first pass. Better Auth supports table name customization, but defaults are simpler and reduce adapter mapping concerns.

### Implement Google OAuth immediately

Rejected for the first pass. Email/password is the agreed minimal first target. The config can be extended later with `socialProviders.google` and the required env vars.

### Full TanStack Query abstraction over auth endpoints

Rejected as too much for the first pass. Better Auth’s client SDK should remain the source of auth behavior. TanStack Query can still be used later for application data and, if needed, as a very thin wrapper around Better Auth client calls.

### Email verification and password reset immediately

Rejected for the first pass. These are recommended production features, but they require selecting and configuring an email delivery provider and designing additional routes/UX. The first implementation should validate basic sign-up, sign-in, sign-out, cookies, sessions, and database tables.

### Adding `/es/login` and `/es/signup` immediately

Rejected for the first pass. The app has i18n routes, but auth should first be validated with simple `/login` and `/signup` routes.

## Files or areas likely involved

Likely new or modified files:

- `frontend/package.json`
  - Add dependencies and scripts for Better Auth, Drizzle, Postgres driver, and migration commands.
- `frontend/.env.example`
  - Add non-secret placeholders for `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`.
- `frontend/drizzle.config.ts`
  - Drizzle Kit config for PostgreSQL migrations.
- `frontend/src/db/index.ts`
  - Create and export the Drizzle database instance.
- `frontend/src/db/schema.ts`
  - Better Auth-generated Drizzle schema.
- `frontend/src/lib/auth.ts`
  - Server-side Better Auth instance.
- `frontend/src/lib/auth-client.ts`
  - Browser-safe Better Auth React client.
- `frontend/src/lib/auth-functions.ts` or similar, optional
  - Server-side helpers such as `getSession` using `createServerFn` and `getRequestHeaders`.
- `frontend/src/routes/api/auth/$.ts`
  - TanStack Start API route that delegates GET/POST to `auth.handler(request)`.
- `frontend/src/routes/login.tsx`
  - Minimal login UI.
- `frontend/src/routes/signup.tsx`
  - Minimal signup UI.
- `frontend/src/routes/__root.tsx` and/or `frontend/src/router.tsx`, optional
  - No auth-related changes expected initially. Only touch if a later decision introduces a global provider.
- `frontend/src/hooks/use-auth.ts` or similar, optional
  - Not recommended for the first pass. Better Auth client hooks/methods are enough initially.
- `frontend/drizzle/` or `frontend/src/db/migrations/`, depending on Drizzle config
  - Generated SQL migrations.

## Risks and edge cases

- The exact Better Auth CLI package/command may differ by installed version. Verify against current docs and generated output.
- Better Auth’s Drizzle adapter package name in current docs is `@better-auth/drizzle-adapter`; ensure imports match the installed version.
- The general Better Auth docs may show `better-auth/adapters/drizzle`, while the Drizzle adapter page shows `@better-auth/drizzle-adapter`; use the current dedicated Drizzle adapter documentation as the source of truth.
- Cookie setting can fail if `tanstackStartCookies()` is missing or not the last plugin.
- `BETTER_AUTH_URL` must match the app URL in development and production.
- In development, `BETTER_AUTH_URL` should be `http://localhost:3001`; in production, it must match the deployed canonical origin.
- `DATABASE_URL` must be available server-side for both runtime and migration commands.
- Avoid importing the server-side `auth` module into client components.
- Ensure generated schema and migrations are committed if the project tracks migrations.
- Postgres table name `user` can sometimes be awkward because `user` is a SQL keyword-like identifier in some contexts. However, Better Auth/Drizzle should quote identifiers as needed; using defaults is still the agreed first pass.
- If TanStack Query is introduced globally later, make sure SSR/hydration setup is compatible with TanStack Start conventions.
- The minimal auth UI should surface Better Auth errors clearly enough for debugging duplicate email, invalid credentials, weak passwords, and network/server failures.
- The sign-up form should include a `name` field, not only email/password.
- Auth client callback/redirect URLs should be absolute if explicitly provided. For the minimal same-origin flow, avoid custom callback URLs unless needed.

## Validation strategy

1. Install dependencies successfully from `frontend/`.
2. Create `frontend/.env` locally with real values:
   - `DATABASE_URL`
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL=http://localhost:3000`
3. Generate Better Auth Drizzle schema.
4. Generate and apply Drizzle migrations against the empty Postgres database.
5. Confirm auth tables exist in Postgres.
6. Confirm Better Auth health endpoint works:
   - `GET /api/auth/ok` should return a healthy response such as `{ "status": "ok" }`.
7. Run the development server:
   - `cd frontend && pnpm dev`
8. Visit `/signup` and create a test user with name, email, and password.
9. Confirm user/session/account rows are created as expected.
10. Confirm browser receives an auth cookie after sign-up/sign-in.
11. Visit `/login`, sign in with the same user, and confirm session is returned.
12. Test logout and confirm session is cleared.
13. Run project checks:
   - `cd frontend && pnpm lint`
   - `cd frontend && pnpm test`
   - `cd frontend && pnpm build`

## Detailed TODO

### 1. Add dependencies

From `frontend/`, add runtime dependencies:

```bash
pnpm add better-auth @better-auth/drizzle-adapter drizzle-orm postgres
```

Add development dependency:

```bash
pnpm add -D drizzle-kit
```

If Better Auth CLI is not installed as a project dependency, use `pnpm dlx @better-auth/cli@latest` for generation commands.

### 2. Add environment example

Create `frontend/.env.example` with placeholders only:

```env
DATABASE_URL=postgres://app_user:replace-with-password@localhost:5432/app_db
BETTER_AUTH_SECRET=replace-with-at-least-32-random-characters
BETTER_AUTH_URL=http://localhost:3000
```

Ensure real secrets are only placed in local ignored env files such as `frontend/.env` or `frontend/.env.local`.

### 3. Configure Drizzle

Create `frontend/drizzle.config.ts`.

Recommended shape:

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

Verify this config matches the installed Drizzle Kit version.

### 4. Create Drizzle database module

Create `frontend/src/db/index.ts`.

Implementation target:

- Import `postgres` from `postgres`.
- Import `drizzle` from `drizzle-orm/postgres-js`.
- Import schema from `./schema`.
- Read `process.env.DATABASE_URL` server-side.
- Export `db`.

Example structure:

```ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is required')
}

const client = postgres(connectionString)

export const db = drizzle(client, { schema })
export { schema }
```

### 5. Create initial placeholder schema file

Create `frontend/src/db/schema.ts` as an initial placeholder if the Better Auth CLI requires the file to exist.

Then run the Better Auth schema generation command and replace/update this file with generated auth tables.

Use the current Better Auth CLI command from docs:

```bash
pnpm dlx @better-auth/cli@latest generate
```

Verify generated schema uses PostgreSQL/Drizzle and includes required Better Auth tables.

If the CLI cannot find the auth config automatically, pass the config path explicitly with the CLI option supported by the installed version, for example pointing to `src/lib/auth.ts`.

### 6. Configure Better Auth server instance

Create `frontend/src/lib/auth.ts`.

Implementation target:

- Import `betterAuth` from `better-auth`.
- Import `drizzleAdapter` from `@better-auth/drizzle-adapter` based on current adapter docs.
- Import `tanstackStartCookies` from `better-auth/tanstack-start`.
- Import `db` and schema.
- Enable email/password auth.
- Optionally set `minPasswordLength: 8` for an explicit minimal password baseline.
- Configure Drizzle provider as `pg`.
- Add `tanstackStartCookies()` as the last plugin.

Example shape:

```ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db, schema } from '#/db'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  plugins: [tanstackStartCookies()],
})
```

Adjust imports if TypeScript/path aliases require `#/db/index` or relative paths.

Do not configure email verification or password reset in this first pass. Add those later after choosing an email delivery provider.

### 7. Mount Better Auth API route

Create `frontend/src/routes/api/auth/$.ts`.

Implementation target from Better Auth TanStack Start docs:

```ts
import { createFileRoute } from '@tanstack/react-router'
import { auth } from '#/lib/auth'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        return await auth.handler(request)
      },
      POST: async ({ request }: { request: Request }) => {
        return await auth.handler(request)
      },
    },
  },
})
```

Run `pnpm dev` if route tree regeneration is needed. Do not edit `routeTree.gen.ts` manually.

### 8. Create browser auth client

Create `frontend/src/lib/auth-client.ts`.

Implementation target:

```ts
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient()
```

Do not import server-only modules here.

### 9. Use Better Auth client directly for initial auth UI

For the first pass, use Better Auth’s React client methods/hooks directly:

Implementation target:

- `authClient.signUp.email(...)` for sign-up.
- `authClient.signIn.email(...)` for sign-in.
- `authClient.signOut()` for logout.
- `authClient.useSession()` and/or `authClient.getSession()` for session state.

Do not create custom server endpoints for auth actions unless Better Auth requires it.

### 10. Do not add TanStack Query provider for auth yet

TanStack Query is still a good choice for future application data, but it is not needed for the minimal Better Auth flow.

Avoid adding a QueryClient provider solely for authentication in this pass. If another part of the app later needs TanStack Query, introduce it separately with TanStack Start-compatible SSR/hydration conventions.

### 11. Add minimal `/signup` route

Create `frontend/src/routes/signup.tsx`.

Requirements:

- Name input.
- Email input.
- Password input.
- Submit button.
- Calls `authClient.signUp.email(...)` or the corresponding current Better Auth React client method with `name`, `email`, and `password`.
- Shows loading state.
- Shows errors returned by Better Auth.
- On success, redirect to home or a simple authenticated destination.

### 12. Add minimal `/login` route

Create `frontend/src/routes/login.tsx`.

Requirements:

- Email input.
- Password input.
- Submit button.
- Calls `authClient.signIn.email(...)` or the corresponding current Better Auth React client method.
- Shows loading state.
- Shows invalid credentials/network errors.
- On success, redirect to home or a simple authenticated destination.

### 13. Add logout/session visibility

Implement one minimal way to confirm session state:

- Add a small session indicator/logout button to `Header`, or
- Add a temporary authenticated status component on home.

Requirements:

- Show signed-in user's email if session exists.
- Show login/signup links if no session exists.
- Provide logout action.
- Use `authClient.useSession()` or `authClient.getSession()` from the Better Auth React client.

### 14. Generate and run migrations

After schema generation, run:

```bash
cd frontend
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

If scripts are preferred, add package scripts such as:

```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate"
}
```

Optionally add a script for Better Auth schema generation after confirming exact CLI command.

Recommended scripts after confirming commands:

```json
{
  "auth:generate": "pnpm dlx @better-auth/cli@latest generate",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate"
}
```

### 15. Manual auth flow validation

Run:

```bash
cd frontend
pnpm dev
```

Validate:

- `GET /api/auth/ok` returns a healthy Better Auth response.
- `/signup` creates a user with name, email, and password.
- Required Better Auth tables contain data.
- A session/cookie is created.
- `/login` signs in an existing user.
- Logout clears the session.
- Refreshing the page preserves logged-in state while the cookie/session is valid.

### 16. Automated/project validation

Run:

```bash
cd frontend
pnpm lint
pnpm test
pnpm build
```

Fix any TypeScript, lint, route generation, or build issues.

### 17. Leave future OAuth notes but do not implement yet

Document for later:

- Add Google OAuth with `socialProviders.google` in Better Auth config.
- Add env vars such as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- Configure redirect origins/URLs in Google Cloud Console.
- Add UI button for "Continue with Google".
