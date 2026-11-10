# Weekly Menu reliability regression

## Boundary and setup

These checks exercise the real planner UI with synthetic authentication and fault-injected server-function responses. They do **not** verify Postgres persistence, OTP, email delivery, or the server-function authorization boundary. No real account or database is used.

1. Install dependencies (`pnpm install --frozen-lockfile`) and build (`pnpm --dir frontend build`). From `frontend/`, start the isolated production server with `HOST=127.0.0.1 PORT=3101 BETTER_AUTH_SECRET=local-reliability-check-not-a-real-secret BETTER_AUTH_URL=http://127.0.0.1:3101 node .output/server/index.mjs`. Use the explicit IPv4 address and dedicated port to avoid another worktree's dev server.
2. Launch native `agent_browser` with a fresh session, `--init-script <absolute-path-to>/frontend/e2e/planner-reliability.init.js`, and open `http://127.0.0.1:3101/weekly-menu-planner`. Container hosts without a usable Chrome sandbox require launch argument `--args --no-sandbox`.
3. Run the contents of `planner-reliability.browser.js` with `agent_browser_code` in that same explicit session (timeout: 180000 ms; choose an explicit JSON `outputPath`). The script runs 14 fail-fast browser scenarios and throws on any failed assertion. It does not run under Vitest or in CI.
4. For manual inspection, use fresh `snapshot -i` refs after page changes. The fixture exposes `window.plannerReliability` through native `eval --stdin`. Without a `scenario` query, `failLoad` is initially true. Query scenarios `ready`, `auth-pending`, `load-pending`, `recipes-error`, and `empty` configure other starting states.
5. Save snapshots/results and screenshots to an explicit artifact directory. Verify artifact existence before reporting a pass.

The fixture intercepts same-origin auth and `/_serverFn/` fetches. GETs containing a Calendar Week are menu reads; GETs without one are recipe reads. Generation and menu-save POSTs are distinguished by their server-function URL: generation requests increment `generations`, while only menu-save requests increment `writes`. The fixture can fail recipe or history reads during generation without issuing a menu-save POST. Do not exercise recipe mutations with this fixture. A synthetic saved lunch and dinner are available so the schedule dialog precheck allows generation; a synthetic saved dinner is present in each successful loaded week.

## Failure cases (defined before implementation)

1. **Failed initial read is not an empty week.** Wait for the synthetic load to finish. Expect a visible load error and retry control, no "No Weekly Menu yet" message, disabled generation and schedule save, and `plannerReliability.writes.length === 0`. This fails against the original code: it renders an empty week and enables generation after the read fails.
2. **Retry recovers the existing menu.** Set `plannerReliability.failLoad = false`, use the visible retry control, and expect the saved dinner for the selected week. Generation must become enabled only once loading succeeds. There must still be no POST.
3. **Pending reads/authentication cannot start writes.** Set `plannerReliability.hold.load = true` (or `.hold.auth = true` before reloading), reload, and wait until `.release.load` (or `.release.auth`) exists. Expect loading feedback and disabled generation/preferences save. Release with `.hold.load = false; .release.load()` (equivalently for auth). Existing data must appear after completion, with no POST while pending.
4. **Generation failures retain saved data and can be retried.** Confirm the schedule before generation. Inject recipe-catalog and history-read failures into separate generation requests; each must show an error and enabled retry, retain the saved dinner, count exactly one generation POST, and issue no menu-save POST. A provider failure must also retain the saved dinner and expose retry; after retry succeeds, it reaches an editable preview, and discarding it restores the saved menu without persistence.
5. **Schedule-save failure retains the draft.** Navigate to an unlocked future week, open Preferences, select Monday Office, set `.failSave = true`, and save. Expect an error in the dialog, Monday Office still selected, and the saved menu unchanged. Set `.failSave = false` and retry using Save preferences. Expect the dialog to close, success feedback, and Monday Office reflected in the menu. The submitted request must include the existing dinner ID.
6. **Pending writes are visible and cannot be duplicated.** Set `.hold.save = true`, save a draft, and wait for `.release.save`. Expect "Saving preferences...", disabled save and schedule controls, and exactly one new menu-save POST. Release it and expect success. Repeat generation with `.hold.generation = true`: expect "Generating", a disabled generation action, exactly one generation POST and no menu-save POST; release it and expect the editable preview.
7. **Stale reads do not replace another week.** Hold `.load`, navigate to another week, then turn the hold off and release the old read. Expect the final UI to show the currently selected week's dinner, not the old week's result. Failed/successful late reads must not enable writes for another week. Repeat with a failed old read.
8. **Sign-out invalidates pending generation work.** Hold a generation POST or its recipe/history read, log out using the header, then release the pending work. Expect the guest UI, no signed-in saved dinner, no stale success/error notice, and no menu-save POST. Account changes must not receive another user's request result.
9. **Recipe-catalog load failure is actionable.** Set `.failRecipes = true` and reload. Expect a visible load error and retry rather than an indefinitely disabled Shopping List. Clear the flag and retry; expect the existing menu and an available Shopping List containing Rice.
10. **Empty and guest paths remain available.** Without the fixture, a signed-out visitor can still open preferences, save browser-local schedule choices, and open the guest grid without server-function POSTs. A successful server read returning `hasSavedMenu: false` must allow first-time generation through schedule confirmation to an editable preview; a failed read must not.
11. **Localized feedback.** Repeat read/save failure and recovery under `/es/weekly-menu-planner`. All new feedback and retry controls must be Spanish.

## Repeatable observations

Use native eval expressions scoped to the planner/dialog, for example:

```js
;({
  text: document.querySelector('.planner-shell')?.innerText,
  alerts: [...document.querySelectorAll('[role="alert"]')].map(
    (node) => node.textContent,
  ),
  writes: window.plannerReliability.writes.length,
  pendingSave: Boolean(window.plannerReliability.release.save),
})
```

Prefer `wait --fn` predicates for fixture completion and visible/disabled conditions, not fixed sleeps. Snapshot/eval output and screenshots are the repeatable artifacts; record exact checks and limitations in the PR.
