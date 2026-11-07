import '@tanstack/react-start/server-only'

import { z } from 'zod'
import {
  AiGenerationInProgressError,
  AiGenerationLimitError,
  runAiGenerationWithGuard,
} from '#/features/weekly-menu/ai-generation-guard'
import {
  aiMockScenarioSchema,
  isAiMockEnabled,
  mockEmptyMenu,
} from '#/features/weekly-menu/ai-mock'
import {
  MOCK_DECISION_SEED,
  mockDecisionFetch,
} from '#/features/weekly-menu/ai-mock-decision'
import { prepareWeeklyMenuDecision } from '#/features/weekly-menu/menu-decision'
import {
  AiGenerationStaleWeekError,
  loadAiMenuContextForUser,
} from '#/features/weekly-menu/ai-generation-store'
import {
  calendarTimeZoneSchema,
  getStaleTargetWeekStart,
  nextCalendarWeekStart,
  targetWeekScheduleSchema,
} from '#/features/weekly-menu/ai-schedule'
import {
  calendarWeekSchema,
  weekStartSchema,
} from '#/features/weekly-menu/week'

export const generateNextWeeklyMenuInputSchema = z.object({
  targetWeekStart: weekStartSchema,
  timeZone: calendarTimeZoneSchema,
  schedule: targetWeekScheduleSchema,
  mockScenario: aiMockScenarioSchema.optional(),
  previousMenu: calendarWeekSchema.optional(),
})

export type GenerateNextWeeklyMenuInput = z.infer<
  typeof generateNextWeeklyMenuInputSchema
>

type MockScenario = GenerateNextWeeklyMenuInput['mockScenario']

async function mockShortCircuit(scenario: MockScenario, timeZone: string) {
  if (scenario === 'error') {
    await new Promise((resolve) => setTimeout(resolve, 1_000))
    throw new Error('AI Weekly Menu generation failed')
  }
  if (scenario === 'rate-limited') {
    return { ok: false as const, reason: 'rate-limited' as const }
  }
  if (scenario === 'in-progress') {
    return { ok: false as const, reason: 'in-progress' as const }
  }
  if (scenario === 'stale') {
    return {
      ok: false as const,
      reason: 'stale-week' as const,
      expectedTargetWeekStart: nextCalendarWeekStart(new Date(), timeZone),
    }
  }
  return undefined
}

function assertCurrentTarget(targetWeekStart: string, timeZone: string) {
  const expectedTargetWeekStart = getStaleTargetWeekStart(
    targetWeekStart,
    timeZone,
  )
  if (expectedTargetWeekStart) {
    throw new AiGenerationStaleWeekError(expectedTargetWeekStart)
  }
}

function selectGenerator(
  context: Awaited<ReturnType<typeof loadAiMenuContextForUser>>,
  scenario: MockScenario,
) {
  const mockEnabled = isAiMockEnabled()
  if (mockEnabled && scenario === 'empty') {
    return () => Promise.resolve(mockEmptyMenu(context))
  }
  return prepareWeeklyMenuDecision(
    context,
    mockEnabled
      ? {
          apiKey: 'mock-not-a-key',
          fetch: mockDecisionFetch(
            scenario === 'slow' || scenario === 'decision-invalid'
              ? scenario
              : 'ok',
          ),
          seed: MOCK_DECISION_SEED,
        }
      : {},
  ).generate
}

function toGenerationFailure(error: unknown) {
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

export async function generateNextWeeklyMenuForUser(
  userId: string,
  input: GenerateNextWeeklyMenuInput,
) {
  const scenario = isAiMockEnabled() ? input.mockScenario : undefined
  const shortCircuit = await mockShortCircuit(scenario, input.timeZone)
  if (shortCircuit) return shortCircuit

  try {
    assertCurrentTarget(input.targetWeekStart, input.timeZone)

    // Context reads stay outside the 60-second lease: only the bounded
    // provider call may run while it is held.
    const context = await loadAiMenuContextForUser(
      userId,
      input.targetWeekStart,
      input.schedule,
    )
    if (input.previousMenu?.weekStart === input.targetWeekStart) {
      context.previousProposal = input.previousMenu
    }

    const generated = await runAiGenerationWithGuard(
      userId,
      selectGenerator(context, scenario),
    )
    assertCurrentTarget(input.targetWeekStart, input.timeZone)
    return { ok: true as const, ...generated }
  } catch (error) {
    return toGenerationFailure(error)
  }
}
