import { z } from 'zod'
import type {
  AiMenuContext,
  AiMenuResult,
} from '#/features/weekly-menu/ai-generator'
import { menuForTargetSchedule } from '#/features/weekly-menu/ai-schedule'

export const aiMockScenarioSchema = z.enum([
  'ok',
  'slow',
  'error',
  'rate-limited',
  'in-progress',
  'stale',
  'empty',
  'decision-invalid',
])

export function isAiMockEnabled(): boolean {
  return (
    process.env.AI_WEEKLY_MENU_MOCK === 'true' &&
    process.env.NODE_ENV !== 'production'
  )
}

export function mockEmptyMenu(context: AiMenuContext): AiMenuResult {
  return {
    menu: menuForTargetSchedule(context.targetWeekStart, context.schedule),
    recipeNames: Object.fromEntries(
      context.recipes.map(({ id, name }) => [id, name]),
    ),
    unavailableSlots: ['lunch', 'dinner'],
  }
}
