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
- Persistence: `localStorage` key `remi:weekly-menu-planner:state`.

## How to get to it (user POV)

On `/`, click `Weekly menu` in the page body (`main.home-page a.planner-entry-link`) or the same label in the header. The address bar shows `/weekly-menu-planner`.

## Driving it with Chrome CDP

Use a new Chrome profile so the storage key is absent. `drive-weekly-menu.mjs` does that.

1. Land from Home (see [home.md](home.md)). Path is `/weekly-menu-planner`.
2. Empty state `h2` is `No Weekly Menu yet`. Body copy starts `Start with a generated mock menu.` The `Shopping List` button is `disabled`. Week pill matches `Week ` and ` to `. At offset 0 both week buttons are enabled (`weekOffset` may move from -1 to 1). Previous disables only after one previous-week click; next disables only after one next-week click.
3. Click the first `button.planner-primary-btn` (`Generate menu`). Wait out the 700ms `Generating` state (`h2` `Building your Weekly Menu`). Do not click again while that heading is up — a second click is ignored while `isGenerating` is true, and a click after it finishes advances to mock set 2.
4. Resulting state for a fresh profile: Monday `.meal-name` values `Roasted Tomato Soup & Sourdough` and `Herb-Crusted Salmon with Lentils`. `.planner-state-note` is `Mock set 1 of 3`. A primary button reads `Regenerate menu`. `No Weekly Menu yet` is gone.
5. Side effect: `JSON.parse(localStorage.getItem('remi:weekly-menu-planner:state')).currentMenuIndex === 0`.
6. Click the `Shopping List` `button.tab-btn`. `h2` is `Everything you need for this week`. The first `button.planner-ingredient-row` contains `Cherry tomatoes` and `aria-pressed="false"`.
7. Click that row once. `aria-pressed="true"`, the row contains `In fridge`, and storage `shoppingChecklist['produceAndFreshHerbs::Cherry tomatoes']` is `{ "checked": true, "inFridge": true }`.
8. Click `Reset checklist` (`button.planner-reset-btn`) only when you mean to clear those flags. The row returns to `aria-pressed="false"`.

Screenshots from the packaged script: `02-planner-empty.png`, `03-planner-generated.png`, `04-shopping-toggled.png`.

## Gotchas

- `section.planner-shell` has `aria-labelledby="planner-title"` and no element with that id. Do not wait for `#planner-title`.
- `curl` of this route always shows the empty state. Hydration replaces it from `localStorage`. A screenshot taken before hydration can show an empty week that the storage key has already filled. Read the key after the meal names are on screen.
- Generation is local. There is no menu POST. The names are the first set in `frontend/src/data/menu.ts`. Seeing those names is the product, not a stub you should replace.
- The shopping badge on the tab is the count of items still needed. Ticking `Cherry tomatoes` decreases it. Assert the row, not a hard-coded badge number, because the count depends on the whole list.
- `Regenerate menu` cycles the three English sets. Set 2 Monday lunch is `Miso Soup with Tofu & Wakame`. If you see that on the first generate, the profile was not empty or the button was clicked twice.
