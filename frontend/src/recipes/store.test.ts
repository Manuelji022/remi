import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { RecipeNotFoundError } from '#/recipes/recipe'
import type { RecipeInput } from '#/recipes/recipe'

const describeWithDatabase = describe.skipIf(
  process.env.RECIPE_DATABASE_TESTS !== '1',
)

describeWithDatabase('recipe store', () => {
  it('creates, lists, updates, and deletes only the owner rows', async () => {
    const { db, schema } = await import('#/db')
    const {
      createRecipeForUser,
      deleteRecipeForUser,
      listRecipesForUser,
      updateRecipeForUser,
    } = await import('#/recipes/store')
    const ownerId = crypto.randomUUID()
    const otherId = crypto.randomUUID()

    async function insertUser(id: string) {
      await db.insert(schema.user).values({
        id,
        name: 'Recipe tester',
        email: `${id}@example.com`,
        emailVerified: true,
      })
    }
    const pasta: RecipeInput = {
      name: 'Lemon pasta',
      slot: 'dinner',
      ingredients: [
        { name: 'Pasta', quantity: 200, unit: 'g' },
        { name: 'Lemon', quantity: 1, unit: 'unit' },
      ],
    }

    try {
      await insertUser(ownerId)
      await insertUser(otherId)

      const created = await createRecipeForUser(ownerId, pasta)

      expect(created.name).toBe('Lemon pasta')
      expect(created.slot).toBe('dinner')
      expect(
        created.ingredients.map(({ name, quantity, unit, position }) => ({
          name,
          quantity,
          unit,
          position,
        })),
      ).toEqual([
        { name: 'Pasta', quantity: 200, unit: 'g', position: 0 },
        { name: 'Lemon', quantity: 1, unit: 'unit', position: 1 },
      ])

      const soup = await createRecipeForUser(ownerId, {
        name: 'Soup',
        slot: 'lunch',
        ingredients: [{ name: 'Stock', quantity: null, unit: null }],
      })

      await db
        .update(schema.recipe)
        .set({ createdAt: new Date('2020-01-01T00:00:00Z') })
        .where(eq(schema.recipe.id, created.id))
      await db
        .update(schema.recipe)
        .set({ createdAt: new Date('2020-01-02T00:00:00Z') })
        .where(eq(schema.recipe.id, soup.id))

      expect(
        (await listRecipesForUser(ownerId)).map((recipe) => recipe.id),
      ).toEqual([created.id, soup.id])
      expect(await listRecipesForUser(otherId)).toEqual([])

      const updated = await updateRecipeForUser(ownerId, {
        id: created.id,
        name: 'Lemon pasta',
        slot: 'lunch',
        ingredients: [{ name: 'Pasta', quantity: 180, unit: 'g' }],
      })

      expect(updated.slot).toBe('lunch')
      expect(
        updated.ingredients.map(({ name, quantity, unit, position }) => ({
          name,
          quantity,
          unit,
          position,
        })),
      ).toEqual([{ name: 'Pasta', quantity: 180, unit: 'g', position: 0 }])

      await expect(
        updateRecipeForUser(otherId, {
          id: created.id,
          name: 'Stolen',
          slot: 'dinner',
          ingredients: [],
        }),
      ).rejects.toBeInstanceOf(RecipeNotFoundError)
      expect(
        (await listRecipesForUser(ownerId)).find(
          (recipe) => recipe.id === created.id,
        )?.name,
      ).toBe('Lemon pasta')

      await expect(
        deleteRecipeForUser(otherId, soup.id),
      ).rejects.toBeInstanceOf(RecipeNotFoundError)
      expect(await deleteRecipeForUser(ownerId, created.id)).toEqual({
        id: created.id,
      })
      const remaining = await listRecipesForUser(ownerId)
      expect(remaining.map((recipe) => recipe.id)).toEqual([soup.id])
      expect(
        remaining[0].ingredients.map(({ name, quantity, unit, position }) => ({
          name,
          quantity,
          unit,
          position,
        })),
      ).toEqual([{ name: 'Stock', quantity: null, unit: null, position: 0 }])
    } finally {
      await db.delete(schema.user).where(eq(schema.user.id, ownerId))
      await db.delete(schema.user).where(eq(schema.user.id, otherId))
    }
  })
})
