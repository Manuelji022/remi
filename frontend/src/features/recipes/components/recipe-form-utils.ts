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

/** Saved ingredients as form rows; one empty row when there are none. */
export function toRecipeIngredientDrafts(
  ingredients: readonly RecipeIngredientInput[],
): RecipeIngredientDraft[] {
  if (ingredients.length === 0) return [getEmptyRecipeIngredient()]

  return ingredients.map(({ name, quantity, unit }) => ({
    name,
    quantity: quantity === null ? '' : String(quantity),
    unit: unit ?? '',
  }))
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
