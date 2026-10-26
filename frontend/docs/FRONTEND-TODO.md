# Frontend review and TODO

## Current state

The frontend is beyond a mock. Core signed-in data mutations use authenticated TanStack Start server functions backed by Postgres and Drizzle. This inventory describes source wiring; it does not establish that a deployed database or email provider is configured correctly.

| Action                                           | Current implementation                                                                   |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Signup, login, email OTP, logout, password reset | Better Auth database adapter; email delivery requires Resend configuration               |
| Add, list, and delete recipes and ingredients    | Database-backed and scoped to the signed-in user                                         |
| Edit recipes                                     | Server endpoint exists; no editing UI                                                    |
| Generate or regenerate a Weekly Menu             | Reads the user's recipes and previous Calendar Week, assigns recipes, and saves the menu |
| Save weekly schedule preferences                 | Stored with the selected Calendar Week, not as recurring account defaults                |
| Guest preferences                                | Browser `localStorage`, not the database                                                 |
| Shopping list                                    | Derived from saved menu recipes; no purchase checklist or checked-state persistence      |
| Tabs, language, drawer controls                  | UI or URL state; no database write is needed                                             |

## 1. Reliability — completed in this change

- [x] Distinguish loading, loaded-empty, and failed-to-load Weekly Menus. Never present a failed read as a new empty week.
- [x] Disable generation and schedule saving until the selected week has loaded successfully, including while authentication is pending.
- [x] Display actionable load, generation, and schedule-save errors with retry paths.
- [x] Display pending and successful schedule-save feedback; retain the draft on failure.
- [x] Keep stale requests and writes from updating another selected week or user's UI.
- [x] Verify failed reads cannot lead to overwriting an existing menu with an artificial empty menu.
- [x] Capture repeatable browser regression evidence for failure and recovery paths: see [the browser regression guide](../e2e/PLANNER-RELIABILITY.md) and [recorded results](../e2e/RESULTS.md).

## 2. Recipe/menu consistency — later PR

- [ ] Refresh/invalidate the selected menu and its recipe names after recipe mutations. Deleting an assigned recipe currently clears its database reference, but the planner can continue displaying stale meal names until reloaded; later saves can submit the deleted recipe ID.
- [ ] Prevent duplicate recipe submissions while a create request is pending.
- [ ] Make recipe mutation timing explicit: additions/deletions save immediately, and cancelling the preferences drawer does not undo them.

## 3. Useful generation — later PR

- [ ] Provide recipe onboarding or a starter catalog so a new user can generate a useful Weekly Menu. Upstream PR #28 now seeds 25 recipes for one specific development account only; general onboarding remains open.
- [ ] Explain insufficient recipe coverage and identify unfilled Home-Planned Meal Slots.
- [ ] Define regeneration variety. Assignment is currently deterministic and can return the same result for the same catalog and prior week.
- [ ] Decide whether/when to introduce AI-assisted generation. No AI generation is currently connected.
- [ ] Clarify how Custom Recipes act as soft preferences; the current implementation uses only the user's recipe catalog.

## 4. Complete the product loop — later PRs

- [ ] Add recipe editing UI using the existing update endpoint.
- [ ] Confirm shopping checklist scope. If required, add check/uncheck, reset, progress, and per-user/per-week persistence. A derived shopping list does not itself require a separate database table.
- [ ] Decide whether recurring account schedule defaults and guest-to-account schedule transfer are desired; neither is currently implemented.
- [ ] Verify drawer keyboard accessibility, including focus entry/trapping/restoration and Escape dismissal, and responsive layouts.
- [ ] Address existing React Doctor findings separately: render-time scroll-ref mutations in the preferences drawer, large-component complexity, auth loading/error handling, and other repository-wide warnings. The reliability change removes its own render-time request-identity ref mutation; generated `.output` dependency warnings also need to be excluded when establishing a clean baseline.
- [ ] Update or replace the older mock-first implementation plan, which no longer reflects current persistence.

## 5. End-to-end verification

- [ ] Exercise login/OTP → create recipe → save schedule → generate → reload → confirm persistence against an isolated, migrated database and configured development email flow.
- [ ] Verify user isolation, recipe deletion from an assigned menu, and week navigation around pending requests.
- [ ] Run database-dependent recipe integration coverage in an explicitly configured test environment; it is skipped by default unless `RECIPE_DATABASE_TESTS=1`.
- [ ] Keep browser artifacts and exact reproduction steps with each relevant PR.

## Review baseline

- Typecheck, lint, formatting, and production build passed.
- Vitest: 38 tests passed; one database-dependent recipe test skipped.
- The initial review confirmed database wiring from source, not live authenticated persistence. This worktree had no configured database/email environment, and browser checks were blocked by missing Chrome.
- Preserve the PR boundary: finish reliability and open its PR before implementing sections 2–4.
- Reliability verification now includes 14 passing fault-injected browser scenarios against an isolated production build. This does not replace the still-open live database/email journey above.
