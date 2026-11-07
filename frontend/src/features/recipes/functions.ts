import { createServerFn } from '@tanstack/react-start'
import { authMiddleware } from '#/features/auth/middleware'
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

export const listRecipes = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return listRecipesForUser(context.userId)
  })

export const createRecipe = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(parseRecipeInput)
  .handler(async ({ data, context }) => {
    return createRecipeForUser(context.userId, data)
  })

export const updateRecipe = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(parseRecipeUpdate)
  .handler(async ({ data, context }) => {
    return updateRecipeForUser(context.userId, data)
  })

export const deleteRecipe = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(parseRecipeId)
  .handler(async ({ data, context }) => {
    return deleteRecipeForUser(context.userId, data.id)
  })
