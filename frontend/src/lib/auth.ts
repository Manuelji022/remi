import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { twoFactor } from 'better-auth/plugins/two-factor'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db, schema } from '#/db'
import { sendOtpEmail } from '#/lib/email'

const baseURL = process.env.BETTER_AUTH_URL
const appName = 'Remi'

const trustedOrigins = [
  baseURL,
  'http://localhost:3001',
  'http://127.0.0.1:3001',
].filter((origin): origin is string => Boolean(origin))

export const auth = betterAuth({
  appName,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  databaseHooks: {
    user: {
      create: {
        before(user) {
          return {
            data: {
              ...user,
              twoFactorEnabled: true,
            },
          }
        },
      },
    },
  },
  plugins: [
    tanstackStartCookies(),
    twoFactor({
      otpOptions: {
        async sendOTP({ user, otp }) {
          await sendOtpEmail({ appName, otp, to: user.email })
        },
      },
    }),
  ],
})
