import { listRecipes } from '#/features/recipes/functions'

/** An account with no recipes starts in onboarding. If the recipes cannot be
 *  read, nobody is held back: the planner is the destination. */
export async function pathAfterSignIn() {
  try {
    const recipes = await listRecipes()
    return recipes.length === 0 ? '/onboarding' : '/weekly-menu-planner'
  } catch {
    return '/weekly-menu-planner'
  }
}
