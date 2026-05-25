import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { emailOTP } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db, schema } from '#/db'

const baseURL = process.env.BETTER_AUTH_URL

const trustedOrigins = [
  baseURL,
  'http://localhost:3001',
  'http://127.0.0.1:3001',
].filter((origin): origin is string => Boolean(origin))

export const auth = betterAuth({
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  plugins: [
    tanstackStartCookies(),
    emailOTP({
      async sendOTP({
        email,
        otp,
        type,
      }: {
        email: string
        otp: string
        type: 'sign-in' | 'email-verification' | 'forget-password'
      }) {
        // TODO: integrate with an email provider (Resend, SendGrid, etc.)
        console.log(`[emailOTP] type=${type} email=${email} otp=${otp}`)
      },
    }),
  ],
})
