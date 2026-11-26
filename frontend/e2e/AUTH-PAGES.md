# Auth pages failure checklist

Written before the two-factor code input was implemented.

- A correct password does not reach `/two-factor` in the current locale, or the
  page does not name the email the code went to.
- A direct visit to `/two-factor` (no stored email) shows an empty or broken
  sentence.
- The code input has no accessible name, or exposes six inputs instead of one.
- Typed digits do not fill the boxes in order; letters or spaces get in.
- Backspace does not remove exactly the last digit.
- The caret can be moved into the middle, so typing lands in the wrong box.
- A pasted code is truncated or appended: with spaces or a dash, or over a
  partly typed code.
- A seventh digit is accepted.
- A short code is sent to the server.
- A wrong code loses the typed digits or shows no error.
- "Resend code" does not ask for a new code.
- A verified code goes to `/` instead of the weekly planner, or drops the locale.
  An account with no recipes goes to onboarding instead; see `ONBOARDING.md`.
- Select all, then typing, does not replace the code.
- A page overflows sideways at 390 wide.

## Repeatable browser harness

The fixture (`auth-pages.init.js`) answers `/api/auth/*` with synthetic data, so no
database, email or real account is used. Run from `frontend/` after `pnpm build`.
Start a production server (the database URL points nowhere on purpose):

```sh
HOST=127.0.0.1 PORT=3102 BETTER_AUTH_SECRET=local-auth-pages-not-a-real-secret BETTER_AUTH_URL=http://127.0.0.1:3102 DATABASE_URL=postgres://nobody:nobody@127.0.0.1:1/none node .output/server/index.mjs
```

Then, in a fresh browser session:

```sh
agent-browser --session remi-auth --init-script "$PWD/e2e/auth-pages.init.js" open http://127.0.0.1:3102/login
node e2e/harness.runner.js e2e/auth-pages.browser.js remi-auth e2e/artifacts/auth-pages-results.json
agent-browser --session remi-auth close
```

Results: `e2e/artifacts/auth-pages-results.json` (12 passed, 0 failed with
agent-browser 0.38.2 on macOS); screenshot: `e2e/artifacts/auth-pages/two-factor-en.png`.

Limits: headless Chrome has no clipboard to paste from here, so the harness fires
a `paste` event that carries the text. A native paste (Cmd+V over a real
clipboard) was checked once by hand with Playwright and granted clipboard
permissions, outside this harness. Not covered: a real auth server, email
delivery, real phones, one-time-code autofill and screen readers.
