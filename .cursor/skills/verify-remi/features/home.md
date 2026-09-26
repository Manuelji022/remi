# Home

Route `/`. Component `IndexPage` in `frontend/src/routes/index.tsx`. Copy comes from `home.copy`. English is `Plan meals for this week and shop from one list.` Spanish is `Planifica las comidas de esta semana y compra con una sola lista.`

## Sub-features

- Landing copy in `main.home-page`.
- Entry link `a.planner-entry-link` to the weekly menu planner.
- Header and footer, including logged-out auth links.

## How to get to it (user POV)

Open `http://localhost:3001/`. The logo `Remi home` returns here from any English page. From Spanish, the logo goes to `/es`, not `/`.

## Driving it with Chrome CDP

1. `Page.navigate` to `http://localhost:3001/`. Do not use `127.0.0.1`.
2. `document.documentElement.lang` is `en`.
3. `document.title` is `Remi - Your weekly meal planner`.
4. `main.home-page` contains `Plan meals for this week and shop from one list.`
5. `nav[aria-label="Primary"] a.header-logo` has accessible name `Remi home`.
6. `main.home-page a.planner-entry-link` text is `Weekly menu`. Click it with a real mouse event after hydration. `location.pathname` becomes `/weekly-menu-planner`.
7. `a.header-auth-link` texts are `Log in` (`/login`) and `Sign up` (`/signup`) when `/api/auth/get-session` is `null`.

The packaged weekly-menu script starts with this page and writes `01-home.png`.

## Gotchas

- SSR HTML contains null bytes between nodes. Search with a text extractor that allows binary, or read `document.body.innerText` in the browser. `grep` without `-a` may call the curl body a binary file.
- `curl http://127.0.0.1:3001/` fails. The dev server listens on `[::1]:3001`.
- Two `a.planner-entry-link` nodes exist (header and main). Click the one inside `main.home-page` when the task is "from the home page".
- Session fetch failure is not a blank page. Logged out, the header still shows `Log in` and `Sign up`.
