# Recipe/menu consistency regression

## Boundary and setup

These browser checks exercise the real planner and preferences UI with synthetic authentication and server-function responses. They do **not** verify Postgres persistence or server authorization.

1. Build the frontend (`pnpm --dir frontend build`) and start an isolated production server from the repository root:

   ```bash
   HOST=127.0.0.1 PORT=3101 BETTER_AUTH_SECRET=local-recipe-consistency-check-not-a-real-secret BETTER_AUTH_URL=http://127.0.0.1:3101 node frontend/.output/server/index.mjs
   ```

2. Launch native `agent_browser` in a fresh session with `--args --no-sandbox`, `--init-script <absolute-path-to>/frontend/e2e/recipe-menu-consistency.init.js`, and open `http://127.0.0.1:3101/weekly-menu-planner`.
3. Run the contents of `recipe-menu-consistency.browser.js` with `agent_browser_code` in that same session. Use a 180000 ms timeout and an explicit JSON `outputPath` under `frontend/e2e/artifacts/`.
4. The script throws on failed assertions. Verify the result artifact and any screenshot artifact before recording a pass.

The fetch fixture starts with a synthetic account, one recipe assigned to Monday dinner, and a synthetic schedule. Recipe deletion mirrors the database's `ON DELETE SET NULL` behavior. Recipe creation can be held to test pending UI and duplicate submission guards.

## Failure cases

1. **Deleting an assigned recipe leaves stale planner data.** This fails if the selected week/menu and recipe names are not reloaded after deletion.
2. **A later schedule save submits a deleted recipe ID.** This fails if writes are re-enabled before the selected menu refresh completes.
3. **Pending create allows conflicting actions or leaves the submit control active.** The held request fails if more than one create is recorded or create/save/cancel controls remain enabled before the refresh completes.
4. **Cancel discards newly created recipes.** This fails if cancel is treated as rollback for the immediate recipe mutation.

## Evidence and limitations

The script asserts these cases at the browser boundary and records the observed request/mutation summary in [`artifacts/recipe-menu-consistency.json`](artifacts/recipe-menu-consistency.json). The [`recipe-menu-consistency.png`](artifacts/recipe-menu-consistency.png) screenshot captures the immediate-persistence explanation. Authentication and server-function responses are synthetic; use the separate database/email journey in `FRONTEND-TODO.md` to verify real persistence.
