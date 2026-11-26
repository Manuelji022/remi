import type { Recipe } from '#/features/recipes/recipe'
import type { MessageKey } from '#/shared/i18n'

/** "1 recipe" / "3 recipes", in the current language. */
export function countLabel(
  t: (key: MessageKey, params?: Record<string, number>) => string,
  noun: 'recipe' | 'lunch' | 'dinner' | 'ingredient',
  count: number,
) {
  return t(`onboarding.count.${noun}.${count === 1 ? 'one' : 'many'}`, {
    count,
  })
}

export function countRecipes(recipes: readonly Recipe[]) {
  const lunches = recipes.filter((recipe) => recipe.slot === 'lunch').length
  return {
    total: recipes.length,
    lunches,
    dinners: recipes.length - lunches,
  }
}
