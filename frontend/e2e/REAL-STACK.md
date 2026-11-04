# Failure cases (written before implementation)

- Inherited credentials or dotenv loading could target the shared remote database.
- A failed assertion or signal could leak PostgreSQL, the browser, or the dev server.
- A stale/unsigned cookie or a pending 2FA challenge could masquerade as authentication.
- Missing migrations or recipes seeded for another account could invalidate the test.
- HTTP interception could answer instead of the authenticated server.
- Mock short circuits could incorrectly count as real guarded attempts.
- A production server could silently disable mock AI; occupied ports could select another app.
- Saving the wrong week or different assignments could look correct in a screenshot.
- Errors could overwrite the saved week or leave a generation lease behind.

## Running

Requires Docker, an already cached `postgres:18` image (`docker pull postgres:18`
when preparing the machine), Node, pnpm, `curl`, `setsid`, `rg`, and the native
`agent-browser` CLI with Chromium installed (`agent-browser install`).

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm e2e:real-stack e2e/real-stack/ai-weekly-menu.scenario.js
# Optional explicit artifact destination:
bash e2e/real-stack/run.sh e2e/real-stack/ai-weekly-menu.scenario.js /tmp/menu-results.json
```

Expected output: PASS lines for authentication, dialog/skeleton/preview, persistence,
all four mock failures, guarded attempts 1–5, the sixth request's real limit, and
cleanup. Any failed assertion exits nonzero. JSON (including assertion failure)
lands in `e2e/artifacts/real-stack-ai-weekly-menu-results.json`; screenshots share
its stem (`.png`, `-error.png`). Early setup failures produce console errors rather
than a success artifact. Artifacts contain synthetic data and no session token.

## Coverage and safety

Unlike `AI-WEEKLY-MENU.md`'s intercepting harness, this exercises the actual
TanStack server functions, Better Auth session lookup, migrations, recipe catalog,
menu persistence, and PostgreSQL attempt/lease accounting. There is no request
interception and no HTTP fixture. Only the AI provider is mocked, with the app's
existing development-only flag. Short-circuit mock failures deliberately bypass
the guard; only `ok` exercises real guard accounting.

The runner clears the inherited environment, never loads the workspace dotenv
files, and copies app inputs to a temporary directory excluding `.env*` and build
state before running migration or Vite tooling. It supplies a freshly generated
auth secret, local URLs, development mode, and `AI_WEEKLY_MENU_MOCK=true`. Both
runner and DB helper reject remote DB hosts; the helper additionally requires the
throwaway database name. PostgreSQL publishes only on dynamic `127.0.0.1` ports;
Vite uses a free port with `--strictPort` so a collision fails instead of silently
selecting a different app. EXIT/INT/TERM cleanup removes the container, browser,
server process group and temporary copy. Success checks container absence and
closed server port. SIGKILL or machine failure cannot run shell traps.

All eight migrations run. Migration 0005 seeds 26 recipes only for
`manueljialt@gmail.com`, so it skips this fresh database; the helper instead adds
a known synthetic lunch and dinner to its own synthetic user.

Session setup uses the app's `auth.$context.internalAdapter` and DB modules.
Better Auth 1.7.10's `two-factor/verify-two-factor.mjs`, `valid()` path, creates a
normal session and calls `setSessionCookie` after consuming the challenge. There
is no separate per-session 2FA flag. The helper reproduces that terminal state
with `twoFactorEnabled=true`, an adapter-created session, and the cookie name from
the auth context. It signs the token exactly as Better Call does: HMAC-SHA256,
base64 signature, `token.signature`, URI encoded. The browser receives that cookie
via its native cookie command with HttpOnly; no init script modifies the app.
The real `/api/auth/get-session` must return the seeded identity with 2FA enabled
and must reject a tampered signature before any UI scenario runs. This bypasses
proof of possession of an OTP; it does not test the email/OTP login flow.

The scenario keeps one authenticated document for the user journey and changes the mock query with `history.replaceState`; it discards unaccepted previews through real UI controls between generations. Repeated full-document reloads intermittently left the client session pending during development runs and are not covered by this harness.

Not covered: live AI Gateway, email delivery, real OTP login UI, concurrent browser
sessions, hour expiry, timezone rollover or production-mode deployment. The
isolated PostgreSQL guard harness remains useful for lock/concurrency cases.

## Adding a scenario (ten-line recipe)

1. Copy `real-stack/ai-weekly-menu.scenario.js` to a new `*.scenario.js`.
2. Export an async default function receiving the helper object.
3. `open('ok')` loads the planner once, then switches the mock URL and discards previews through the UI.
4. `browser(args)` runs native agent-browser CLI commands and rejects failures.
5. `click(name)` clicks an exact accessible button name.
6. `wait(expression)` waits for a DOM condition; `evaluate(expression)` reads DOM data.
7. `assert` is Node's strict assertion API; a failure makes the run fail.
8. `accounting()` queries attempts/leases; `saved()` queries owned persisted days.
9. `emit(description, evidence)` records PASS evidence; `artifact` names screenshots.
10. Run `pnpm e2e:real-stack e2e/real-stack/your-name.scenario.js`; cookie setup is automatic.
