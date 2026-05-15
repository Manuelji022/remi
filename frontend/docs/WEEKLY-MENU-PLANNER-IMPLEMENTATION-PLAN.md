# Weekly Menu Planner — Frontend Mock Implementation Plan

## Current Status

The visual mockup already exists in `frontend/docs/weekly-menu-planner (1).jsx` and represents the target experience for the first frontend-only phase.

The frontend codebase already contains extracted route, component, data, icon, and stylesheet files under `frontend/src/`, but the route `/weekly-menu-planner` is still a placeholder and the extracted pieces are not yet assembled into a functional screen.

Because of that, the next priority is not creating more files. The next priority is integrating the existing pieces into one coherent mock-first vertical slice.

## Product Goal for This Phase

Build a fully navigable frontend-only weekly menu planner using mock data, with enough structure to support a later backend/API/AI phase without needing to rework the UI architecture from scratch.

## Key Conclusions From Review

- The mockup already defines the feature scope for this phase: menu generation, day-level display, preferences, custom recipes, shopping list, and checklist progress.
- The current implementation plan over-emphasised file extraction work, but most of that extraction has already happened.
- The biggest near-term risk is data-model drift between the mockup and the extracted frontend files.
- The route should now be built vertically from the user-facing experience downward, instead of continuing to split work by file creation tasks.
- The shopping list should be implemented after menu generation and preferences, because it depends on generated menu state and checklist state.

## Recommended Build Order

1. Align the frontend data model with the mockup.
2. Replace the planner route placeholder with a working page shell and state.
3. Build the menu tab first.
4. Build the preferences panel second.
5. Build the shopping list tab third.
6. Finish with styling cleanup, accessibility, and validation.

---

## Phase 1 — Data Model Alignment

### Objective

Stabilise the frontend mock data and types before wiring the main UI.

- [x] Define the final mock types needed by the screen:
  - `Day`
  - `Meal`
  - `MealSlot`
  - `WeeklyMenu`
  - `IngredientCategory`
  - `Preferences`
  - `CustomRecipe`
- [x] Align `MENU_SETS` with the mockup structure so each generated menu is grouped by day and each day contains `lunch` and `dinner`
- [x] Keep `INGREDIENT_SETS` index-aligned with generated menu sets
- [x] Make preference fields optional or nullable where the UI allows no selection
- [x] Add or standardise helper functions for:
  - default preferences
  - checklist generation
  - needed-items count
  - active-preferences badge count
- [x] Remove or refactor any placeholder type shape that would force a second rewrite later

### Why This Comes First

The current extracted code does not fully match the mockup's state and data shape. Locking this down first reduces churn in every component built on top of it.

---

## Phase 2 — Planner Shell and Page State

### Objective

Replace the current placeholder route with a functional planner shell that owns the page state.

- [x] Replace the placeholder in `src/routes/weekly-menu-planner.tsx`
- [x] Add local mock-state management for:
  - generated menu
  - loading state
  - current menu index
  - animation state if still needed
  - active tab
  - preferences panel open/close
  - draft preferences vs saved preferences
  - shopping checklist state
- [x] Implement the mock `generate` flow with loading feedback
- [x] Wire the primary actions:
  - generate menu
  - open preferences
  - switch between tabs
- [x] Add the page shell pieces already defined in the mockup:
  - header
  - divider
  - footer

### Deliverable

The route should stop being a placeholder and become a working top-level screen with state and navigation.

---

## Phase 3 — Menu Tab

### Objective

Build the main weekly-planning experience first, since it is the core user value of the screen.

- [x] Render the week header
- [x] Render all 7 day cards from the generated menu
- [x] Show lunch and dinner for each day
- [x] Reflect weekend styling
- [x] Reflect saved preferences in each day card display
- [x] Decide and implement how day cards respond to preferences:
  - office / eat out indicator
  - lunch / dinner / both visibility or emphasis
- [x] Add pre-generation empty state
- [x] Add loading state during generation
- [x] Add the AI reasoning section using mock content
- [x] Add entrance animations only after the structure is working

### Deliverable

Users can generate a weekly menu and understand the generated result without opening any other panel.

---

## Phase 4 — Preferences Panel

### Objective

Let users define the constraints that shape the weekly plan, even though generation is still mock-based in this phase.

- [x] Build the drawer overlay and slide-in panel
- [x] Add the internal panel tabs:
  - weekly schedule
  - my recipes
- [x] Implement day-level schedule controls:
  - office
  - eat out
- [x] Implement day-level meal focus controls:
  - lunch
  - dinner
  - both
- [x] Implement draft editing behaviour so changes are only committed on save
- [x] Implement custom recipe creation form
- [x] Implement custom recipe list
- [x] Implement custom recipe deletion
- [x] Update the preferences badge count from saved preferences
- [x] Confirm cancel/save flows behave predictably

### Deliverable

The preferences panel behaves as a real product surface even before backend persistence exists.

---

## Phase 5 — Shopping List Tab

### Objective

Build the ingredient checklist after menu generation is working, because the shopping list is downstream from the generated menu.

- [x] Keep the shopping-list tab disabled until a menu exists
- [x] Build the shopping list header and helper text
- [x] Build the progress pill based on checklist completion
- [x] Implement reset checklist action
- [x] Render grouped ingredient categories
- [x] Apply category colour treatment from mock data
- [x] Implement ingredient row toggling
- [x] Implement checked state visuals:
  - custom checkbox
  - strikethrough label
  - in-fridge tag
- [x] Show per-category progress counts
- [x] Show global needed-items badge in the tab
- [x] Show summary banners:
  - items left to buy
  - fully stocked state

### Deliverable

Users can turn a generated menu into a usable shopping checklist without backend support.

---

## Phase 6 — Styling Cleanup, Accessibility, and Validation

### Objective

Refine the implementation so the first frontend milestone is solid enough to build on.

- [ ] Move any remaining one-off styling into maintainable CSS classes where appropriate
- [ ] Keep the existing visual language of the mockup rather than defaulting to generic UI styling
- [ ] Validate responsive behaviour across desktop and mobile widths
- [ ] Add focus-visible states for interactive controls
- [ ] Ensure buttons, tabs, and panel controls have clear accessible names
- [ ] Avoid non-semantic clickable containers unless keyboard interaction is explicitly supported
- [ ] Review disabled states and loading states for clarity
- [x] Run `pnpm lint`
- [x] Run `pnpm check`
- [x] Run `pnpm build`

### Deliverable

The frontend mock milestone is complete, polished, and ready for backend integration later.

---

## Deferred Beyond This Frontend-Only Phase

- [ ] Persist preferences with `localStorage`
- [ ] Persist generated menu and checklist state across reloads
- [ ] Incorporate previous-week menu awareness into generation logic
- [ ] Add backend models and API integration
- [ ] Replace mock generation with real AI-assisted generation
- [ ] Introduce server-side validation and persistence rules

---

## Definition of Done for the Current Milestone

This first milestone should be considered complete when:

- [x] `/weekly-menu-planner` is fully interactive with mock data
- [x] Menu generation works end-to-end in the UI
- [x] Preferences can be edited and saved in session state
- [x] Shopping list behaviour works from the generated menu
- [ ] The screen is responsive and visually aligned with the mockup
- [x] Lint, formatting checks, and production build all pass
