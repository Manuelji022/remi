import { z } from 'zod'

export const aiMockScenarioSchema = z.enum([
  'ok',
  'slow',
  'error',
  'rate-limited',
  'in-progress',
  'stale',
  'empty',
])

export function isAiMockEnabled(): boolean {
  return (
    process.env.AI_WEEKLY_MENU_MOCK === 'true' &&
    process.env.NODE_ENV !== 'production'
  )
}
