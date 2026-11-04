# Week lock failure checklist

Written before implementation; use the independent browser harness below.

- Next/future weeks are locked; current/past weeks are unlocked.
- A quick tap unlocks, or confirmation takes more/less than 1000 ms.
- Release at 500 ms, pointer leave/cancel, keyup, or blur fails to cancel.
- Repeated keydown completes early, resets the timer, or confirms twice.
- Holding Enter or Space fails to unlock or scrolls the page.
- Unlock survives navigation away/back or reload, or leaks between weeks.
- A locked saved week still allows schedule edits/save (including guest schedules).
- Account-wide recipe management is blocked.
- AI generation from a locked week is blocked, or pinned Sunday previews cannot be accepted on Monday.
- A lock appears over an AI preview, generation skeleton, or empty week.
- Unmount leaves a timer that calls confirmation.
- Touch long press opens a context menu or selects text.
- Reduced-motion users cannot unlock or see animated progress.
- Screen readers are not told the week is locked, how to unlock, or the result.
- Local Sunday→Monday rollover compares the wrong calendar week.
- A DST week uses elapsed hours instead of the civil Monday boundary.

## Repeatable browser harness

The fixture intercepts authenticated HTTP transport with synthetic data; no database,
provider, or real account is used. Browser events exercise the production UI. The
boundary fixtures control the browser date; hold timers use real elapsed time.

Run from `frontend/` after `pnpm build`. Start a separate production server:

```sh
HOST=127.0.0.1 PORT=3102 BETTER_AUTH_SECRET=local-week-lock-not-a-real-secret BETTER_AUTH_URL=http://127.0.0.1:3102 node .output/server/index.mjs
```

Then use a fresh session (the timezone is required for the DST scenario):

```sh
TZ=Europe/Madrid agent-browser --session remi-week-lock --args '--no-sandbox' --init-script "$PWD/e2e/week-lock.init.js" open 'http://127.0.0.1:3102/weekly-menu-planner?scenario=ready'
agent-browser --session remi-week-lock set viewport 1440 1200
node e2e/week-lock.runner.js
agent-browser --session remi-week-lock close
```

Results: `e2e/artifacts/week-lock-results.json`; screenshot:
`e2e/artifacts/week-lock.png`. Unverified limitations and exact counts are recorded
with the results after execution. No pure-function unit tests are added.

## Verification evidence

- Independent production-build browser run: **25 passed, 0 failed**; the JSON
  artifact includes each result and limitations. Native pointer leave is tested
  at 500 ms with pointer capture installed before the React handler.
- `pnpm install --frozen-lockfile`: passed; lockfile unchanged.
- Required command output tails (all exit 0):

```text
pnpm lint: $ eslint
pnpm check: All matched files use Prettier code style!
pnpm typecheck: $ tsc --noEmit
pnpm test: Test Files 11 passed | 1 skipped (12); Tests 62 passed | 1 skipped (63)
pnpm build: Generated .output/nitro.json; You can preview this build using npx vite preview
```

Source scope: 7 files, **277 additions + 19 deletions = 296 changed source LOC**.
The remaining files are documentation, the independent harness, its JSON results,
and the screenshot; no AI implementation, dependencies, server code, or schema changed.

Blocked: saved/local schedule context and scope controls plus the panel Save
button; `WeeklyMenuPlanner.handleSavePreferences` also guards the mutation before
`plannerWeek.savePreferences`. `PreferencesPanel` disables its fieldset only on
the Schedule tab. Allowed: account-wide recipe forms/actions, shopping checks,
navigation, AI Generate, preview edits, and pinned preview acceptance.

No product-scope deviations. The button component stays mounted after unlock to
keep its polite live region available; a keyed instance resets announcements on
week navigation. A small standalone CLI runner makes the harness directly
repeatable without `agent_browser_code`. Not verified: real authenticated
HTTP/database/provider behavior, physical touch long presses, screen-reader audio,
or heap profiling. Timer cleanup is covered by a navigation/unmount regression;
calendar boundaries reevaluate on render and at the save boundary, without a
midnight relock timer.

Review regression cases (recorded before fixes): an already-open Sunday schedule
must not save after its target becomes current on Monday; keyboard unlock must
focus Preferences; hold timing must measure actual button removal and reject a
600 ms confirmation rather than merely measuring the harness sleeps.
