import { db, schema } from '#/shared/db'
import { DEV_USER_ID } from './testing'

export async function ensureDevUser(): Promise<string> {
  await db
    .insert(schema.user)
    .values({
      id: DEV_USER_ID,
      name: 'Local Test User',
      email: 'local-test-user@remi.invalid',
    })
    .onConflictDoNothing({ target: schema.user.id })

  return DEV_USER_ID
}
