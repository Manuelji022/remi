import { createRecipe, listRecipes } from '#/features/recipes/functions'
import { recipesMissingFromCatalog } from '#/features/recipes/recipe'
import type { RecipeInput } from '#/features/recipes/recipe'

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
