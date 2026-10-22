import { z } from 'zod'
import { DAYS } from './constants'
import { mealSlotSchema } from '#/features/recipes/recipe'

export const planningScopeSchema = z.union([mealSlotSchema, z.literal('both')])
export const dayContextSchema = z.enum(['office', 'eatOut'])
export const preferencesSchema = z.object({
  dayContexts: z.partialRecord(z.enum(DAYS), dayContextSchema.nullable()),
  planningScopes: z.partialRecord(z.enum(DAYS), planningScopeSchema.nullable()),
})

export type PlanningScope = z.infer<typeof planningScopeSchema>
export type DayContext = z.infer<typeof dayContextSchema>
export type Preferences = z.infer<typeof preferencesSchema>

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
