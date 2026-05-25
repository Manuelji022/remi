# Password + Email OTP 2FA with Better Auth

## Task title

Implement mandatory password + email OTP two-factor authentication with Better Auth.

## Original user request

The user initially requested, in Spanish, to implement “OPT”/OTP to add an extra security layer to authentication, noting that some logic had already been introduced and that they wanted to learn how it works. They referenced the Better Auth Email OTP documentation: https://better-auth.com/docs/plugins/email-otp.

During planning, the desired behavior changed from passwordless email OTP to password-based login followed by email OTP as a required second factor.

## Final agreed goal

Implement authentication so that users authenticate with:

1. Email + password.
2. A mandatory second factor: an OTP code sent by email.

The second factor must be required for all users and for every login. The first implementation should not allow “remember this device” / trusted-device bypass.

Signup should also lead directly into OTP verification after account creation, rather than simply redirecting to the home page or requiring the user to manually go back to login.

Email delivery should use Resend.

## Relevant context discovered during planning

Repository context:

- App is a TanStack Start React 19 frontend in `frontend/`.
- Routing is file-based under `frontend/src/routes/`.
- Better Auth server config is in `frontend/src/lib/auth.ts`.
- Better Auth client config is in `frontend/src/lib/auth-client.ts`.
- Auth route handler is `frontend/src/routes/api/auth/$.ts` and already delegates GET/POST to `auth.handler(request)`.
- Current login page is `frontend/src/routes/login.tsx`.
- Current signup page is `frontend/src/routes/signup.tsx`.
- Spanish routes reuse those pages:
  - `frontend/src/routes/es.login.tsx`
  - `frontend/src/routes/es.signup.tsx`
- Current i18n messages are in `frontend/src/i18n/messages.ts`.
- Current Better Auth schema is in `frontend/src/db/schema.ts` and includes `user`, `session`, `account`, and `verification` tables.
- `frontend/package.json` currently has Better Auth, Drizzle, TanStack Start, and scripts:
  - `pnpm auth:generate`
  - `pnpm db:generate`
  - `pnpm db:migrate`

Current auth state:

- `frontend/src/lib/auth.ts` currently imports and configures `emailOTP` from `better-auth/plugins`.
- `sendVerificationOTP` currently contains only comments and does not send real email.
- `frontend/src/lib/auth-client.ts` currently imports and configures `emailOTPClient`.
- Current login uses `authClient.signIn.email({ email, password })` and navigates directly home on success.
- Current signup uses `authClient.signUp.email({ name, email, password })` and navigates directly home on success.

Better Auth documentation findings:

- The `emailOTP` plugin is primarily for:
  - passwordless sign-in with email OTP,
  - email verification with OTP,
  - password reset with OTP,
  - email change with OTP.
- For email/password followed by a second factor, Better Auth’s native fit is the `twoFactor` plugin, documented at `/docs/plugins/2fa`.
- The `twoFactor` plugin supports OTP as a second factor via `otpOptions.sendOTP`.
- For credential-based sign-in (`/sign-in/email`), Better Auth can return a response containing:
  - `twoFactorRedirect: true`
  - `twoFactorMethods`, e.g. `['otp']`
- Client-side verification should then use:
  - `authClient.twoFactor.sendOtp(...)`
  - `authClient.twoFactor.verifyOtp(...)`

## Important constraints

- Do not edit generated `frontend/src/routeTree.gen.ts` manually.
- Use TanStack Start file-based routing conventions.
- Use `createAuthClient` from Better Auth React/client APIs and Better Auth plugins from their documented plugin paths.
- Use Resend for transactional email delivery.
- Do not implement a manual password pre-check plus custom OTP session unless the native Better Auth `twoFactor` flow proves impossible; native `twoFactor` is preferred for security.
- OTP must be mandatory for all users.
- OTP must be required on every login; do not implement trusted-device bypass in the first version.
- Signup should transition into OTP verification immediately after account creation.
- The implementation must update database schema/migrations for Better Auth `twoFactor` requirements.
- The app has English and Spanish routes/messages, so user-facing OTP UI copy should be localized in `frontend/src/i18n/messages.ts`.

## Agreed implementation approach

Use Better Auth’s native `twoFactor` plugin with email OTP as the second factor.

High-level flow:

### Login flow

1. User enters email and password on `/login` or `/es/login`.
2. UI calls `authClient.signIn.email({ email, password }, ...)`.
3. If Better Auth returns/indicates `twoFactorRedirect: true`, route the user to a two-factor page or show the OTP step.
4. Trigger `authClient.twoFactor.sendOtp({ trustDevice: false })` if the OTP is not automatically sent by the chosen client redirect flow.
5. User enters OTP code.
6. UI calls `authClient.twoFactor.verifyOtp({ code, trustDevice: false })`.
7. On success, navigate to the localized home page.

### Signup flow

1. User enters name, email, and password on `/signup` or `/es/signup`.
2. UI calls `authClient.signUp.email({ name, email, password })`.
3. After signup succeeds, immediately route into OTP verification rather than navigating home.
4. If Better Auth has already created a temporary/session state compatible with 2FA verification, send/verify OTP directly.
5. If Better Auth does not challenge signup directly with 2FA, fall back to a safe flow:
   - sign the user out if a full session was created,
   - call the normal login flow with email/password,
   - handle the resulting `twoFactorRedirect`,
   - complete OTP verification.
6. Do not leave the user fully authenticated until OTP has been verified.

### Server auth config

Replace the current login-oriented use of `emailOTP` with `twoFactor` for the second-factor flow.

Conceptual target:

```ts
import { twoFactor } from 'better-auth/plugins'

export const auth = betterAuth({
  appName: 'Remi',
  // existing trustedOrigins, database, emailAndPassword...
  plugins: [
    tanstackStartCookies(),
    twoFactor({
      otpOptions: {
        async sendOTP({ user, otp }, ctx) {
          // Send `otp` to `user.email` with Resend.
        },
      },
    }),
  ],
})
```

### Client auth config

Replace `emailOTPClient()` with `twoFactorClient()` for this login flow.

Conceptual target:

```ts
import { createAuthClient } from 'better-auth/react'
import { twoFactorClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [
    twoFactorClient({
      twoFactorPage: '/two-factor',
    }),
  ],
})
```

If programmatic navigation is preferred to a full reload, use `onTwoFactorRedirect` instead of `twoFactorPage` and integrate with TanStack Router navigation.

### Resend integration

Add Resend as the email provider for OTP delivery.

Expected env vars:

- `RESEND_API_KEY`
- `OTP_EMAIL_FROM`, for example `Remi <auth@example.com>`

Expected dependency:

- `resend`

Create a small email utility, likely under `frontend/src/lib/email.ts` or `frontend/src/lib/resend.ts`, to avoid embedding provider details directly in `auth.ts`.

Example responsibility:

```ts
export async function sendOtpEmail(params: {
  to: string
  otp: string
  appName: string
}) {
  // Use Resend to send a concise OTP email.
}
```

### Mandatory 2FA for all users

Ensure all users have 2FA enabled.

Likely implementation options:

1. Add `twoFactorEnabled` to the `user` table with a default of `true`.
2. Backfill existing users to `true` in a migration.
3. Ensure new users are created with `twoFactorEnabled = true`.

Because Better Auth controls user creation, verify whether a DB default is enough with the Drizzle adapter. If not, use a Better Auth database hook, such as `databaseHooks.user.create.before`, to set `twoFactorEnabled` for newly created users.

The `twoFactor` plugin also requires a `twoFactor` table according to the docs. Add the schema generated by Better Auth CLI or manually mirror the documented Drizzle schema.

## Reasoning behind the approach

The user wants a true second security layer after password login. The Better Auth `emailOTP` plugin is not the best primary tool for that because it is designed mostly for passwordless OTP login and account flows such as verification/reset.

The `twoFactor` plugin is the native Better Auth feature for “password accepted, now verify another factor.” It avoids the major security risk of implementing a custom flow where `signIn.email()` creates a full session before OTP verification.

Using `twoFactor` means Better Auth owns the intermediate authentication state and final session creation, which is safer and more maintainable.

Resend is appropriate because the user selected it as the email provider and OTP email is transactional email.

Requiring OTP on every login is stricter than the default trusted-device UX, but it matches the agreed security goal and keeps the first implementation easier to reason about.

## Alternatives considered and why they were rejected

### Passwordless Email OTP using `emailOTP`

Rejected because the user changed the goal. Passwordless OTP does not provide “password plus a second factor”; it replaces the password login flow.

### Manual password + `emailOTP` flow

Rejected as the primary approach because `authClient.signIn.email()` normally creates a session after successful password validation. Building a custom intermediate session flow risks accidentally authenticating users before OTP verification. It would also duplicate functionality Better Auth already provides via `twoFactor`.

### Optional 2FA per user

Rejected because the user wants OTP mandatory for all users.

### Trusted devices / remember this device

Rejected for the initial implementation because the user wants OTP on every login. It can be added later as a UX improvement.

### Signup redirects to login

Considered simpler and safer, but rejected by the user. The agreed behavior is signup followed immediately by OTP.

## Files or areas likely involved

Server/auth configuration:

- `frontend/src/lib/auth.ts`
  - Replace or stop using `emailOTP` for login.
  - Add `twoFactor` plugin.
  - Configure `otpOptions.sendOTP` with Resend-backed email sending.
  - Add `appName: 'Remi'` if not already present.
  - Add hook/default behavior to ensure `twoFactorEnabled` is true for new users if DB defaults are insufficient.

Client/auth configuration:

- `frontend/src/lib/auth-client.ts`
  - Replace `emailOTPClient()` with `twoFactorClient()`.
  - Configure either `twoFactorPage: '/two-factor'` or an `onTwoFactorRedirect` callback.

Email utility:

- Suggested: `frontend/src/lib/email.ts` or `frontend/src/lib/resend.ts`
  - Initialize Resend with `RESEND_API_KEY`.
  - Send OTP email using `OTP_EMAIL_FROM`.

Routes/UI:

- `frontend/src/routes/login.tsx`
  - Keep email/password fields.
  - Detect 2FA redirect response.
  - Navigate to OTP step/page.
- `frontend/src/routes/signup.tsx`
  - Keep name/email/password fields.
  - After successful signup, transition into OTP verification.
  - Avoid leaving user fully authenticated before OTP is verified.
- Suggested new route: `frontend/src/routes/two-factor.tsx`
  - OTP input.
  - Send/resend OTP behavior.
  - Verify OTP.
  - Navigate home on success.
- Optional Spanish route: `frontend/src/routes/es.two-factor.tsx`
  - Can reuse the same component, similar to `es.login.tsx` and `es.signup.tsx`.

Database/schema:

- `frontend/src/db/schema.ts`
  - Add `twoFactorEnabled` boolean field to `user`.
  - Add `twoFactor` table required by Better Auth plugin.
- Drizzle migrations under the project’s migration output directory.
  - Generate with Better Auth/Drizzle commands and inspect before applying.

Localization:

- `frontend/src/i18n/messages.ts`
  - Add English and Spanish strings for OTP page, sending, verifying, errors, resend, and signup transition.

Dependencies/config:

- `frontend/package.json`
  - Add `resend` dependency.
- Environment variables:
  - `RESEND_API_KEY`
  - `OTP_EMAIL_FROM`
  - Existing Better Auth env vars should remain configured: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.

## Risks and edge cases

- **Signup + immediate OTP may not be natively challenged the same way as login.** Verify Better Auth behavior. If signup creates a full session without 2FA, explicitly handle that by signing out and starting the login challenge flow, or use a documented Better Auth hook/flow to prevent a fully authenticated session before OTP.
- **Mandatory 2FA depends on `twoFactorEnabled`.** Existing users must be backfilled. New users must reliably get this flag set.
- **Schema changes are required.** The `twoFactor` plugin requires additional schema. Run Better Auth schema generation and Drizzle migration workflow.
- **Do not manually edit generated route tree.** Re-run dev/generation as needed.
- **Email deliverability.** Resend requires a verified sending domain/from address. In development, ensure the chosen from address is valid for the Resend account.
- **OTP email timing.** Avoid leaking user existence or timing differences where possible. Better Auth handles much of the auth flow, but email sending should not include sensitive details.
- **Repeated OTP sends.** Since this is `twoFactor` OTP rather than `emailOTP`, confirm plugin options for OTP period/storage and resend behavior. Avoid sending multiple confusing codes if the user clicks resend repeatedly.
- **No trusted device.** Always pass `trustDevice: false` or omit trusted-device UI. Confirm that omission does not default to trusting the device.
- **Localized routing.** `/es/login` and `/es/signup` reuse the same components. The two-factor route should preserve locale when navigating after login/signup.
- **Error handling.** Wrong code, expired code, too many attempts, failed email send, and lost intermediate 2FA state should all produce clear messages and allow restarting login.

## Validation strategy

Run from `frontend/` unless noted otherwise.

1. Install new dependency:
   - `pnpm add resend`
2. Generate/update auth schema after adding `twoFactor`:
   - `pnpm auth:generate`
3. Generate/apply Drizzle migration if required:
   - `pnpm db:generate`
   - `pnpm db:migrate`
4. Run static checks:
   - `pnpm lint`
   - `pnpm check`
5. Run tests:
   - `pnpm test`
6. Run the app:
   - `pnpm dev`
7. Manual auth validation:
   - Create a new account from `/signup`.
   - Confirm an OTP email is sent via Resend.
   - Confirm the user cannot reach the authenticated destination before OTP verification.
   - Enter an incorrect OTP and confirm an error appears.
   - Enter the correct OTP and confirm navigation to localized home.
   - Log out.
   - Log in with email/password and confirm OTP is required again.
   - Verify that no “remember device” bypass occurs.
   - Repeat in Spanish route `/es/signup` and `/es/login`.
8. Database validation:
   - Confirm new users have `twoFactorEnabled = true`.
   - Confirm existing users were backfilled to `twoFactorEnabled = true`.
   - Confirm the `twoFactor` plugin table exists.

## Detailed TODO

1. Review current Better Auth version and plugin docs.
   - Confirm exact import path for `twoFactor` and `twoFactorClient` for Better Auth `1.6.11`.
   - Confirm available `otpOptions` options for code length, period, and storage.

2. Add Resend dependency and environment variables.
   - Run `pnpm add resend` in `frontend/`.
   - Add `RESEND_API_KEY` to local environment.
   - Add `OTP_EMAIL_FROM` to local environment.
   - Document required env vars in the project’s env example/readme if one exists.

3. Create a Resend email utility.
   - Add `frontend/src/lib/email.ts` or `frontend/src/lib/resend.ts`.
   - Initialize Resend server-side only.
   - Export a `sendOtpEmail` function.
   - Keep the email template simple: app name, OTP code, expiration note, ignore-if-not-requested copy.
   - Do not expose `RESEND_API_KEY` to client code.

4. Replace login-oriented Email OTP plugin usage.
   - In `frontend/src/lib/auth.ts`, remove `emailOTP` from the primary login plugin list.
   - Import `twoFactor` from `better-auth/plugins`.
   - Add `appName: 'Remi'` to Better Auth config.
   - Configure `twoFactor({ otpOptions: { sendOTP } })`.
   - In `sendOTP`, call the Resend email utility with `user.email` and `otp`.

5. Configure mandatory 2FA for users.
   - Add `twoFactorEnabled` boolean to the `user` schema.
   - Prefer default `true` if compatible with Better Auth and Drizzle.
   - Add a hook if needed to ensure new Better Auth users get `twoFactorEnabled = true`.
   - Plan a migration/backfill for existing users to set `twoFactorEnabled = true`.

6. Add the Better Auth `twoFactor` table.
   - Run `pnpm auth:generate` after plugin config changes.
   - Compare generated schema with current `frontend/src/db/schema.ts`.
   - Add the documented Drizzle table if generation does not update it automatically.
   - Generate and apply migrations using the project’s Drizzle commands.

7. Update the Better Auth client plugin.
   - In `frontend/src/lib/auth-client.ts`, remove `emailOTPClient()` for this flow.
   - Add `twoFactorClient()`.
   - Decide implementation style:
     - `twoFactorPage: '/two-factor'` for simpler full-page redirect, or
     - `onTwoFactorRedirect` for TanStack Router navigation.
   - For initial implementation, prefer a route/page because it is easier to reason about.

8. Create the two-factor route.
   - Add `frontend/src/routes/two-factor.tsx`.
   - Add `frontend/src/routes/es.two-factor.tsx` that reuses the same component, if localized route parity is desired.
   - UI should include:
     - OTP input,
     - submit button,
     - resend code button if safe/supported,
     - loading state,
     - error state,
     - copy explaining the code was sent by email.
   - On submit, call `authClient.twoFactor.verifyOtp({ code, trustDevice: false })`.
   - On success, navigate to `/` or `/es` based on locale.

9. Send OTP for the two-factor challenge.
   - Confirm whether Better Auth sends OTP automatically after `twoFactorRedirect` or requires explicit `authClient.twoFactor.sendOtp`.
   - If explicit, call `authClient.twoFactor.sendOtp({ trustDevice: false })` when entering the two-factor page/challenge.
   - Prevent duplicate sends caused by React Strict Mode/double effects; use a ref or user-triggered send if necessary.

10. Update login flow.
    - Keep email/password fields in `frontend/src/routes/login.tsx`.
    - Call `authClient.signIn.email`.
    - Detect `twoFactorRedirect` from the result or via the `onSuccess` callback.
    - If 2FA is required, navigate to localized two-factor route.
    - If login succeeds without 2FA, treat it as unexpected under mandatory policy; optionally sign out and show an error, or log for investigation.
    - Preserve locale when navigating.

11. Update signup flow for immediate OTP.
    - Keep name/email/password fields in `frontend/src/routes/signup.tsx`.
    - After successful `signUp.email`, route into OTP verification.
    - Verify Better Auth behavior:
      - If signup produces a 2FA challenge, use it directly.
      - If signup creates a full session, avoid leaving the user authenticated before OTP. Safest fallback: sign out and initiate login challenge with the same email/password, then continue to two-factor route.
    - Do not navigate home until OTP is verified.

12. Add localized messages.
    - Update `frontend/src/i18n/messages.ts` with English and Spanish keys for:
      - OTP page title,
      - OTP instructions,
      - code label,
      - verify button,
      - verifying state,
      - resend button,
      - sending state,
      - invalid/expired code error,
      - generic OTP send/verify errors,
      - signup-created-now-verify copy.

13. Remove passwordless OTP assumptions.
    - Ensure no UI copy implies “login without password”.
    - Ensure `emailOTP` plugin/client is not used for the main login flow.
    - Only keep `emailOTP` if there is a separate, deliberate use case such as password reset by OTP; otherwise remove it to reduce confusion.

14. Validate security behavior manually.
    - Confirm every login asks for password first and OTP second.
    - Confirm wrong password does not send OTP.
    - Confirm correct password sends OTP but does not reach home before OTP verification.
    - Confirm wrong OTP does not authenticate.
    - Confirm correct OTP authenticates.
    - Confirm logout + login requires OTP again.
    - Confirm there is no trusted-device skip.

15. Run project checks.
    - `pnpm lint`
    - `pnpm check`
    - `pnpm test`
    - `pnpm build`

16. Document follow-up improvements.
    - Optional trusted devices with explicit “remember this device” checkbox.
    - Backup codes.
    - Rate-limit tuning for OTP sends and verification attempts.
    - Better transactional email template.
    - Separate email verification policy for account ownership.
    - Recovery flow if the user loses access to email.
