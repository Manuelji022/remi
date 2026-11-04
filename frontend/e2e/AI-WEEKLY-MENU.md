# AI Weekly Menu regression

## Change and test boundaries

This feature uses an authenticated server function to load an owned recipe catalog and full saved current/previous Calendar Weeks, then requests a structured assignment through the Vercel AI Gateway. Browser checks below mock only the application HTTP boundary; they never call AI Gateway, use a real account, or write to the database. Existing PGlite store tests exercise ownership, classification, persistence, and request accounting; they do not prove real PostgreSQL cross-process locking. AI SDK transport tests mock every Gateway HTTP request and must not spend API money.

## Failure cases documented before production implementation

1. **Generation never skips schedule confirmation.** From the signed-in planner, generation must first show seven editable target-week day controls and an explicit confirm action, including when every day is at home (zero Office/Eat Out contexts). No AI request or save occurs before confirmation.
2. **The selected generation date is exactly next Monday-Sunday.** Generation remains anchored to the next Calendar Week even when the planner is viewing a different week. A target-week saved schedule is prefilled; when no target menu exists, every day starts at all-at-home, not from the current week's schedule.
3. **Target schedule semantics are valid.** Office covers lunch and leaves dinner home-planned; Eat Out keeps the user's chosen lunch/dinner/both planning scope; every away slot remains visibly covered and is never treated as a packed lunch.
4. **Preview is editable but not persistence.** A successful provider result replaces all seven days in a fresh preview. Owned recipes are selectable only in home-planned slots and only from the matching authoritative meal slot. Edits remain in preview state; the saved target week and existing planner data remain unchanged until Accept. Accept submits exactly that edited target week. Discarding or leaving warns first.
5. **Schedule edits invalidate generated output but Cancel restores it.** Changing the target schedule while editing a preview hides the stale preview and requires confirmation/generation again. Cancel, Escape, or dismiss restores the original preview, including manual recipe swaps; confirming a changed schedule never carries the stale preview into a failed regeneration.
6. **Provider failure preserves data and is retryable.** A rejected, invalid, late, or timed-out generation leaves the saved menu intact, shows an actionable error and retry, and never invokes the deterministic legacy assignment path.
7. **Model output is not trusted.** Invalid or missing recipe IDs in eligible slots are repaired deterministically from that slot's candidates. Wrong-week results, assignments to covered slots, and malformed or duplicate day keys are still rejected before any preview or save. Repeated recipe IDs in separate slots are allowed.
8. **Shortage is explicit, not invented.** If no owned lunch or dinner recipes exist, each eligible slot of that type stays empty and the UI explains which saved recipe type is missing. The generator invents neither recipes nor dietary/nutrition claims.
9. **History and prompt scope are minimized.** Current week includes all seven saved days (including future days) and previous week is complete; missing history is accepted. The AI request receives only owned recipe IDs, names, ingredients, authoritative classifications, the two weeks' assignments, and the confirmed target schedule. Account identity is never sent; recipe text is data, not instructions.
10. **Authentication and guest behavior remain separate.** Guests retain the current local planner path without hitting AI. An authenticated server-side call rejects missing sessions and never returns another owner's recipes/history.
11. **Provider protection survives deployment scaling.** More than five accepted calls in a rolling hour is rejected and simultaneous calls for the same account cannot invoke the provider twice, even across server processes. Provider retries/timeouts are bounded and prompt contents are not persisted.
12. **No existing save invariant is weakened except duplicate use.** A recipe must still belong to the owner and match its authoritative Meal Slot classification. Reusing one recipe ID across multiple week slots is allowed in storage and generation.
13. **Calendar boundaries use the browser's IANA timezone, not a client date claim.** At one server instant, UTC and a browser timezone near its local Monday may produce different next-week dates; the server derives the user's current/next Monday from its own current instant and the validated timezone. A request crossing Sunday-to-Monday is rejected as stale and must reconfirm. DST transitions must preserve civil Monday arithmetic without adding/subtracting 24-hour local-midnight intervals.
14. **Acceptance waits for the target menu and owned recipe catalog load.** Delay the target-week background read after generation. Accept stays disabled until the complete week/catalog are ready. Once acceptance starts, its generation token invalidates late background results so the just-saved week cannot be replaced by stale client state.
15. **Stale feedback survives the browser's actual week rollover.** The stale fixture freezes the browser at Sunday 23:59 local, then advances it past Monday before returning the server's stale-week response. The old request's status must remain visible and offer a fresh schedule for the server-provided week.
16. **Pending acceptance cannot lose recipe edits.** Hold a synthetic save, verify recipe selectors are disabled, then dispatch an attempted change while acceptance owns the preview. Release the save as a failure and verify the retained draft is unchanged before retrying.
17. **Generation retry schedule belongs to a target week.** Same-target retry retains the schedule just confirmed after an ordinary provider failure. If an ordinary failure happens before Sunday-to-Monday rollover, retry must load the newly targeted week's saved schedule/defaults instead of reusing the prior target's draft.
18. **A Sunday preview stays pinned after a client rollover.** If a successful response arrives on Sunday and the browser reaches Monday while the preview is open, recipe edits/readiness/acceptance remain pinned to that preview's absolute week. A server-side mocked provider that instead finishes after Monday must return stale-week and never expose a preview.

## Repeatable browser harness

1. From `frontend/`, install the lockfile, build with `pnpm build`, then start a separate production server using `HOST=127.0.0.1 PORT=3101 BETTER_AUTH_SECRET=local-ai-menu-not-a-real-secret BETTER_AUTH_URL=http://127.0.0.1:3101 node .output/server/index.mjs`.
2. Launch native `agent_browser` in a fresh session with `--args --no-sandbox`, `--init-script <absolute-path>/frontend/e2e/ai-weekly-menu.init.js`, and open `http://127.0.0.1:3101/weekly-menu-planner?scenario=ready`.
3. Execute `ai-weekly-menu.browser.js` through `agent_browser_code` in that same session with timeout 180000 ms and output path `frontend/e2e/artifacts/ai-weekly-menu-results.json`.
4. The harness throws on assertion failure, intercepts same-origin auth/server-function requests, uses only synthetic data, and records a JSON result. Verify both the script's PASS assertions and artifact existence; no screenshot is required for acceptance.

The fixture has scenarios `ready`, `target-saved`, `empty-catalog`, `stale`, `retry-rollover`, `preview-rollover`, `provider-rollover`, and `guest`. It records decoded `generationRequests`, `saveRequests`, and current/target reads under `window.aiWeeklyMenuFixture`; flags can hold/fail mocked generation/save requests and hold/release target loads/saves. `stale` returns a server-stale response after rollover; `retry-rollover` advances after an ordinary mocked provider failure; `preview-rollover` advances the browser after a successful response; `provider-rollover` holds mocked provider work until Monday and returns the stale response. The fixture decodes Seroval request envelopes for both POST and serialized GET payloads, and rejects generation/save requests that lack the expected decoded target/schedule/menu instead of returning malformed data. It must never intercept non-local origins or use an actual API key.

## Verified evidence

- `pnpm lint`, `pnpm check`, `pnpm test` (62 passed, 1 skipped), and `pnpm build` passed in this task.
- The complete native Chrome browser harness passed all 24 scenarios against the production server at `127.0.0.1:3101`, launched with `ai-weekly-menu.init.js`. The result is recorded in [`artifacts/ai-weekly-menu-results.json`](artifacts/ai-weekly-menu-results.json), including schedule-edit invalidation, route protection and clean discard, Cancel restoration of a manual recipe swap, and failed changed-schedule regeneration.
- `timeout 120 ./e2e/run-ai-generation-guard-postgres.sh` passed against disposable PostgreSQL 18 with repository migrations applied. Its artifact records 24 checks (15 multi-connection and 9 single-connection); synthetic rows and the container were cleaned up.
- Browser scenarios use synthetic auth/server responses, make no live AI Gateway calls, and do not write application data. No real-auth or live-provider behavior was verified.

## Server configuration and verification

For local development, copy `.env.example` into the server environment and set server-only `AI_GATEWAY_API_KEY`; never prefix it with `VITE_` or expose it to the browser. On Vercel, the AI SDK Gateway provider can authenticate with the runtime's OIDC identity when no API key is configured, so a separate key is not required there. `AI_WEEKLY_MENU_MODEL` is optional, defaults to `openai/gpt-4o-mini`, and uses Gateway's `provider/model` ID format. The browser fixture mocks the application server-function response, so the repeatable browser suite needs no Gateway key and never incurs provider charges. Unit transport coverage injects a fake `fetch` response into the native AI Gateway provider; it verifies the Gateway `/v4/ai/language-model` request, configured model ID and key authorization, structured output and business validation, and zero retries without external network access.

### Isolated PostgreSQL guard integration

From `frontend/`, run `timeout 120 ./e2e/run-ai-generation-guard-postgres.sh`. It requires Docker and the cached `postgres:18` image. The script creates a new uniquely named disposable PostgreSQL container on a dynamically assigned `127.0.0.1` port, applies all repository migrations with `pnpm db:migrate`, then exercises the actual `runAiGenerationWithGuard`, `loadAiMenuContextForUser`, application Drizzle schema, request table, and lease table. It runs separate application processes with `PGMAX=3` (same-user rejection, independent users, five-call rolling-hour accounting, accepted-failure accounting) and `PGMAX=1` (owned context/history reads, unrelated DB reads and independent-user generation while the first provider callback is held, and same-user rejection while held). Both runs verify crashed/expired lease recovery and that an old owner's finally cannot delete its replacement's lease. Only synthetic users are created; rows and the owned container are removed on success or failure. The artifact defaults to `e2e/artifacts/ai-generation-guard-postgres.json` relative to `frontend/`; override with `AI_GUARD_ARTIFACT` if needed.

Lease acquisition and rolling-window attempt accounting commit in a short transaction before provider work; provider work does not hold a transaction or row lock. A failed accepted call still consumes an attempt, a rejected contender does not, and lease expiration uses the database clock.

**Lifetime constraint:** the durable lease lasts 60 seconds. The only production caller, `generateAiMenu`, uses a single AI SDK request with `AbortSignal.timeout(20_000)` and `maxRetries: 0`. Exclusion assumes that callback/provider transport honors cancellation and settles within 60 seconds (40 seconds of margin). This is not a general-purpose guard for unbounded callbacks, and cannot guarantee non-overlap after a suspended worker or cancellation-ignoring provider exceeds the TTL. A timer race alone would not stop such work. The forced-expiry ownership test deliberately bypasses this bound to model handoff and proves token-safe release, not cancellation of an old provider. No live provider lifetime/cancellation behavior was tested. Concurrent callbacks use separate transactions/connections against the real server; the harness does not run two contending OS workers simultaneously.

This database test does not exercise browser authentication, the authenticated server-function transport, or a live AI Gateway provider. It uses a callback in place of provider work and a controlled Sunday/Monday clock to verify the production post-provider stale-target helper; it must never require a provider key.

## Mock scenarios failure cases

1. A URL mock parameter changes generation when `AI_WEEKLY_MENU_MOCK` is absent, false, or any value other than the exact string `true`.
2. Mock generation is honored in production even when the environment flag is `true`.
3. An invalid or absent `mock` parameter crashes the client, fails server validation, or sends a `mockScenario` field instead of omitting it.
4. Valid scenario values are lost in the serialized generation request, including on Retry, or are read only once and become stale after URL changes.
5. Guest generation sends a mock parameter or invokes the authenticated AI server function.
6. Error, rate-limited, in-progress, or stale scenarios acquire a DB lease, load menu context, consume rate-limit attempts, or bypass authentication.
7. The stale scenario returns the request's claimed week, a fixed date, or the server's timezone week instead of the real next Monday in the validated request timezone, including Sunday/Monday and DST boundaries.
8. Default/ok no longer waits about 1.5 seconds or changes deterministic fallback assignments; slow does not wait about 8 seconds or changes the resulting menu.
9. Error does not throw after about 1 second, changes saved data, or fails to show the existing error and Retry path; rejection scenarios return the wrong discriminant.
10. Empty repairs null assignments with available recipes, drops the confirmed schedule, or omits either lunch/dinner from unavailableSlots.
11. Successful mock scenarios bypass the existing guard or the before/after generation stale-week checks.
12. Importing the shared scenario schema evaluates server environment access in the browser, or non-mock provider options change Gateway behavior.

The browser harness verifies URL serialization, invalid-value omission, retry, and guest isolation at the mocked HTTP boundary; it does not prove server environment gates, mock timing, or DB guard accounting.

### CLI-only harness runner

When `agent_browser_code` is unavailable, run the same harness through the native CLI adapter below from `frontend/`, with the production server from step 1 already running. Use a fresh named session, register the init script before navigation, and set a 1440 × 1200 viewport (the shorter default viewport can place an action behind the sticky header).

```bash
agent-browser --session remi-ai-mock-scenarios --args '--no-sandbox' --init-script "$PWD/e2e/ai-weekly-menu.init.js" open 'http://127.0.0.1:3101/weekly-menu-planner?scenario=ready'
agent-browser --session remi-ai-mock-scenarios set viewport 1440 1200
node --input-type=module <<'JS'
import { readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
const results = []
const browser = ({ args, stdin }) => new Promise((resolve, reject) => {
  const child = spawn('agent-browser', ['--session', 'remi-ai-mock-scenarios', '--json', ...args])
  let output = '', error = ''
  child.stdout.on('data', chunk => { output += chunk })
  child.stderr.on('data', chunk => { error += chunk })
  child.on('error', reject)
  child.stdin.end(stdin)
  child.on('close', () => {
    try {
      const parsed = JSON.parse(output)
      resolve(Array.isArray(parsed)
        ? { success: parsed.every(item => item.success), data: parsed, error: parsed.find(item => !item.success)?.error }
        : parsed)
    } catch { reject(new Error(error || output)) }
  })
})
const emit = result => { results.push(result); console.log(JSON.stringify(result)) }
try {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
  await new AsyncFunction('browser', 'emit', await readFile('e2e/ai-weekly-menu.browser.js', 'utf8'))(browser, emit)
} finally {
  await writeFile('e2e/artifacts/ai-weekly-menu-results.json', JSON.stringify(results, null, 2) + '\n')
}
JS
agent-browser --session remi-ai-mock-scenarios close
```

### Mock scenario verification (2026-11-04)

- `pnpm lint`, `pnpm check`, `pnpm typecheck`, `pnpm test` (62 passed, 1 skipped), and `pnpm build` passed.
- All 27 scenarios in the complete browser harness passed against the production build at `127.0.0.1:3101` through the CLI runner, at 1440 × 1200; refreshed evidence is in `artifacts/ai-weekly-menu-results.json`.
- New checks passed: `?mock=error` is present in decoded generation and retry requests and reaches existing error feedback, `?mock=nope` omits `mockScenario`, and guests with `?mock=error` never invoke generation or save.
- A direct module smoke check covered development/production crossed with absent/false/true/uppercase-TRUE flag values; only development plus exact `true` enabled mocks, and the schema rejected `nope`.
- Initial runner setup failed on batch-response normalization and the default viewport's sticky-header obstruction; the documented adapter and viewport resolved both before the complete passing run.
- Not verified live: authenticated server mock delays/results, timezone rollover for the new stale short circuit, or DB lease/attempt accounting for short circuits. Browser fixtures intercept HTTP; gate smoke checks cover the shared function only.

## Skeleton and recipe precheck failure cases

Documented before implementation.

1. **Dialog still open during generation.** After the user confirms the schedule, the schedule dialog must close at once; "Generating…" must not stay inside it.
2. **Skeleton never replaced on failure.** When generation fails, the skeleton must disappear, the existing error feedback and Retry must show, and no stale preview or skeleton may remain.
3. **Skeleton for the wrong week.** The skeleton and week header must show the target (next) week, not the week the user was viewing, including when generation starts from the current week or from a preview edit.
4. **Accept, Discard or Edit schedule reachable during generation.** None of these actions may exist or be clickable while the skeleton shows, including the stale preview hidden during an edit-then-regenerate.
5. **Precheck consumes an attempt or calls the server.** Neither precheck may issue a generation request; the fixture must record zero generation requests when a precheck blocks.
6. **Precheck blocks a user who has recipes.** A user with at least one recipe of any type must reach the dialog; a user with only lunch recipes must be able to confirm a schedule that needs no dinners.
7. **Precheck blocks when the missing type is covered.** If every slot of a missing type is covered by the schedule (Office lunch, Eat Out, ...), confirming must generate, not show the alert.
8. **Catalog-fetch failure blocks generation.** If the recipe list cannot be read, the dialog must open as before and generation must remain possible.
9. **Guest affected.** Guests keep the current local path: no notice, no recipe call, no skeleton.
10. **Focus lost after closing the notice.** Closing the "recipes needed" notice must return focus to the opener (Generate button).
11. **Spurious skeleton on schedule-load failure.** Failing to load the schedule (prepare error) or cancelling the dialog must not show a skeleton or change the viewed week.
12. **Inline alert mismatches.** The per-type alert must name the real missing type (lunch, dinner, or both), keep the dialog open with the schedule intact, and clear once the schedule is edited so the user can confirm again.
13. **"Add recipes" does nothing.** The action must open Preferences on its recipes section from both the notice and the inline alert.
14. **Skeleton announced repeatedly.** The container must be a single polite status region with `aria-busy`, not one region per card.

### Skeleton and precheck verification (2026-11-04)

- All 34 results (33 scenarios plus the suite summary) passed in the browser harness against the production build at `127.0.0.1:3101` through the CLI runner at 1440 × 1200; evidence is in `artifacts/ai-weekly-menu-results.json`. New fixture scenario `partial-catalog` serves lunch recipes only. `empty-catalog` now asserts the notice and zero generation requests.
- Screenshots: [`artifacts/ai-generation-skeleton.png`](artifacts/ai-generation-skeleton.png) and [`artifacts/recipe-precheck-notice.png`](artifacts/recipe-precheck-notice.png).
- Not verified in a browser: the catalog-fetch fallback (`listRecipes` failure). Signed-in users cannot reach Generate until the planner's own catalog has loaded, so the fallback is exercised only by code reading.
- One earlier run failed a previously-passing scenario (`route navigation protects a preview stashed by schedule editing`, "missing dinner selector") and the next full run passed; treated as a timing flake, not reproduced.
