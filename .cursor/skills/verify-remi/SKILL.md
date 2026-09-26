---
name: verify-remi
description: Drive the Remi TanStack Start web UI (home, header, weekly menu planner, preferences, auth pages, and /es) in Chrome the way a user does. Use when a change touches frontend routes, planner state, or locale and must be proven against the running app.
---

# Verify Remi

Remi's primary surface is the TanStack Start app in `frontend/` (package name `frontend`). Every page shares `Header` and `Footer` from `frontend/src/routes/__root.tsx`.

Secondary surfaces, not separate apps:

- Better Auth HTTP under `/api/auth/*` (`frontend/src/routes/api/auth/$.ts`). The header calls `authClient.useSession()` on every page.
- Postgres in `infraestructure/postgres/` for auth persistence only. The weekly menu planner does not read or write it.
- Vitest (`pnpm --filter frontend test`) is unit tests, not a browser harness. There is no Playwright or Cypress suite.

Do not start recipe-database work to verify the UI. Custom recipes in the preferences panel live in `localStorage`, not Postgres.

## Launch

From the repo root. `corepack enable && pnpm install` once per checkout. No `frontend/.env` is required for home, locale, or the weekly menu planner.

```bash
.cursor/skills/verify-remi/scripts/launch.sh
```

That script refuses to start when TCP 3001 is already taken. It runs `pnpm --filter frontend dev`, which is `vite dev --port 3001`, in its own session, and records the pid in `.cursor/skills/verify-remi/run/dev.pid`. Logs go to `.cursor/skills/verify-remi/run/dev.log`.

Ready signal: the log contains `Local:   http://localhost:3001/`. `launch.sh` exits 0 only after that line appears.

Open `http://localhost:3001/`. Vite listens on `[::1]:3001` only. `http://127.0.0.1:3001/` does not connect. `localhost` does.

Teardown is `scripts/cleanup.sh` (see Cleanup). Do not leave the server up for the next task.

## Doctor

Read-only. Run it before any click. If it exits non-zero, do not drive.

```bash
.cursor/skills/verify-remi/scripts/doctor.sh
```

Worth driving only when all of these are true:

- Exactly one `LISTEN` socket on port 3001, and walking that process's parents reaches the pid in `run/dev.pid`. A listener you did not start is a shared instance. Stop.
- `curl -fsS http://localhost:3001/` returns 200 and the body contains `Remi - Your weekly meal planner`, `Probando`, and `Weekly menu`.
- `curl -fsS http://localhost:3001/api/auth/get-session` returns 200. With no cookie the body is `null`. That is a healthy logged-out app, including when `frontend/.env` is absent.
- The dev log may contain `Base URL could not be determined` when `BETTER_AUTH_URL` is unset. That warning does not block planner, home, or `/es` checks. It does block treating sign-in as successful.

`doctor.sh` prints `auth-submit: blocked` unless `frontend/.env` exists and `pg_isready` succeeds against `DATABASE_URL`. A blocked auth submit still allows opening `/login` and reading the form. Do not POST credentials in that state.

Planner HTML from `curl` always contains `No Weekly Menu yet`. Saved menus are applied after hydration from `localStorage`. Do not use the SSR body as proof that a menu was generated.

## Drive

Harness: Chrome DevTools Protocol. No Playwright or Cypress in this repo. Do not click by coordinates you invented. The helper scrolls the target into view, then sends `Input.dispatchMouseEvent` at the element's center, and checks `elementFromPoint` is that element.

Fresh profile every run (the helper uses `run/chrome-profile`, deleted only when that Chrome exits). Planner state is `localStorage` key `remi:weekly-menu-planner:state` on origin `http://localhost:3001`.

Canonical path for the weekly menu planner (the packaged script):

```bash
node .cursor/skills/verify-remi/scripts/drive-weekly-menu.mjs
```

Requires a doctor-clean server. Writes evidence under `.cursor/skills/verify-remi/evidence/<timestamp>/` and exits non-zero if an assertion fails. Chrome debug port is 9333. If 9333 is taken, the script exits. It does not attach to an existing browser.

What that script does, in order:

1. `http://localhost:3001/` — `html[lang="en"]`, `main.home-page` text `Probando`, header `a.header-logo` accessible name `Remi home`, `nav[aria-label="Primary"]` links `Weekly menu`, `Log in`, `Sign up`.
2. Click `main.home-page a.planner-entry-link` (accessible name `Weekly menu`). Path becomes `/weekly-menu-planner`.
3. Empty state: `h2` text `No Weekly Menu yet`. The `Shopping List` `button.tab-btn` is disabled. There is no `#planner-title` node; `aria-labelledby="planner-title"` on `.planner-shell` points at nothing.
4. Click the first `button.planner-primary-btn` (text `Generate menu`). The client handler waits 700ms. Resulting state: `h2` `No Weekly Menu yet` is gone; Monday shows `Roasted Tomato Soup & Sourdough` and `Herb-Crusted Salmon with Lentils`; a primary button reads `Regenerate menu`; `.planner-state-note` reads `Mock set 1 of 3`.
5. `localStorage['remi:weekly-menu-planner:state']` parses to `currentMenuIndex === 0`.
6. Click the `button.tab-btn` whose text starts with `Shopping List`. Heading `Everything you need for this week` is visible. Click the first `button.planner-ingredient-row` (`Cherry tomatoes`). `aria-pressed` becomes `true` and the row shows `In fridge`. Storage checklist key `produceAndFreshHerbs::Cherry tomatoes` is `{ checked: true, inFridge: true }`.

Other features: same Chrome rules, selectors in `features/`. Do not add a second dev server to reach them.

Clicks before hydration do nothing. The helper retries a click until the expected text appears or the attempt budget is spent. Match that behavior if you drive by hand.

## Evidence

Directory: `.cursor/skills/verify-remi/evidence/<UTC timestamp>/`. Gitignored. Cleanup must not delete it.

For the weekly menu run the helper writes:

- `01-home.png`, `02-planner-empty.png`, `03-planner-generated.png`, `04-shopping-toggled.png`
- `report.json` — final URL, `document.title`, visible assertions, `localStorage` snapshot, CDP network entries for the document and `/api/auth/get-session`, browser console errors
- `report.md` — the same facts in a short pass/fail list

Proof is a pass only when all of these are in that directory:

- The screenshots show the UI after the click, not a mock HTML file.
- Each action has a resulting state (empty heading replaced by meal names; ingredient `aria-pressed` flipped).
- The side effect is the real `localStorage` document from that Chrome profile, not a hand-written JSON file.
- `/api/auth/get-session` was answered by the dev server. Logged out, the body is `null`. Do not stub it.
- Menu names come from `frontend/src/data/menu.ts` inside the app. That built-in mock set is the product. Do not intercept it and do not call a generated menu "verified" if those names were injected.

Copy the directory aside only by leaving it in place. Do not commit it.

## Cleanup

```bash
.cursor/skills/verify-remi/scripts/cleanup.sh
```

Kills the process group recorded in `run/dev.pid` and `run/chrome.pid`, and only those. Removes `run/chrome-profile` after Chrome is dead so the next run starts from an empty `localStorage`. Does not delete `run/dev.log`, pid files, or anything under `evidence/`.

After cleanup, `lsof -nP -iTCP:3001 -sTCP:LISTEN` must print nothing. The evidence directory from the run must still be on disk.

Do not kill other `node` or `chrome` processes to get there.

## Helpers

| Script | Invocation |
| --- | --- |
| Launch | `.cursor/skills/verify-remi/scripts/launch.sh` |
| Doctor | `.cursor/skills/verify-remi/scripts/doctor.sh` |
| Weekly menu drive | `node .cursor/skills/verify-remi/scripts/drive-weekly-menu.mjs` |
| Cleanup | `.cursor/skills/verify-remi/scripts/cleanup.sh` |

All paths are from the repo root. Shell helpers are executable. `drive-weekly-menu.mjs` is started with `node` so it does not depend on the executable bit.

## Isolate

One verification session owns one Vite process on port 3001 and one Chrome profile.

- `launch.sh` will not start a second server. If doctor finds a listener whose parent chain does not include `run/dev.pid`, refuse to drive. Do not "just use" a server another agent started: env, HMR, and auth cookies are not yours.
- Two Vite processes cannot share port 3001. Vite here binds `[::1]:3001`, so a second process can still bind `127.0.0.1:3001` and split traffic. That is not isolation. Do not do it.
- Planner data is per browser profile, not per server. Two drivers on one profile will overwrite `remi:weekly-menu-planner:state`.
- Postgres (`infraestructure/postgres/docker-compose.yml`) uses `container_name: postgres` and publishes `${TAILSCALE_IP}:15432:5432`. Only one of those can run. Auth writes are shared database state. Never run two sign-up flows against it in parallel.

Feature map: `features/README.md`.
