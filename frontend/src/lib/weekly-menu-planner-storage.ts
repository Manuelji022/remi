import { DAYS } from '#/data/constants'
import type { Day } from '#/data/constants'
import type { DayContext, PlanningScope, Preferences } from '#/data/types'
import { readRecipeInput } from '#/recipes/recipe'
import type { RecipeInput } from '#/recipes/recipe'

export const WEEKLY_MENU_PLANNER_STORAGE_KEY = 'remi:weekly-menu-planner:state'

const DAY_CONTEXTS = [
  'office',
  'eatOut',
] as const satisfies readonly DayContext[]
const PLANNING_SCOPES = [
  'lunch',
  'dinner',
  'both',
] as const satisfies readonly PlanningScope[]

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
  if (!isRecord(value)) return null

  const parsedPreferences = parsePreferences(value.savedPreferences)
  if (!parsedPreferences) return null

  return {
    savedPreferences: parsedPreferences.preferences,
    legacyCustomRecipes: parsedPreferences.legacyCustomRecipes,
  }
}

function parsePreferences(value: unknown): {
  preferences: Preferences
  legacyCustomRecipes: RecipeInput[]
} | null {
  if (!isRecord(value)) return null
  if (!isRecord(value.dayContexts) || !isRecord(value.planningScopes))
    return null

  const dayContexts: Preferences['dayContexts'] = {}

  for (const [day, context] of Object.entries(value.dayContexts)) {
    if (!isDay(day) || !isNullable(context, DAY_CONTEXTS)) return null
    dayContexts[day] = context
  }

  const planningScopes: Preferences['planningScopes'] = {}

  for (const [day, scope] of Object.entries(value.planningScopes)) {
    if (!isDay(day) || !isNullable(scope, PLANNING_SCOPES)) return null
    planningScopes[day] = scope
  }

  if (!('customRecipes' in value)) {
    return {
      preferences: { dayContexts, planningScopes },
      legacyCustomRecipes: [],
    }
  }

  if (!Array.isArray(value.customRecipes)) return null

  const legacyCustomRecipes: RecipeInput[] = []

  for (const recipe of value.customRecipes) {
    const parsedRecipe = readRecipeInput(recipe)
    if (!parsedRecipe.ok) return null
    legacyCustomRecipes.push(parsedRecipe.value)
  }

  return {
    preferences: { dayContexts, planningScopes },
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDay(value: string): value is Day {
  return (DAYS as readonly string[]).includes(value)
}

function isOneOf<T extends string>(
  value: unknown,
  options: readonly T[],
): value is T {
  return (
    typeof value === 'string' && (options as readonly string[]).includes(value)
  )
}

function isNullable<T extends string>(
  value: unknown,
  options: readonly T[],
): value is T | null {
  return value === null || isOneOf(value, options)
}
