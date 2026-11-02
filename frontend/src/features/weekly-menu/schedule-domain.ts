import type { Day } from './constants'
import type { DayContext, PlanningScope, Preferences } from './types'

export type SchedulePreferences = Pick<
  Preferences,
  'dayContexts' | 'planningScopes'
>

export type ScheduleDayContextChange = (day: Day, context: DayContext) => void
export type SchedulePlanningScopeChange = (
  day: Day,
  scope: PlanningScope,
) => void

export function getBlockedPlanningScopes(
  dayContext: DayContext | null,
): ReadonlyArray<PlanningScope> {
  if (dayContext === 'office') return ['lunch', 'both']
  if (dayContext === 'eatOut') return ['both']
  return []
}

export function getPlanningScopeForContext(
  dayContext: DayContext | null,
  currentScope: PlanningScope,
): PlanningScope {
  return getBlockedPlanningScopes(dayContext).includes(currentScope)
    ? 'dinner'
    : currentScope
}

export function updateScheduleDayContext(
  preferences: SchedulePreferences,
  day: Day,
  context: DayContext,
): SchedulePreferences {
  const dayContexts = { ...preferences.dayContexts }
  const nextContext = preferences.dayContexts[day] === context ? null : context
  if (nextContext) dayContexts[day] = nextContext
  else delete dayContexts[day]
  return {
    ...preferences,
    dayContexts,
    planningScopes: {
      ...preferences.planningScopes,
      [day]: getPlanningScopeForContext(
        nextContext,
        preferences.planningScopes[day] ?? 'both',
      ),
    },
  }
}

export function updateSchedulePlanningScope(
  preferences: SchedulePreferences,
  day: Day,
  scope: PlanningScope,
): SchedulePreferences {
  if (
    (preferences.planningScopes[day] ?? 'both') === scope ||
    getBlockedPlanningScopes(preferences.dayContexts[day] ?? null).includes(
      scope,
    )
  )
    return preferences
  return {
    ...preferences,
    planningScopes: { ...preferences.planningScopes, [day]: scope },
  }
}
