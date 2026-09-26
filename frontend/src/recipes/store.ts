import { and, asc, eq } from 'drizzle-orm'
import { db, schema } from '#/db'
import {
  RecipeNotFoundError,
  readStoredIngredientUnit,
  readStoredMealSlot,
} from '#/recipes/recipe'
import type {
  Recipe,
  RecipeIngredient,
  RecipeInput,
  RecipeUpdate,
} from '#/recipes/recipe'

const { recipe, recipeIngredient } = schema

export async function listRecipesForUser(userId: string): Promise<Recipe[]> {
  const rows = await db.query.recipe.findMany({
    where: eq(recipe.userId, userId),
    orderBy: [asc(recipe.createdAt), asc(recipe.id)],
    with: {
      ingredients: {
        orderBy: [asc(recipeIngredient.position)],
      },
    },
  })

  return rows.map(toRecipe)
}

export async function createRecipeForUser(
  userId: string,
  input: RecipeInput,
): Promise<Recipe> {
  const id = crypto.randomUUID()
  const ingredients = ingredientRows(id, input)

  await db.transaction(async (tx) => {
    await tx.insert(recipe).values({
      id,
      userId,
      name: input.name,
      slot: input.slot,
    })

    if (ingredients.length > 0) {
      await tx.insert(recipeIngredient).values(ingredients)
    }
  })

  return requireOwnedRecipe(userId, id)
}

export async function updateRecipeForUser(
  userId: string,
  input: RecipeUpdate,
): Promise<Recipe> {
  const ingredients = ingredientRows(input.id, input)

  await db.transaction(async (tx) => {
    const updated = await tx
      .update(recipe)
      .set({
        name: input.name,
        slot: input.slot,
        updatedAt: new Date(),
      })
      .where(and(eq(recipe.id, input.id), eq(recipe.userId, userId)))
      .returning({ id: recipe.id })

    if (updated.length === 0) throw new RecipeNotFoundError()

    await tx
      .delete(recipeIngredient)
      .where(eq(recipeIngredient.recipeId, input.id))

    if (ingredients.length > 0) {
      await tx.insert(recipeIngredient).values(ingredients)
    }
  })

  return requireOwnedRecipe(userId, input.id)
}

export async function deleteRecipeForUser(
  userId: string,
  recipeId: string,
): Promise<{ id: string }> {
  const deleted = await db
    .delete(recipe)
    .where(and(eq(recipe.id, recipeId), eq(recipe.userId, userId)))
    .returning({ id: recipe.id })

  if (deleted.length === 0) throw new RecipeNotFoundError()

  return { id: recipeId }
}

async function requireOwnedRecipe(
  userId: string,
  recipeId: string,
): Promise<Recipe> {
  const row = await db.query.recipe.findFirst({
    where: and(eq(recipe.id, recipeId), eq(recipe.userId, userId)),
    with: {
      ingredients: {
        orderBy: [asc(recipeIngredient.position)],
      },
    },
  })

  if (!row) throw new RecipeNotFoundError()

  return toRecipe(row)
}

function ingredientRows(recipeId: string, input: RecipeInput) {
  return input.ingredients.map((ingredient, position) => ({
    id: crypto.randomUUID(),
    recipeId,
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    position,
  }))
}

function toRecipe(row: {
  id: string
  name: string
  slot: string
  ingredients: Array<{
    id: string
    name: string
    quantity: number | null
    unit: string | null
    position: number
  }>
}): Recipe {
  const ingredients: RecipeIngredient[] = row.ingredients.map((ingredient) => ({
    id: ingredient.id,
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: readStoredIngredientUnit(ingredient.unit),
    position: ingredient.position,
  }))

  return {
    id: row.id,
    name: row.name,
    slot: readStoredMealSlot(row.slot),
    ingredients,
  }
}
