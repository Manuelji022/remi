# Auth (sign-in)

Route `/login`. Page `LoginPage` in `frontend/src/routes/login.tsx`. Spanish copy is the same component at `/es/login`.

## Sub-features

- Email and password form.
- Forgot-password link to `/forgot-password`.
- Create-account link to `/signup`.
- Header session: `authClient.useSession()` against `/api/auth/get-session`.
- Successful password sign-in does not land in the app. `login.tsx` signs the user out again unless Better Auth returns `twoFactorRedirect`, then it navigates to `/two-factor`. A session without that flag shows `Two-factor verification is required. Please try logging in again.`

Sign-up (`/signup`), forgot password, reset password, and the OTP screen (`/two-factor`) are the rest of the auth UI. They are not required to prove the login form renders.

## How to get to it (user POV)

From any English page, click `Log in` in the header (`a.header-auth-link` whose text is `Log in`). Direct URL: `http://localhost:3001/login`.

## Driving it with Chrome CDP

Doctor must print `auth-submit: blocked` or `auth-submit: ready` before you touch the form. Open the form in both cases. Submit only when it prints `auth-submit: ready`.

Render check (no database):

1. Navigate to `http://localhost:3001/login`.
2. `h1#login-title` text is `Log in`.
3. `section.auth-card` contains `Welcome back. Access your Remi account.`
4. `form.auth-form input[name="email"]` is `type="email"` and required. `input[name="password"]` is `type="password"`, `minLength` 8, required.
5. Submit button `.auth-button` text is `Log in`.
6. Link text `Forgot your password?` points at `/forgot-password`. Link text `Create one` points at `/signup`.
7. Do not fill or submit. Screenshot the form. Network may show `GET /api/auth/get-session` → 200 `null`.

Submit check, only after doctor says `auth-submit: ready`:

1. Type into the named inputs (CDP `Input.insertText` or set the native value and dispatch `input`). Do not invent a user. Use an account that already exists in that database, or stop.
2. Click `.auth-button`.
3. Resulting state is one of: navigation to `/two-factor` (`h1#two-factor-title` text `Check your email`), or `.auth-error` with the server message. Both are real outcomes. A 500 from `/api/auth/sign-in/email` means the database or secret is wrong — record the status and stop. Do not claim the user is signed in.
4. Header shows `.header-user` only when a session survives. This login page clears the session unless two-factor redirects, so a visible name in the header is not the expected end of `/login`.

`frontend/.env.example` sets `BETTER_AUTH_URL=http://localhost:3000`. The dev server is port 3001, and `frontend/src/lib/auth.ts` trusts `http://localhost:3001` and `http://127.0.0.1:3001` plus `BETTER_AUTH_URL`. For a submit run, set `BETTER_AUTH_URL=http://localhost:3001`. Postgres compose publishes `${TAILSCALE_IP}:15432:5432`, not `localhost:5432`. The example `DATABASE_URL` does not match that compose file. Do not rewrite either file as part of a UI check.

## Gotchas

- Missing `BETTER_AUTH_URL` logs `Base URL could not be determined` on the server and still returns `null` for an anonymous `get-session`. That is not a successful login.
- Password shorter than 8 characters never reaches the server; the input is `minLength` 8.
- OTP email needs `RESEND_API_KEY` and `OTP_EMAIL_FROM`. Without them, reaching `/two-factor` is as far as the UI goes. Do not fake an inbox.
- There is no in-app user list. Do not seed users through the recipe tables.
