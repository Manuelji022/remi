import { describe, expect, it, vi } from 'vitest'
import type { createGateway } from 'ai'
import { emptyMenu } from '#/features/weekly-menu/week'
import type { CalendarWeekMenu } from '#/features/weekly-menu/week'
import type { TargetWeekSchedule } from '#/features/weekly-menu/ai-schedule'
import type { Recipe } from '#/features/recipes/recipe'
import {
  generateAiMenu,
  validateAiMenuAssignments,
} from '#/features/weekly-menu/ai-generator'

const targetWeekStart = '2026-10-05'
const schedule: TargetWeekSchedule = Object.fromEntries(
  [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ].map((day) => [day, { context: null, scope: 'both' }]),
) as TargetWeekSchedule

function history(weekStart: string): CalendarWeekMenu {
  const menu = emptyMenu(weekStart)
  menu.days.Monday.dinnerRecipeId = 'dinner-one'
  menu.days.Sunday.lunchRecipeId = 'lunch-one'
  return menu
}

const recipes: Recipe[] = [
  {
    id: 'lunch-one',
    name: 'Chickpea pasta',
    slot: 'lunch',
    ingredients: [
      {
        id: 'ingredient-1',
        name: 'Chickpeas',
        quantity: 200,
        unit: 'g',
        position: 0,
      },
    ],
  },
  {
    id: 'dinner-one',
    name: 'Roasted vegetables',
    slot: 'dinner',
    ingredients: [
      {
        id: 'ingredient-2',
        name: 'Carrots',
        quantity: 3,
        unit: 'unit',
        position: 0,
      },
    ],
  },
]

const context = {
  targetWeekStart,
  schedule,
  recipes,
  currentWeek: history('2026-09-28'),
  previousWeek: history('2026-09-21'),
}

function assignments(
  weekStart = targetWeekStart,
  lunchRecipeId: string | null = 'lunch-one',
  dinnerRecipeId: string | null = 'dinner-one',
) {
  return {
    weekStart,
    days: Object.fromEntries(
      Object.keys(schedule).map((day) => [
        day,
        { lunchRecipeId, dinnerRecipeId },
      ]),
    ),
  }
}

type GatewayModel = ReturnType<
  ReturnType<typeof createGateway>['languageModel']
>
type GatewayGenerateResult = Awaited<ReturnType<GatewayModel['doGenerate']>>

function gatewayResponse(output: unknown): Response {
  const result = {
    content: [{ type: 'text', text: JSON.stringify(output) }],
    finishReason: { unified: 'stop', raw: 'stop' },
    usage: {
      inputTokens: { total: 12, noCache: 12, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 24, text: 24, reasoning: 0 },
    },
    warnings: [],
  } satisfies GatewayGenerateResult

  return new Response(JSON.stringify(result), {
    headers: { 'content-type': 'application/json' },
  })
}

describe('AI Weekly Menu assignment validation', () => {
  it('validates full target assignments and permits repeated owned recipe IDs', () => {
    const result = validateAiMenuAssignments(context, assignments())

    expect(result.menu.weekStart).toBe(targetWeekStart)
    expect(result.menu.days.Monday.lunchRecipeId).toBe('lunch-one')
    expect(result.menu.days.Monday.dinnerRecipeId).toBe('dinner-one')
    expect(result.menu.days.Sunday.lunchRecipeId).toBe('lunch-one')
    expect(result.menu.days.Sunday.dinnerRecipeId).toBe('dinner-one')
  })

  it('rejects wrong target dates and repairs invalid or missing eligible assignments', () => {
    expect(() =>
      validateAiMenuAssignments(context, assignments('2026-10-12')),
    ).toThrow('AI returned the wrong Calendar Week')

    const invalid = assignments()
    invalid.days.Monday.dinnerRecipeId = 'another-users-recipe'
    invalid.days.Tuesday.lunchRecipeId = 'dinner-one'
    invalid.days.Wednesday.dinnerRecipeId = null

    const result = validateAiMenuAssignments(context, invalid)
    expect(result.menu.days.Monday.dinnerRecipeId).toBe('dinner-one')
    expect(result.menu.days.Tuesday.lunchRecipeId).toBe('lunch-one')
    expect(result.menu.days.Wednesday.dinnerRecipeId).toBe('dinner-one')
  })

  it('leaves unavailable types empty and reports the exact shortage types', () => {
    const noRecipes = { ...context, recipes: [] }
    const output = assignments(targetWeekStart, null, null)
    const result = validateAiMenuAssignments(noRecipes, output)

    expect(result.menu.days.Monday.lunchRecipeId).toBeNull()
    expect(result.menu.days.Monday.dinnerRecipeId).toBeNull()
    expect(result.unavailableSlots).toEqual(['lunch', 'dinner'])
  })

  it('uses AI Gateway transport, native key auth, configured model ID, and structured output', async () => {
    const output = assignments()
    let requestBody = ''
    const transport = vi.fn<typeof fetch>(async (input, init) => {
      requestBody = String(init?.body ?? '')
      expect(String(input)).toBe(
        'https://ai-gateway.vercel.sh/v4/ai/language-model',
      )
      const headers = new Headers(init?.headers)
      expect(headers.get('ai-language-model-id')).toBe('openai/gpt-4o-mini')
      expect(headers.get('Authorization')).toBe('Bearer gateway-test-key')
      expect(headers.get('Authorization')).not.toContain('openai-test-key')
      return gatewayResponse(output)
    })

    vi.stubEnv('AI_GATEWAY_API_KEY', 'gateway-test-key')
    vi.stubEnv('OPENAI_API_KEY', 'openai-test-key')
    try {
      const result = await generateAiMenu(context, {
        model: 'openai/gpt-4o-mini',
        fetch: transport,
      })

      expect(result.menu.days.Monday.lunchRecipeId).toBe('lunch-one')
      expect(transport).toHaveBeenCalledTimes(1)
      expect(requestBody).toContain('Chickpea pasta')
      expect(requestBody).toContain('Chickpeas')
      expect(requestBody).toContain('lunch-one')
      expect(requestBody).toContain('2026-09-21')
      expect(requestBody).toContain('2026-09-28')
      expect(requestBody).not.toContain('userId')
      expect(requestBody).not.toContain('OPENAI_API_KEY')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('business-validates structured Gateway output before returning assignments', async () => {
    const transport = vi.fn<typeof fetch>(async () =>
      gatewayResponse(assignments('2026-10-12')),
    )

    await expect(
      generateAiMenu(context, {
        apiKey: 'gateway-test-key',
        model: 'openai/gpt-4o-mini',
        fetch: transport,
      }),
    ).rejects.toThrow('AI returned the wrong Calendar Week')
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it('does not retry AI Gateway transport failures', async () => {
    const transport = vi.fn<typeof fetch>(async (input, init) => {
      expect(String(input)).toBe(
        'https://ai-gateway.vercel.sh/v4/ai/language-model',
      )
      expect(new Headers(init?.headers).get('Authorization')).toBe(
        'Bearer gateway-test-key',
      )
      return new Response('provider error', { status: 503 })
    })

    await expect(
      generateAiMenu(context, {
        apiKey: 'gateway-test-key',
        model: 'openai/gpt-4o-mini',
        fetch: transport,
      }),
    ).rejects.toThrow()
    expect(transport).toHaveBeenCalledTimes(1)
  })
})
