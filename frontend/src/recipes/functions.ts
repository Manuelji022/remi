import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth'
import {
  parseRecipeId,
  parseRecipeInput,
  parseRecipeUpdate,
} from '#/recipes/recipe'
import {
  createRecipeForUser,
  deleteRecipeForUser,
  listRecipesForUser,
  updateRecipeForUser,
} from '#/recipes/store'

export const listRecipes = createServerFn({ method: 'GET' }).handler(
  async () => {
    const userId = await requireUserId()
    return listRecipesForUser(userId)
  },
)

export const createRecipe = createServerFn({ method: 'POST' })
  .inputValidator(parseRecipeInput)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    return createRecipeForUser(userId, data)
  })

export const updateRecipe = createServerFn({ method: 'POST' })
  .inputValidator(parseRecipeUpdate)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    return updateRecipeForUser(userId, data)
  })

export const deleteRecipe = createServerFn({ method: 'POST' })
  .inputValidator(parseRecipeId)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    return deleteRecipeForUser(userId, data.id)
  })

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({
    headers: getRequest().headers,
  })

  if (!session?.user.id) throw new Error('Unauthorized')

  return session.user.id
}
