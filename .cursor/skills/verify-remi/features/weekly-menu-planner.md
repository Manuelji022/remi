# Weekly menu planner

Route `/weekly-menu-planner`. Component `WeeklyMenuPlanner` in `frontend/src/routes/weekly-menu-planner.tsx`. Spanish route `/es/weekly-menu-planner` uses the same component.

Packaged drive:

```bash
node .cursor/skills/verify-remi/scripts/drive-weekly-menu.mjs
```

## Sub-features

- Week navigation: `div.planner-week-nav` labelled `Week navigation`. Previous `button.planner-week-nav-btn` accessible name `Previous week`. Next button accessible name `Next week`. The pill `.planner-week-pill` is `aria-live="polite"` and shows `Week {n} - {start} to {end}`.
- Generate / regenerate: `button.planner-primary-btn`.
- Menu tab and shopping tab: `button.tab-btn` texts `Weekly Menu` and `Shopping List`.
- Day cards: `article.day-card`, day name in `.day-name`, meals in `.meal-name`.
- Persistence: logged out, `localStorage` key `remi:weekly-menu-planner:state` holds the schedule. Signed in, the viewed Monday's day context and meal slots are `weekly_menu` / `weekly_menu_day` rows for that user. The week grid appears only after that row exists. A guest Generate opens an empty grid in memory and does not write it. Recipes are not in that document. See [preferences.md](preferences.md).

## How to get to it (user POV)

On `/`, click `Weekly menu` in the page body (`main.home-page a.planner-entry-link`) or the same label in the header. The address bar shows `/weekly-menu-planner`.

## Driving it with Chrome CDP

Use a new Chrome profile so the storage key is absent. `drive-weekly-menu.mjs` does that.

1. Land from Home (see [home.md](home.md)). Path is `/weekly-menu-planner`.
2. Empty state `h2` is `No Weekly Menu yet`. Body copy starts `Generate a menu from your saved recipes.` The `Shopping List` button is `disabled`. Week pill matches `Week ` and ` to `. At offset 0 both week buttons are enabled (`weekOffset` may move from -1 to 1). Previous disables only after one previous-week click; next disables only after one next-week click.
3. Click the first `button.planner-primary-btn` (`Generate menu`). A guest click does not call the server and does not show `Building your Weekly Menu`.
4. Resulting state for a fresh profile: the body contains `No home-planned meal` and `Regenerate menu`. It does not contain `Roasted Tomato Soup & Sourdough`, `Herb-Crusted Salmon with Lentils`, or `Mock set`. `No Weekly Menu yet` is gone. `Shopping List` stays `disabled`.

Screenshots from the packaged script: `02-planner-empty.png`, `03-planner-generated.png`.

## Gotchas

- `section.planner-shell` has `aria-labelledby="planner-title"` and no element with that id. Do not wait for `#planner-title`.
- TanStack devtools renders a small `TanStack` button at the bottom-left in `pnpm dev`. It is not product UI. Do not click it. Clicks use `elementFromPoint` so a covered target fails instead of hitting the devtools shell.
- `curl` of this route always shows the empty state. A guest grid is memory only, so a refresh returns to `No Weekly Menu yet`.
- A guest Generate assigns nothing. Home slots read `No home-planned meal`. Do not treat an invented dish title as a successful generate.
- `Shopping List` stays disabled. The tab badge stays at zero.

## Signed-in week

```bash
node .cursor/skills/verify-remi/scripts/drive-menu-week.mjs
```

Requires `auth-submit: ready`. The script does not use `/login`. Logged out, it generates the empty guest grid and saves Tuesday as Eat out. It then signs up, stores `better-auth.session_token`, and refetches the session on the same page. It adds dinner recipe `Lemon pasta` on My Recipes, sets Monday to Office, saves, and clicks Generate.

Resulting state on the current Monday: `.day-context-badge` is `Office`, lunch `.meal-name` is `No home-planned meal`, dinner `.meal-name` is `Lemon pasta`. Reload shows the same card. `Previous week` changes the week pill and does not show `Lemon pasta` or Office. `Next week` restores the original pill, Office, and `Lemon pasta`.

The script then adds dinner `Herb rice`, clicks `Next week`, and clicks Generate. The next Monday dinner `.meal-name` is `Herb rice`. The next Tuesday dinner `.meal-name` is `Lemon pasta`. That repeat is the thin dinner pool: both owned dinners are placed, and the one from the previous Monday comes second. Later dinners stay `No home-planned meal`. `Previous week` restores Office and `Lemon pasta` on the original Monday.

`savedPreferences.dayContexts.Tuesday` stays `"eatOut"` and Monday stays absent. Log out, then Generate, shows Tuesday Eat out and no Monday Office badge. A `POST` whose URL contains `/_serverFn/` returns 200. The script deletes the throwaway user. A guest Generate never reads the previous Monday.
