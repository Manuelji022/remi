import type { PlanningScope } from '#/features/weekly-menu/types'

export type PreferencesPanelTab = 'schedule' | 'recipes'

export const PLANNING_SCOPE_OPTIONS: PlanningScope[] = [
  'lunch',
  'dinner',
  'both',
]
