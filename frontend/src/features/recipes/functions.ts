import { createServerFn } from '@tanstack/react-start'
import { requireUserId } from '#/features/auth/require-user'
import {
  parseRecipeId,
  parseRecipeInput,
  parseRecipeUpdate,
} from '#/features/recipes/recipe'
import {
  createRecipeForUser,
  deleteRecipeForUser,
  listRecipesForUser,
  updateRecipeForUser,
} from '#/features/recipes/store'

export const listRecipes = createServerFn({ method: 'GET' }).handler(
  async () => {
    const userId = await requireUserId()
    return listRecipesForUser(userId)
  },
)

export const createRecipe = createServerFn({ method: 'POST' })
  .validator(parseRecipeInput)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    return createRecipeForUser(userId, data)
  })

export const updateRecipe = createServerFn({ method: 'POST' })
  .validator(parseRecipeUpdate)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    return updateRecipeForUser(userId, data)
  })

export const deleteRecipe = createServerFn({ method: 'POST' })
  .validator(parseRecipeId)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    return deleteRecipeForUser(userId, data.id)
  })
