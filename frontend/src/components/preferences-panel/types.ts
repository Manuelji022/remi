import type { IngredientUnit, MealSlot, PlanningScope } from '#/data/types'

export type PreferencesPanelTab = 'schedule' | 'recipes'

export type RecipeIngredientDraft = {
  name: string
  quantity: string
  unit: IngredientUnit | ''
}

export const PLANNING_SCOPE_OPTIONS: PlanningScope[] = [
  'lunch',
  'dinner',
  'both',
]

export const RECIPE_SLOT_OPTIONS: MealSlot[] = ['lunch', 'dinner']

export const INGREDIENT_UNITS: IngredientUnit[] = [
  'unit',
  'g',
  'kg',
  'ml',
  'l',
  'tbsp',
  'tsp',
  'can',
  'pack',
]

export const EMPTY_RECIPE_INGREDIENT: RecipeIngredientDraft = {
  name: '',
  quantity: '',
  unit: '',
}
