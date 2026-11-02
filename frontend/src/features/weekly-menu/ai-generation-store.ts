import { shiftWeekStart } from '#/features/weekly-menu/week'
import type { AiMenuContext } from '#/features/weekly-menu/ai-generator'
import { listRecipesForUser } from '#/features/recipes/store'
import { loadMenuWeekForUser } from '#/features/weekly-menu/store'
import type { TargetWeekSchedule } from '#/features/weekly-menu/ai-schedule'

export class AiGenerationStaleWeekError extends Error {
  constructor(readonly expectedTargetWeekStart: string) {
    super('AI generation target Calendar Week is stale')
    this.name = 'AiGenerationStaleWeekError'
  }
}

export async function loadAiMenuContextForUser(
  userId: string,
  targetWeekStart: string,
  schedule: TargetWeekSchedule,
): Promise<AiMenuContext> {
  const currentWeekStart = shiftWeekStart(targetWeekStart, -1)
  const previousWeekStart = shiftWeekStart(currentWeekStart, -1)
  const [recipes, currentWeek, previousWeek] = await Promise.all([
    listRecipesForUser(userId),
    loadMenuWeekForUser(userId, currentWeekStart),
    loadMenuWeekForUser(userId, previousWeekStart),
  ])

  return {
    targetWeekStart,
    schedule,
    recipes,
    currentWeek: currentWeek.menu,
    previousWeek: previousWeek.menu,
  }
}
