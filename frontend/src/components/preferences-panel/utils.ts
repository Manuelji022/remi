import type {
  CustomRecipeIngredient,
  DayContext,
  IngredientUnit,
  PlanningScope,
} from '#/data/types'
import { EMPTY_RECIPE_INGREDIENT } from './types'
import type { RecipeIngredientDraft } from './types'

export function getEmptyRecipeIngredient(): RecipeIngredientDraft {
  return { ...EMPTY_RECIPE_INGREDIENT }
}

export function buildRecipeIngredients(
  recipeIngredients: RecipeIngredientDraft[],
): CustomRecipeIngredient[] {
  return recipeIngredients
    .map((ingredient) => {
      const name = ingredient.name.trim()
      const quantity = ingredient.quantity.trim()

      if (!name) return null

      return {
        name,
        ...(quantity ? { quantity: Number(quantity) } : {}),
        ...(ingredient.unit ? { unit: ingredient.unit } : {}),
      }
    })
    .filter((ingredient): ingredient is CustomRecipeIngredient =>
      Boolean(ingredient),
    )
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
  ingredient: CustomRecipeIngredient,
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
