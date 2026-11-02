import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { eq, sql as sqlQuery } from 'drizzle-orm'
import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('#/shared/db', async () => {
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const schema = await import('#/shared/db/schema')
  const migrationsDir = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../drizzle',
  )
  const client = new PGlite()
  const migrationFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()

  for (const name of migrationFiles) {
    const sql = readFileSync(join(migrationsDir, name), 'utf8')
    for (const statement of sql.split('--> statement-breakpoint')) {
      const trimmed = statement.trim()
      if (trimmed) await client.exec(trimmed)
    }
  }

  return { db: drizzle(client, { schema }), schema }
})

const { db, schema } = await import('#/shared/db')
const {
  AiGenerationInProgressError,
  AiGenerationLimitError,
  runAiGenerationWithGuard,
} = await import('#/features/weekly-menu/ai-generation-guard')

const ownerId = crypto.randomUUID()
const limitUserId = crypto.randomUUID()

for (const id of [ownerId, limitUserId]) {
  await db.insert(schema.user).values({
    id,
    name: 'AI generation test',
    email: `${id}@example.invalid`,
    emailVerified: true,
  })
}

afterAll(async () => {
  await db.delete(schema.user).where(eq(schema.user.id, ownerId))
  await db.delete(schema.user).where(eq(schema.user.id, limitUserId))
})

describe('durable AI generation request guard', () => {
  it('never overlaps provider work for the same account', async () => {
    let activeCalls = 0
    let maxActiveCalls = 0
    let releaseFirst!: () => void
    let started!: () => void
    const firstStarted = new Promise<void>((resolve) => {
      started = resolve
    })
    const first = runAiGenerationWithGuard(ownerId, async () => {
      activeCalls += 1
      maxActiveCalls = Math.max(maxActiveCalls, activeCalls)
      started()
      await new Promise<void>((resolve) => {
        releaseFirst = resolve
      })
      activeCalls -= 1
      return 'first'
    })

    await firstStarted
    const second = runAiGenerationWithGuard(ownerId, async () => {
      activeCalls += 1
      maxActiveCalls = Math.max(maxActiveCalls, activeCalls)
      activeCalls -= 1
      return 'second'
    })
    try {
      await expect(second).rejects.toBeInstanceOf(AiGenerationInProgressError)
    } finally {
      releaseFirst()
    }

    await expect(first).resolves.toBe('first')
    expect(maxActiveCalls).toBe(1)
  })

  it('allows five accepted calls per rolling hour and rejects the sixth', async () => {
    for (let index = 0; index < 5; index += 1) {
      await runAiGenerationWithGuard(limitUserId, async () => index)
    }

    await expect(
      runAiGenerationWithGuard(limitUserId, async () => 'over limit'),
    ).rejects.toBeInstanceOf(AiGenerationLimitError)

    await db
      .update(schema.aiMenuGenerationRequest)
      .set({
        createdAt: sqlQuery`clock_timestamp() - interval '1 hour' - interval '1 second'`,
      })
      .where(eq(schema.aiMenuGenerationRequest.userId, limitUserId))

    await expect(
      runAiGenerationWithGuard(
        limitUserId,
        async () => 'outside rolling window',
      ),
    ).resolves.toBe('outside rolling window')
  })
})
