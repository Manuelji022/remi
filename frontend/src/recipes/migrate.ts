import { createRecipe, listRecipes } from '#/recipes/functions'
import { recipesMissingFromCatalog } from '#/recipes/recipe'
import type { RecipeInput } from '#/recipes/recipe'

export async function importLegacyRecipes(
  legacy: readonly RecipeInput[],
  isCancelled: () => boolean,
): Promise<boolean> {
  const catalog = await listRecipes()
  if (isCancelled()) return false

  const missing = recipesMissingFromCatalog(catalog, legacy)

  for (const recipe of missing) {
    await createRecipe({ data: recipe })
    if (isCancelled()) return false
  }

  return true
}
