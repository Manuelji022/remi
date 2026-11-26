# Onboarding checks

## What could go wrong

- Continue is enabled with no recipes, or stays disabled after the first one.
- Enter does not save, saves an empty name, or loses focus from the name field.
- The list does not count lunches and dinners, or the tip never leaves.
- On phone the ingredients start open, or the saved list cannot be reached.
- A page overflows sideways at 390 wide.
- Spanish shows English copy, or a link drops the locale.
- A signed-out visitor gets a form that cannot save.

## Repeatable browser harness

`onboarding.init.js` answers auth and recipe server functions with synthetic
data, so no database, email or real account is used. Run from `frontend/` after
`pnpm build`. Start a production server (the database URL points nowhere on
purpose):

```sh
HOST=127.0.0.1 PORT=3103 BETTER_AUTH_SECRET=local-onboarding-not-a-real-secret BETTER_AUTH_URL=http://127.0.0.1:3103 DATABASE_URL=postgres://nobody:nobody@127.0.0.1:1/none node .output/server/index.mjs
```

Then, in a fresh browser session:

```sh
agent-browser --session remi-onboarding --init-script "$PWD/e2e/onboarding.init.js" open about:blank
node e2e/harness.runner.js e2e/onboarding.browser.js remi-onboarding e2e/artifacts/onboarding-results.json
agent-browser --session remi-onboarding close
```

Results: [`artifacts/onboarding-results.json`](artifacts/onboarding-results.json).

Limits: the fixture stands in for the server, so persistence and authorization
are not covered. Neither are real phones, their keyboards or screen readers.
