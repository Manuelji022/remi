import type { Day } from './constants'

export type MealSlot = 'lunch' | 'dinner'
export type PlanningScope = MealSlot | 'both'
export type DayContext = 'office' | 'eatOut'

export interface Meal {
  name: string
  description: string
}

export interface DayMeals {
  lunch: Meal
  dinner: Meal
}

export type WeeklyMenu = Record<Day, DayMeals>

export interface CustomRecipe {
  name: string
  ingredients: RecipeIngredient[]
  planningScope: PlanningScope
}

export interface RecipeIngredient {
  name: string
  quantity: string
}

export interface Preferences {
  dayContexts: Partial<Record<Day, DayContext | null>>
  planningScopes: Partial<Record<Day, PlanningScope | null>>
  customRecipes: CustomRecipe[]
}

export interface ChecklistItemState {
  checked: boolean
  inFridge: boolean
}

export type ChecklistState = Record<string, ChecklistItemState>

export function getDefaultPreferences(): Preferences {
  return {
    dayContexts: {},
    planningScopes: {},
    customRecipes: [],
  }
}

export function getPlanningScopeForDay(
  preferences: Preferences,
  day: Day,
): PlanningScope {
  return preferences.planningScopes[day] ?? 'both'
}

export function getDayContextForDay(
  preferences: Preferences,
  day: Day,
): DayContext | null {
  return preferences.dayContexts[day] ?? null
}

export function getActivePreferencesBadgeCount(
  preferences: Preferences,
): number {
  const dayContextCount = Object.values(preferences.dayContexts).filter(
    Boolean,
  ).length
  const scopedDayCount = Object.values(preferences.planningScopes).filter(
    (scope) => scope != null && scope !== 'both',
  ).length

  return dayContextCount + scopedDayCount + preferences.customRecipes.length
}

export type SavedPrefs = Preferences
export const DEFAULT_PREFS = getDefaultPreferences()
