import type { IngredientUnit, PlanningScope } from '#/data/types'

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

export const EMPTY_RECIPE_INGREDIENT: RecipeIngredientDraft = {
  name: '',
  quantity: '',
  unit: '',
}
