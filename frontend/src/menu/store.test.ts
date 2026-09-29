import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { eq } from 'drizzle-orm'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { MenuInputError, applySchedule, emptyMenu } from '#/menu/week'

vi.mock('#/db', async () => {
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const schema = await import('#/db/schema')
  const migrationsDir = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../drizzle',
  )
  const client = new PGlite()
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort()

  for (const name of files) {
    const sql = readFileSync(join(migrationsDir, name), 'utf8')
    for (const statement of sql.split('--> statement-breakpoint')) {
      const trimmed = statement.trim()
      if (trimmed) await client.exec(trimmed)
    }
  }

  return { db: drizzle(client, { schema }), schema }
})

const { db, schema } = await import('#/db')
const { loadMenuWeekForUser, saveMenuWeekForUser } =
  await import('#/menu/store')

describe('menu week store', () => {
  const ownerId = crypto.randomUUID()
  const otherId = crypto.randomUUID()

  afterAll(async () => {
    await db.delete(schema.user).where(eq(schema.user.id, ownerId))
    await db.delete(schema.user).where(eq(schema.user.id, otherId))
  })

  it('saves the current week and the prior week for the owner only', async () => {
    await insertUser(ownerId)
    await insertUser(otherId)

    const current = applySchedule(emptyMenu('2026-09-28'), {
      dayContexts: { Monday: 'office' },
      planningScopes: { Monday: 'dinner' },
    })
    const prior = applySchedule(emptyMenu('2026-09-21'), {
      dayContexts: { Tuesday: 'eatOut' },
      planningScopes: { Tuesday: 'lunch' },
    })
    const pastaId = crypto.randomUUID()

    await db.insert(schema.recipe).values({
      id: pastaId,
      userId: ownerId,
      name: 'Lemon pasta',
      slot: 'dinner',
    })
    current.days.Monday.dinnerRecipeId = pastaId

    const saved = await saveMenuWeekForUser(ownerId, current)
    await saveMenuWeekForUser(ownerId, current)
    await saveMenuWeekForUser(ownerId, prior)

    expect(saved.menu.days.Monday).toEqual({
      context: 'office',
      scope: 'dinner',
      lunchRecipeId: null,
      dinnerRecipeId: pastaId,
    })
    expect(saved.recipeNames).toEqual({ [pastaId]: 'Lemon pasta' })

    const loadedCurrent = await loadMenuWeekForUser(ownerId, '2026-09-28')
    const loadedPrior = await loadMenuWeekForUser(ownerId, '2026-09-21')
    const otherCurrent = await loadMenuWeekForUser(otherId, '2026-09-28')

    expect(loadedCurrent.menu.days.Monday.dinnerRecipeId).toBe(pastaId)
    expect(loadedCurrent.recipeNames[pastaId]).toBe('Lemon pasta')
    expect(loadedPrior.menu.days.Tuesday).toEqual({
      context: 'eatOut',
      scope: 'lunch',
      lunchRecipeId: null,
      dinnerRecipeId: null,
    })
    expect(loadedPrior.menu.days.Monday.context).toBeNull()
    expect(otherCurrent.menu.days.Monday).toEqual({
      context: null,
      scope: 'both',
      lunchRecipeId: null,
      dinnerRecipeId: null,
    })

    const ownerWeeks = await db
      .select({ weekStart: schema.weeklyMenu.weekStart })
      .from(schema.weeklyMenu)
      .where(eq(schema.weeklyMenu.userId, ownerId))
    expect(ownerWeeks.map((week) => week.weekStart).sort()).toEqual([
      '2026-09-21',
      '2026-09-28',
    ])

    const stolen = applySchedule(emptyMenu('2026-09-28'), {
      dayContexts: { Monday: 'office' },
      planningScopes: { Monday: 'dinner' },
    })
    stolen.days.Monday.dinnerRecipeId = pastaId
    await expect(saveMenuWeekForUser(otherId, stolen)).rejects.toBeInstanceOf(
      MenuInputError,
    )
    expect(
      (await loadMenuWeekForUser(ownerId, '2026-09-28')).menu.days.Monday
        .dinnerRecipeId,
    ).toBe(pastaId)

    await db.delete(schema.recipe).where(eq(schema.recipe.id, pastaId))
    expect(
      (await loadMenuWeekForUser(ownerId, '2026-09-28')).menu.days.Monday
        .dinnerRecipeId,
    ).toBeNull()
  })
})

async function insertUser(id: string) {
  await db.insert(schema.user).values({
    id,
    name: 'Menu tester',
    email: `${id}@example.com`,
    emailVerified: true,
  })
}
