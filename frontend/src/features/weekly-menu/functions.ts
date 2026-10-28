import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '#/features/auth/auth'
import {
  loadMenuWeekForUser,
  saveMenuWeekForUser,
} from '#/features/weekly-menu/store'
import { parseCalendarWeek, weekStartSchema } from '#/features/weekly-menu/week'
import {
  AiGenerationInProgressError,
  AiGenerationLimitError,
  runAiGenerationWithGuard,
} from '#/features/weekly-menu/ai-generation-guard'
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
    }),
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const staleTargetWeekStart = getStaleTargetWeekStart(
      data.targetWeekStart,
      data.timeZone,
    )
    if (staleTargetWeekStart) return staleWeekResponse(staleTargetWeekStart)

    try {
      const context = await loadAiMenuContextForUser(
        userId,
        data.targetWeekStart,
        data.timeZone,
        data.schedule,
      )
      const generated = await runAiGenerationWithGuard(userId, async () => {
        const staleTarget = getStaleTargetWeekStart(
          data.targetWeekStart,
          data.timeZone,
        )
        if (staleTarget) throw new AiGenerationStaleWeekError(staleTarget)
        return generateAiMenu(context)
      })
      const staleAfterGeneration = getStaleTargetWeekStart(
        data.targetWeekStart,
        data.timeZone,
      )
      if (staleAfterGeneration) return staleWeekResponse(staleAfterGeneration)
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

function staleWeekResponse(expectedTargetWeekStart: string) {
  return {
    ok: false as const,
    reason: 'stale-week' as const,
    expectedTargetWeekStart,
  }
}

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({
    headers: getRequest().headers,
  })
  if (!session?.user.id) throw new Error('Unauthorized')
  return session.user.id
}
