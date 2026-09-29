---
name: verify-remi
description: Drive the Remi TanStack Start web UI (home, header, weekly menu planner, preferences, auth pages, and /es) in Chrome the way a user does. Use when a change touches frontend routes, planner state, or locale and must be proven against the running app.
---

# Verify Remi

Remi's primary surface is the TanStack Start app in `frontend/` (package name `frontend`). Every page shares `Header` and `Footer` from `frontend/src/routes/__root.tsx`.

Secondary surfaces, not separate apps:

- Better Auth HTTP under `/api/auth/*` (`frontend/src/routes/api/auth/$.ts`). The header calls `authClient.useSession()` on every page.
- Postgres in `infraestructure/postgres/` for auth sessions, the signed-in user's recipes (`recipe`, `recipe_ingredient`), and the signed-in weekly menu (`weekly_menu`, `weekly_menu_day`). Logged out, the weekly schedule stays in `localStorage`. Signed in, day context and recipe ids for the viewed Monday are Postgres rows. Generate does not store a mock menu index.
- Vitest (`pnpm --filter frontend test`) is unit tests, not a browser harness. There is no Playwright or Cypress suite.

Recipes in Preferences are rows for the signed-in user. Logged out, the Recipes tab says to sign in and does not call `/_serverFn/`. `drive-recipes.mjs` proves that path on every run. The create-and-reload path runs only when doctor prints `auth-submit: ready`. `/login` drops the session unless email OTP finishes, so that path does not submit the login form and does not fake an inbox. It calls `POST /api/auth/sign-up/email`, stores `better-auth.session_token`, and deletes that user at the end.

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
- `curl -fsS http://localhost:3001/` returns 200 and the body contains `Remi - Your weekly meal planner`, `Plan meals for this week and shop from one list.`, and `Weekly menu`.
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

1. `http://localhost:3001/` — `html[lang="en"]`, `main.home-page` text `Plan meals for this week and shop from one list.`, header `a.header-logo` accessible name `Remi home`, `nav[aria-label="Primary"]` links `Weekly menu`, `Log in`, `Sign up`.
2. Click `main.home-page a.planner-entry-link` (accessible name `Weekly menu`). Path becomes `/weekly-menu-planner`.
3. Empty state: `h2` text `No Weekly Menu yet`. The `Shopping List` `button.tab-btn` is disabled. There is no `#planner-title` node; `aria-labelledby="planner-title"` on `.planner-shell` points at nothing.
4. Click the first `button.planner-primary-btn` (text `Generate menu`). A guest click does not call the server. Resulting state: `h2` `No Weekly Menu yet` is gone; the body contains `No home-planned meal` and `Regenerate menu`; it does not contain `Roasted Tomato Soup & Sourdough`, `Herb-Crusted Salmon with Lentils`, or `Mock set`. The `Shopping List` button stays disabled.

Other features: same Chrome rules, selectors in `features/`. Do not add a second dev server to reach them.

Recipes tab (separate packaged script, same Chrome rules):

```bash
node .cursor/skills/verify-remi/scripts/drive-recipes.mjs
```

Logged out, every run:

1. Open `/weekly-menu-planner`, then `Preferences`, then `My Recipes`.
2. `#preferences-recipes-panel` shows `Sign in to save recipes.` There is no `input[name="recipeName"]`.
3. `remi:weekly-menu-planner:state` has no `customRecipes` key.
4. No request URL contains `/_serverFn/`. `GET /api/auth/get-session` is still 200.

Logged in, only when doctor printed `auth-submit: ready` (`frontend/.env` has `DATABASE_URL` and `BETTER_AUTH_SECRET`, and `pg_isready` succeeds). Set `BETTER_AUTH_URL=http://localhost:3001`. The script signs up a throwaway user, reloads with that session, adds `Lemon chickpea pasta` with `1` `g` of `chickpeas`, reloads, and the card is still on `My Recipes`. It then deletes the recipe and the user. If `auth-submit` is blocked, the report says `logged-in recipes: skipped` and the run can still pass the logged-out checks. That skip is not a create proof.

Signed-in Generate reads the previous Monday from Postgres and fills each open slot with owned recipes that were not placed that week, in pool order. Recipes placed last week fill a slot only after the fresh recipes in that slot are used. Further slots stay `No home-planned meal`. A guest Generate does not load a previous week.

Owner-scoped SQL, without Chrome:

```bash
RECIPE_DATABASE_TESTS=1 DATABASE_URL='postgres://…' pnpm --filter frontend exec vitest run src/recipes/store.test.ts
```

The file skips unless `RECIPE_DATABASE_TESTS=1`.

Signed-in weekly menu, when doctor printed `auth-submit: ready`:

```bash
node .cursor/skills/verify-remi/scripts/drive-menu-week.mjs
```

The script generates an empty guest grid while logged out, saves Tuesday as Eat out, then signs up a throwaway user the same way as `drive-recipes.mjs` and adopts that session without reloading. It adds a dinner recipe named `Lemon pasta` through the recipes form, sets Monday to Office, saves, and runs Generate. That Monday card shows Office, lunch `No home-planned meal`, and dinner `Lemon pasta`. Reload shows the same card. Previous week does not show that dinner name or Office. Returning to the current week shows them again. It then adds a second dinner, `Herb rice`, opens the next week, and runs Generate. That Monday dinner is `Herb rice`. Tuesday dinner is `Lemon pasta`, because the dinner pool has only those two recipes. Returning to the current week still shows Office and `Lemon pasta`. The guest `localStorage` schedule keeps Tuesday Eat out and does not gain that Monday context. A reload clears the in-memory guest grid, so after log out the script clicks Generate again. That grid shows Tuesday Eat out and no Monday Office. Vitest `src/menu/store.test.ts` runs in `pnpm test` against in-process Postgres and checks the same owner split for the current Monday and the prior Monday. Vitest `src/menu/week.test.ts` checks that a prior recipe id is placed only after fresh ids in the same slot, and that a pool made entirely of prior ids still fills in pool order.

Clicks before hydration do nothing. The helper retries a click until the expected text appears or the attempt budget is spent. Match that behavior if you drive by hand.

## Evidence

Directory: `.cursor/skills/verify-remi/evidence/<UTC timestamp>/`. Gitignored. Cleanup must not delete it.

For the weekly menu run the helper writes:

- `01-home.png`, `02-planner-empty.png`, `03-planner-generated.png`
- `report.json` — final URL, `document.title`, visible assertions, `localStorage` snapshot, CDP network entries for the document and `/api/auth/get-session`, browser console errors
- `report.md` — the same facts in a short pass/fail list

`drive-recipes.mjs` writes its own timestamp directory: `01-recipes-signed-out.png`, and when auth submit is ready `02-recipe-added.png` and `03-recipe-after-reload.png`, plus `report.json` and `report.md`. A skipped logged-in step is named in the report. It is not a screenshot of a saved recipe.

Proof is a pass only when all of these are in that directory:

- The screenshots show the UI after the click, not a mock HTML file.
- Each action has a resulting state (empty heading replaced by `No home-planned meal` and `Regenerate menu`).
- The side effect is the real `localStorage` document from that Chrome profile, not a hand-written JSON file.
- `/api/auth/get-session` was answered by the dev server. Logged out, the body is `null`. Do not stub it.
- A guest Generate does not invent dish titles. Do not call the grid verified if `Roasted Tomato Soup & Sourdough`, `Herb-Crusted Salmon with Lentils`, or `Mock set` was injected.

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
| Recipes drive | `node .cursor/skills/verify-remi/scripts/drive-recipes.mjs` |
| Cleanup | `.cursor/skills/verify-remi/scripts/cleanup.sh` |

All paths are from the repo root. Shell helpers are executable. `drive-weekly-menu.mjs` is started with `node` so it does not depend on the executable bit.

## Isolate

One verification session owns one Vite process on port 3001 and one Chrome profile.

- `launch.sh` will not start a second server. If doctor finds a listener whose parent chain does not include `run/dev.pid`, refuse to drive. Do not "just use" a server another agent started: env, HMR, and auth cookies are not yours.
- Two Vite processes cannot share port 3001. Vite here binds `[::1]:3001`, so a second process can still bind `127.0.0.1:3001` and split traffic. That is not isolation. Do not do it.
- Planner data is per browser profile, not per server. Two drivers on one profile will overwrite `remi:weekly-menu-planner:state`.
- Postgres (`infraestructure/postgres/docker-compose.yml`) uses `container_name: postgres` and publishes `${TAILSCALE_IP}:15432:5432`. Only one of those can run. Auth writes are shared database state. Never run two sign-up flows against it in parallel.

Feature map: `features/README.md`.
