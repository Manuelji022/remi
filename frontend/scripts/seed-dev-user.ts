import { existsSync } from 'node:fs'

async function main() {
  if (existsSync('.env')) process.loadEnvFile('.env')
  if (existsSync('.env.local')) process.loadEnvFile('.env.local')

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a development user in production.')
  }

  const databaseUrl = process.env.DATABASE_URL
  const authUrl = process.env.BETTER_AUTH_URL
  const userName = process.env.DEV_SEED_USER_NAME?.trim()
  const userEmail = process.env.DEV_SEED_USER_EMAIL?.trim().toLowerCase()
  const userPassword = process.env.DEV_SEED_USER_PASSWORD

  if (!databaseUrl || !authUrl || !userName || !userEmail || !userPassword) {
    throw new Error(
      'Set DATABASE_URL, BETTER_AUTH_URL, DEV_SEED_USER_NAME, DEV_SEED_USER_EMAIL, and DEV_SEED_USER_PASSWORD in .env.',
    )
  }

  const isLocalhost = (hostname: string) =>
    ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname)
  const isLocalDatabase = isLocalhost(new URL(databaseUrl).hostname)
  const isLocalAuth = isLocalhost(new URL(authUrl).hostname)

  if (
    !isLocalDatabase &&
    process.env.DEV_SEED_ALLOW_REMOTE_DATABASE !== 'true'
  ) {
    throw new Error(
      'The seed database is not localhost. For an explicitly approved development database, set DEV_SEED_ALLOW_REMOTE_DATABASE=true.',
    )
  }

  if (!isLocalAuth) {
    throw new Error('The development-user seed requires a localhost auth URL.')
  }

  if (userPassword.length < 8) {
    throw new Error('DEV_SEED_USER_PASSWORD must be at least 8 characters.')
  }

  const [{ and, eq }, { auth }, { db, schema }] = await Promise.all([
    import('drizzle-orm'),
    import('#/features/auth/auth'),
    import('#/shared/db'),
  ])

  try {
    const existingUsers = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, userEmail))
      .limit(1)
    const existingUser = existingUsers.at(0)

    if (existingUser) {
      const credentialAccounts = await db
        .select({ id: schema.account.id })
        .from(schema.account)
        .where(
          and(
            eq(schema.account.userId, existingUser.id),
            eq(schema.account.providerId, 'credential'),
          ),
        )
        .limit(1)

      if (!credentialAccounts.at(0)) {
        throw new Error(
          `A user with ${userEmail} already exists but has no password account. Use a different seed email.`,
        )
      }

      console.info(
        'Development account already exists; its password was left unchanged.',
      )
      return
    }

    const result = await auth.api.signUpEmail({
      body: {
        name: userName,
        email: userEmail,
        password: userPassword,
      },
      headers: new Headers({ origin: new URL(authUrl).origin }),
    })

    await db
      .delete(schema.session)
      .where(eq(schema.session.userId, result.user.id))

    console.info('Created development account.')
    console.info(
      'Sign in through the app with the configured email and password.',
    )
  } finally {
    await db.$client.end()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
