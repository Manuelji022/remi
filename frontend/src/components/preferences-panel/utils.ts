import type { DayContext, IngredientUnit, PlanningScope } from '#/data/types'
import type { RecipeIngredientInput } from '#/recipes/recipe'
import { EMPTY_RECIPE_INGREDIENT } from './types'
import type { RecipeIngredientDraft } from './types'

export function getEmptyRecipeIngredient(): RecipeIngredientDraft {
  return { ...EMPTY_RECIPE_INGREDIENT }
}

export function buildRecipeIngredients(
  recipeIngredients: RecipeIngredientDraft[],
): RecipeIngredientInput[] {
  return recipeIngredients.flatMap((ingredient) => {
    const name = ingredient.name.trim()
    const quantity = ingredient.quantity.trim()

    if (!name) return []

    return [
      {
        name,
        quantity: quantity === '' ? null : Number(quantity),
        unit: ingredient.unit === '' ? null : ingredient.unit,
      },
    ]
  })
}

export function hasInvalidRecipeIngredientQuantity(
  recipeIngredients: RecipeIngredientDraft[],
): boolean {
  return recipeIngredients.some((ingredient) => {
    const quantity = ingredient.quantity.trim()

    return (
      quantity !== '' &&
      (!Number.isFinite(Number(quantity)) || Number(quantity) < 0)
    )
  })
}

export function formatRecipeIngredient(
  ingredient: RecipeIngredientInput,
  getUnitLabel: (unit: IngredientUnit) => string,
): string {
  const quantity = ingredient.quantity == null ? '' : `${ingredient.quantity} `
  const unit = ingredient.unit ? `${getUnitLabel(ingredient.unit)} ` : ''

  return `${quantity}${unit}${ingredient.name}`
}

export function getBlockedPlanningScopes(
  dayContext: DayContext | null,
): ReadonlyArray<PlanningScope> {
  if (dayContext === 'office') return ['lunch', 'both']
  if (dayContext === 'eatOut') return ['both']

  return []
}

export function getPlanningScopeForContext(
  dayContext: DayContext | null,
  currentScope: PlanningScope,
): PlanningScope {
  const blockedScopes = getBlockedPlanningScopes(dayContext)

  return blockedScopes.includes(currentScope) ? 'dinner' : currentScope
}
