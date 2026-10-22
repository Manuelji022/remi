import { z } from 'zod'
import { preferencesSchema } from '#/features/weekly-menu/types'
import type { Preferences } from '#/features/weekly-menu/types'
import { readRecipeInput } from '#/features/recipes/recipe'
import type { RecipeInput } from '#/features/recipes/recipe'

export const WEEKLY_MENU_PLANNER_STORAGE_KEY = 'remi:weekly-menu-planner:state'

const persistedPreferencesSchema = preferencesSchema.extend({
  customRecipes: z.array(z.unknown()).optional(),
})

export interface WeeklyMenuPlannerStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export interface WeeklyMenuPlannerPersistedState {
  savedPreferences: Preferences
  legacyCustomRecipes: RecipeInput[]
}

export function getBrowserStorage(): WeeklyMenuPlannerStorage | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readWeeklyMenuPlannerState(
  storage: WeeklyMenuPlannerStorage | null,
): WeeklyMenuPlannerPersistedState | null {
  if (!storage) return null

  let raw: string | null

  try {
    raw = storage.getItem(WEEKLY_MENU_PLANNER_STORAGE_KEY)
  } catch {
    return null
  }

  if (!raw) return null

  try {
    return parsePersistedState(JSON.parse(raw))
  } catch {
    return null
  }
}

export function writeWeeklyMenuPlannerState(
  storage: WeeklyMenuPlannerStorage | null,
  state: WeeklyMenuPlannerPersistedState,
): void {
  if (!storage) return

  const savedPreferences =
    state.legacyCustomRecipes.length > 0
      ? {
          ...state.savedPreferences,
          customRecipes: state.legacyCustomRecipes.map(toStoredRecipe),
        }
      : state.savedPreferences

  try {
    storage.setItem(
      WEEKLY_MENU_PLANNER_STORAGE_KEY,
      JSON.stringify({
        savedPreferences,
      }),
    )
  } catch {
    return
  }
}

function parsePersistedState(
  value: unknown,
): WeeklyMenuPlannerPersistedState | null {
  const state = z
    .object({ savedPreferences: persistedPreferencesSchema })
    .safeParse(value)
  if (!state.success) return null

  const { dayContexts, planningScopes, customRecipes } =
    state.data.savedPreferences
  const legacyCustomRecipes: RecipeInput[] = []
  for (const recipe of customRecipes ?? []) {
    const parsed = readRecipeInput(recipe)
    if (!parsed.ok) return null
    legacyCustomRecipes.push(parsed.value)
  }

  return {
    savedPreferences: { dayContexts, planningScopes },
    legacyCustomRecipes,
  }
}

function toStoredRecipe(recipe: RecipeInput) {
  return {
    name: recipe.name,
    slot: recipe.slot,
    ingredients: recipe.ingredients.map((ingredient) => ({
      name: ingredient.name,
      ...(ingredient.quantity === null
        ? {}
        : { quantity: ingredient.quantity }),
      ...(ingredient.unit === null ? {} : { unit: ingredient.unit }),
    })),
  }
}
