import type { DayContext, PlanningScope } from '#/features/weekly-menu/types'

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
  const blockedScopes = getBlockedPlanningScopes(dayContext)

  return blockedScopes.includes(currentScope) ? 'dinner' : currentScope
}
