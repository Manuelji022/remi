import { z } from 'zod'
import { nextCalendarWeekStart } from './ai-schedule'

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

/**
 * Handle mock scenario requests in development/test environments.
 * Returns a mocked response if applicable, otherwise null to continue normal flow.
 */
export function handleMockScenario(
  scenario: z.infer<typeof aiMockScenarioSchema> | undefined,
  timeZone: string,
): { ok: false; reason: string; expectedTargetWeekStart?: string } | null {
  if (!scenario) return null

  if (scenario === 'error') {
    // Will be thrown in try-catch after delay
    return null
  }
  if (scenario === 'rate-limited') {
    return { ok: false, reason: 'rate-limited' }
  }
  if (scenario === 'in-progress') {
    return { ok: false, reason: 'in-progress' }
  }
  if (scenario === 'stale') {
    return {
      ok: false,
      reason: 'stale-week',
      expectedTargetWeekStart: nextCalendarWeekStart(new Date(), timeZone),
    }
  }

  return null
}
