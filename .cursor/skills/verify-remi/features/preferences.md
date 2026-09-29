# Preferences and recipes

Not a route. Dialog opened from the weekly menu planner. Component `PreferencesPanel` in `frontend/src/components/preferences-panel/PreferencesPanel.tsx`.

Signed-in recipes are Postgres rows (`recipe`, `recipe_ingredient`), loaded through `createServerFn` in `frontend/src/recipes/functions.ts`. The caller must be the Better Auth session user. Logged out, the tab does not write. Leftover `customRecipes` in `remi:weekly-menu-planner:state` are imported once when a signed-in user opens Preferences, then that key is omitted on later writes.

Packaged drive:

```bash
node .cursor/skills/verify-remi/scripts/drive-recipes.mjs
```

## Sub-features

- Open, cancel, and save.
- Weekly schedule: day context pills and planning-scope pills.
- My recipes: name, lunch/dinner, ingredients, add, delete.
- Language switch inside the dialog header (`a.panel-language-switcher`). That is the only EN/ES control in the UI. See [locale-es.md](locale-es.md).

## How to get to it (user POV)

Open `/weekly-menu-planner`. Click the button labelled `Preferences` (`button.planner-secondary-btn` in `div.planner-actions`). A dialog slides over the page. `Esc` is not wired; use `Close preferences panel` or `Cancel`.

## Driving it with Chrome CDP

Start from a doctor-clean planner page.

1. Click `button.planner-secondary-btn`. Result: `aside.panel-drawer[role="dialog"][aria-modal="true"]` labelled by `#preferences-panel-title` (`Preferences`). The schedule tab is selected.
2. `div.panel-tablist[role="tablist"]` has `button#preferences-schedule-tab` (`Weekly Schedule`, `aria-selected="true"`) and `button#preferences-recipes-tab` (`My Recipes`).
3. Schedule panel `#preferences-schedule-panel` lists Monday–Sunday. Each `article.panel-day-card` has context buttons `Office` and `Eat out` (`button.panel-context-pill`) and scope buttons `Lunch`, `Dinner`, `Both` (`button.panel-scope-pill`). With no context, `Both` is selected and the single-slot scopes are disabled.
4. Click `Office` on the Monday card. Resulting state: that pill has class `selected`, the card text becomes `Office day`, and `Dinner` (or the remaining home slot) is the enabled scope. This is draft state only.
5. Click `button.panel-primary-btn` (`Save preferences`). The dialog closes. The `Preferences` button shows a badge (`.planner-btn-badge`) with the active preference count. Reload `/weekly-menu-planner` and confirm Monday's `article.day-card` shows `Office`. Storage `savedPreferences.dayContexts.Monday` is `"office"`.
6. Open the dialog again. Click `button#preferences-recipes-tab`. Logged out, `#preferences-recipes-panel` shows `Sign in to save recipes.` and a `Log in` link. `input[name="recipeName"]` is absent. No request URL contains `/_serverFn/`. Storage has no `savedPreferences.customRecipes`.
7. Logged-in checks require doctor `auth-submit: ready`. Do not use `/login` for them. That page signs the user out unless OTP redirects to `/two-factor`, and OTP needs `RESEND_API_KEY`. `drive-recipes.mjs` signs up through `POST /api/auth/sign-up/email` and sets `better-auth.session_token`.
8. With that session, reopen `My Recipes`. Wait until `input[name="recipeName"]` exists (`Loading recipes...` means the list call is still in flight). The empty copy is `No recipes saved yet.`
9. Fill `input[name="recipeName"]` with `Lemon chickpea pasta`. The slot group labelled `Choose whether this recipe is for lunch or dinner` defaults to `Dinner`. Fill `input[placeholder="Ex. chickpeas"]` with `chickpeas`, the quantity `input[type="number"]` with `1`, and the unit `select` with `g`.
10. Click `button.panel-add-btn` (`Add recipe`). Result: `.panel-recipe-card` contains the name, `Dinner`, and `chickpeas`. The name input is cleared. This POST hits `/_serverFn/`. `Save preferences` is not required.
11. Reload `/weekly-menu-planner`. Open Preferences, then `My Recipes`. The same card is still there. Delete with the button whose accessible name is `Delete Lemon chickpea pasta`. The empty copy returns. Storage still has no `customRecipes` key.

`Cancel` (`button.panel-secondary-btn`) and the overlay `button.panel-overlay` (accessible name `Close preferences panel`) drop the draft. Confirm by reopening: unsaved `Office` is gone.

## Gotchas

- A recipe POST persists immediately. `Cancel` does not remove it. `Save preferences` only writes schedule fields.
- Logged out, do not look for the form. The sign-in copy is the result.
- `Add recipe` stays disabled until the name is non-empty. A negative quantity shows `Ingredient quantities must be zero or greater.` and keeps the button disabled.
- Ingredient `name` attributes are generated with `useId()` and change between reloads. Use the placeholder `Ex. chickpeas` or the label `Ingredient`, not a hard-coded id.
- The badge counts schedule context only, not recipes. Assert the Monday card and the recipe card, not a combined number.
- Server function ids are content hashes under `/_serverFn/`. Match that prefix. Do not pin a hash.
- `auth-submit: blocked` means skip the create path. Record the skip. Do not claim the card survived a reload.
