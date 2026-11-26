# Onboarding checks

## What could go wrong

- Welcome greets with the full name, or the site header and footer show.
- A typed `?step=done` with nothing saved offers to finish, or jumps there
  after the first save.
- **Add more recipes** or Back does not return to the right step.
- **Generate my first menu** does not open the planner's schedule dialog, or
  opens it again after a reload.
- Continue is enabled with no recipes, or stays disabled after the first one.
- Enter does not save, saves an empty name, or loses focus from the name field.
- The list does not count lunches and dinners, or the tip never leaves.
- On phone the ingredients start open, or the saved list cannot be reached.
- A page overflows sideways at 390 wide.
- Spanish shows English copy, or a link drops the locale.
- A signed-out visitor gets a form that cannot save.
- After two-factor, a new account does not reach onboarding because the session
  store is late and the page takes it for a guest.
- An account with recipes lands in onboarding, or an unreadable recipe list
  keeps someone from the planner.
- Editing from the list adds a copy, or throws away what is half typed.
- **I'll do it later** misses the planner, or `/` starts redirecting.

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
