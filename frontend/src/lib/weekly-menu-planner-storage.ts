import { DAYS } from '#/data/constants'
import type { Day } from '#/data/constants'
import type {
  ChecklistState,
  CustomRecipe,
  CustomRecipeIngredient,
  DayContext,
  IngredientUnit,
  PlanningScope,
  Preferences,
} from '#/data/types'

export const WEEKLY_MENU_PLANNER_STORAGE_KEY = 'remi:weekly-menu-planner:state'

const DAY_CONTEXTS = [
  'office',
  'eatOut',
] as const satisfies readonly DayContext[]
const MEAL_SLOTS = ['lunch', 'dinner'] as const
const PLANNING_SCOPES = [
  'lunch',
  'dinner',
  'both',
] as const satisfies readonly PlanningScope[]
const INGREDIENT_UNITS = [
  'unit',
  'g',
  'kg',
  'ml',
  'l',
  'tbsp',
  'tsp',
  'can',
  'pack',
] as const satisfies readonly IngredientUnit[]

export interface WeeklyMenuPlannerStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export interface WeeklyMenuPlannerPersistedState {
  savedPreferences: Preferences
  currentMenuIndex: number
  shoppingChecklist: ChecklistState
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
  menuCount: number,
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
    return parsePersistedState(JSON.parse(raw), menuCount)
  } catch {
    return null
  }
}

export function writeWeeklyMenuPlannerState(
  storage: WeeklyMenuPlannerStorage | null,
  state: WeeklyMenuPlannerPersistedState,
): void {
  if (!storage) return

  try {
    storage.setItem(WEEKLY_MENU_PLANNER_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore quota and privacy-mode failures. The planner still works in memory.
  }
}

export function mergeChecklistWithMenu(
  menuChecklist: ChecklistState,
  storedChecklist: ChecklistState,
): ChecklistState {
  const merged: ChecklistState = {}

  for (const [key, item] of Object.entries(menuChecklist)) {
    if (!Object.hasOwn(storedChecklist, key)) {
      merged[key] = { checked: item.checked, inFridge: item.inFridge }
      continue
    }

    const storedItem = storedChecklist[key]
    merged[key] = {
      checked: storedItem.checked,
      inFridge: storedItem.inFridge,
    }
  }

  return merged
}

function parsePersistedState(
  value: unknown,
  menuCount: number,
): WeeklyMenuPlannerPersistedState | null {
  if (!isRecord(value)) return null

  const savedPreferences = parsePreferences(value.savedPreferences)
  const currentMenuIndex = parseMenuIndex(value.currentMenuIndex, menuCount)
  const shoppingChecklist = parseChecklist(value.shoppingChecklist)

  if (!savedPreferences || currentMenuIndex === null || !shoppingChecklist) {
    return null
  }

  return { savedPreferences, currentMenuIndex, shoppingChecklist }
}

function parsePreferences(value: unknown): Preferences | null {
  if (!isRecord(value)) return null
  if (!isRecord(value.dayContexts) || !isRecord(value.planningScopes))
    return null
  if (!Array.isArray(value.customRecipes)) return null

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

  const customRecipes: CustomRecipe[] = []

  for (const recipe of value.customRecipes) {
    const parsedRecipe = parseRecipe(recipe)
    if (!parsedRecipe) return null
    customRecipes.push(parsedRecipe)
  }

  return { dayContexts, planningScopes, customRecipes }
}

function parseRecipe(value: unknown): CustomRecipe | null {
  if (!isRecord(value) || typeof value.name !== 'string') return null
  if (!isOneOf(value.slot, MEAL_SLOTS)) return null
  if (!Array.isArray(value.ingredients)) return null

  const ingredients: CustomRecipeIngredient[] = []

  for (const ingredient of value.ingredients) {
    const parsedIngredient = parseIngredient(ingredient)
    if (!parsedIngredient) return null
    ingredients.push(parsedIngredient)
  }

  return { name: value.name, slot: value.slot, ingredients }
}

function parseIngredient(value: unknown): CustomRecipeIngredient | null {
  if (!isRecord(value) || typeof value.name !== 'string') return null

  const ingredient: CustomRecipeIngredient = { name: value.name }

  if ('quantity' in value && value.quantity !== undefined) {
    if (
      typeof value.quantity !== 'number' ||
      !Number.isFinite(value.quantity)
    ) {
      return null
    }
    ingredient.quantity = value.quantity
  }

  if ('unit' in value && value.unit !== undefined) {
    if (!isOneOf(value.unit, INGREDIENT_UNITS)) return null
    ingredient.unit = value.unit
  }

  return ingredient
}

function parseMenuIndex(value: unknown, menuCount: number): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null
  if (value < -1 || value >= menuCount) return null
  return value
}

function parseChecklist(value: unknown): ChecklistState | null {
  if (!isRecord(value)) return null

  const checklist: ChecklistState = {}

  for (const [key, item] of Object.entries(value)) {
    if (!isRecord(item)) return null
    if (
      typeof item.checked !== 'boolean' ||
      typeof item.inFridge !== 'boolean'
    ) {
      return null
    }

    checklist[key] = { checked: item.checked, inFridge: item.inFridge }
  }

  return checklist
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
