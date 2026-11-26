import { createAuthClient } from 'better-auth/react'
import { twoFactorClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [twoFactorClient()],
})

/** Tab-scoped. Lets the code page name the address the code went to. */
export const OTP_EMAIL_STORAGE_KEY = 'remi:otpEmail'
