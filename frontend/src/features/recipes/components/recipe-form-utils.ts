import type { IngredientUnit, RecipeIngredientInput } from '../recipe'

export type RecipeIngredientDraft = {
  name: string
  quantity: string
  unit: IngredientUnit | ''
}

const EMPTY_RECIPE_INGREDIENT: RecipeIngredientDraft = {
  name: '',
  quantity: '',
  unit: '',
}

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
