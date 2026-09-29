import type { Day } from './constants'

export type MealSlot = 'lunch' | 'dinner'
export type PlanningScope = MealSlot | 'both'
export type DayContext = 'office' | 'eatOut'
export type IngredientUnit =
  | 'unit'
  | 'g'
  | 'kg'
  | 'ml'
  | 'l'
  | 'tbsp'
  | 'tsp'
  | 'can'
  | 'pack'

export interface Preferences {
  dayContexts: Partial<Record<Day, DayContext | null>>
  planningScopes: Partial<Record<Day, PlanningScope | null>>
}

export function getDefaultPreferences(): Preferences {
  return {
    dayContexts: {},
    planningScopes: {},
  }
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

  return dayContextCount + scopedDayCount
}

export type SavedPrefs = Preferences
export const DEFAULT_PREFS = getDefaultPreferences()
