import type { IngredientUnit, RecipeIngredientInput } from './recipe'

export function formatRecipeIngredient(
  ingredient: RecipeIngredientInput,
  getUnitLabel: (unit: IngredientUnit) => string,
): string {
  const quantity = ingredient.quantity == null ? '' : `${ingredient.quantity} `
  const unit = ingredient.unit ? `${getUnitLabel(ingredient.unit)} ` : ''

  return `${quantity}${unit}${ingredient.name}`
}
