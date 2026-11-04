import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '#/features/auth/auth'
import {
  loadMenuWeekForUser,
  saveMenuWeekForUser,
} from '#/features/weekly-menu/store'
import {
  calendarWeekSchema,
  parseCalendarWeek,
  weekStartSchema,
} from '#/features/weekly-menu/week'
import {
  AiGenerationInProgressError,
  AiGenerationLimitError,
  runAiGenerationWithGuard,
} from '#/features/weekly-menu/ai-generation-guard'
import {
  aiMockScenarioSchema,
  isAiMockEnabled,
  handleMockScenario,
} from '#/features/weekly-menu/ai-mock'
import { generateAiMenu } from '#/features/weekly-menu/ai-generator'
import {
  AiGenerationStaleWeekError,
  loadAiMenuContextForUser,
} from '#/features/weekly-menu/ai-generation-store'
import {
  calendarTimeZoneSchema,
  getStaleTargetWeekStart,
  targetWeekScheduleSchema,
} from '#/features/weekly-menu/ai-schedule'

export const loadWeeklyMenu = createServerFn({ method: 'GET' })
  .validator(z.object({ weekStart: weekStartSchema }))
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    return loadMenuWeekForUser(userId, data.weekStart)
  })

export const saveWeeklyMenu = createServerFn({ method: 'POST' })
  .validator(parseCalendarWeek)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    return saveMenuWeekForUser(userId, data)
  })

export const generateNextWeeklyMenu = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      targetWeekStart: weekStartSchema,
      timeZone: calendarTimeZoneSchema,
      schedule: targetWeekScheduleSchema,
      mockScenario: aiMockScenarioSchema.optional(),
      previousMenu: calendarWeekSchema.optional(),
    }),
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const mockScenario = isAiMockEnabled() ? data.mockScenario : undefined
    try {
      // Handle mock scenarios for development/testing
      const mockResponse = handleMockScenario(mockScenario, data.timeZone)
      if (mockResponse) return mockResponse as any

      // Handle 'error' mock scenario with delay
      if (mockScenario === 'error') {
        await new Promise((resolve) => setTimeout(resolve, 1_000))
        throw new Error('AI Weekly Menu generation failed')
      }

      const staleTargetWeekStart = getStaleTargetWeekStart(
        data.targetWeekStart,
        data.timeZone,
      )
      if (staleTargetWeekStart) {
        throw new AiGenerationStaleWeekError(staleTargetWeekStart)
      }

      // Context reads stay outside the 60-second lease: only the bounded
      // provider call may run while it is held.
      const context = await loadAiMenuContextForUser(
        userId,
        data.targetWeekStart,
        data.schedule,
      )
      if (data.previousMenu?.weekStart === data.targetWeekStart) {
        context.previousProposal = data.previousMenu
      }
      const generated = await runAiGenerationWithGuard(userId, () =>
        generateAiMenu(context, { mockScenario }),
      )
      const staleAfterGeneration = getStaleTargetWeekStart(
        data.targetWeekStart,
        data.timeZone,
      )
      if (staleAfterGeneration) {
        throw new AiGenerationStaleWeekError(staleAfterGeneration)
      }
      return { ok: true as const, ...generated }
    } catch (error) {
      if (error instanceof AiGenerationLimitError) {
        return { ok: false as const, reason: 'rate-limited' as const }
      }
      if (error instanceof AiGenerationInProgressError) {
        return { ok: false as const, reason: 'in-progress' as const }
      }
      if (error instanceof AiGenerationStaleWeekError) {
        return {
          ok: false as const,
          reason: 'stale-week' as const,
          expectedTargetWeekStart: error.expectedTargetWeekStart,
        }
      }
      throw error
    }
  })

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({
    headers: getRequest().headers,
  })
  if (!session?.user.id) throw new Error('Unauthorized')
  return session.user.id
}
