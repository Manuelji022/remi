import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '#/features/auth/auth'
import { AUTH_DISABLED } from '#/features/auth/testing'
import { ensureDevUser } from '#/features/auth/dev-user.server'
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

async function requireUserId(): Promise<string> {
  if (AUTH_DISABLED) return ensureDevUser()

  const session = await auth.api.getSession({
    headers: getRequest().headers,
  })

  if (!session?.user.id) throw new Error('Unauthorized')

  return session.user.id
}
