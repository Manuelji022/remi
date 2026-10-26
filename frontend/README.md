Welcome to your new TanStack Start app!

# Getting Started

To run this application:

```bash
pnpm install
pnpm dev
```

# Building For Production

To build this application for production:

```bash
pnpm build
```

## Local development account

To create a repeatable local account, set `DEV_SEED_USER_NAME`,
`DEV_SEED_USER_EMAIL`, and `DEV_SEED_USER_PASSWORD` in `.env`, then run:

```bash
pnpm db:migrate
pnpm db:seed-user
```

The seed command creates a Better Auth email/password account and leaves an
existing account's password unchanged. It requires a localhost auth URL. For a
remote development database only, set `DEV_SEED_ALLOW_REMOTE_DATABASE=true`
after confirming the target; the command refuses remote databases by default.
Sign in through the normal login page.
This app requires a one-time email code, so configure `RESEND_API_KEY` and
`OTP_EMAIL_FROM` and use an email address whose inbox you can access.

This is seed data, not a schema migration: migrations define database structure
and run across environments. Seed only a development database; localhost is
required by default, and a remote development database requires the explicit
opt-in above.

### Mock recipes

`drizzle/0005_seed_mock_recipes.sql` adds 25 lunch/dinner recipes with ingredients
for the existing mock account `manueljialt@gmail.com`. It does not create a user
or modify other accounts. `pnpm db:migrate` applies it automatically if that
account already exists; otherwise it safely skips the data insert.

On a fresh database, create the development account first using the commands
above, then apply the data migration explicitly from `frontend/` (with
`DATABASE_URL` exported in your shell):

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/0005_seed_mock_recipes.sql
```

This file targets the email above, not `DEV_SEED_USER_EMAIL` dynamically. Reapplying
it does not duplicate recipes or overwrite existing recipe/ingredient edits.

When accessing the dev server through Tailscale with `pnpm dev --host`, add the
exact browser origin to `BETTER_AUTH_TRUSTED_ORIGINS` in `.env`, for example
`http://100.x.y.z:3001` for a Tailscale IP or
`https://machine.tailnet-name.ts.net` for Tailscale Serve. Keep this an
explicit origin (no wildcard) and restart the dev server after changing it.

## Testing

This project uses [Vitest](https://vitest.dev/) for testing. You can run the tests with:

```bash
pnpm test
```

## Styling

This project uses vanilla CSS

## Linting & Formatting

This project uses [eslint](https://eslint.org/) and [prettier](https://prettier.io/) for linting and formatting. Eslint is configured using [tanstack/eslint-config](https://tanstack.com/config/latest/docs/eslint). The following scripts are available:

```bash
pnpm lint
pnpm format
pnpm check
```

## Deploy with Nitro

This project uses Nitro as a generic server adapter, so it can run on any Node-compatible host.

```bash
npm run build
node dist/server/index.mjs
```

The build output is a self-contained Node server. To deploy, push the `dist/` directory to your host (Render, Fly.io, your own VPS, etc.) and run the server command above.

For host-specific presets (Vercel, Netlify, Cloudflare, AWS Lambda, etc.) and tuning, see https://v3.nitro.build/deploy.

## Source organization

Feature code lives in `src/features/<feature>/` (for example `auth`, `recipes`, `weekly-menu`, and `home`). Keep feature-specific pages, components, domain logic, server functions, styles, and tests together. `src/routes/` contains only TanStack file-route declarations that connect URLs to feature pages. Feature-agnostic UI primitives live in `src/components/primitives/`; shared infrastructure (database, i18n, and global styles) lives in `src/shared/`. The app shell lives in `src/app/`.

## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from '@tanstack/react-router'
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

Here is an example layout that includes a header:

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  ),
})
```

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start provides server functions that allow you to write server-side code that seamlessly integrates with your client components.

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})

// Use in a component
function MyComponent() {
  const [time, setTime] = useState('')

  useEffect(() => {
    getServerTime().then(setTime)
  }, [])

  return <div>Server time: {time}</div>
}
```

## API Routes

You can create API routes by using the `server` property in your route definitions:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: () => json({ message: 'Hello, World!' }),
    },
  },
})
```

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json()
  },
  component: PeopleComponent,
})

function PeopleComponent() {
  const data = Route.useLoaderData()
  return (
    <ul>
      {data.results.map((person) => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  )
}
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

# Demo files

Files prefixed with `demo` can be safely deleted. They are there to provide a starting point for you to play around with the features you've installed.

# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

For TanStack Start specific documentation, visit [TanStack Start](https://tanstack.com/start).
