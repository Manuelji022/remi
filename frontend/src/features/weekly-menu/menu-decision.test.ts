import { afterEach, describe, expect, it, vi } from 'vitest'
import { DAYS } from '#/features/weekly-menu/constants'
import { emptyMenu, placedRecipeIds } from '#/features/weekly-menu/week'
import { buildWeeklyMenuCandidates } from '#/features/weekly-menu/menu-candidates'
import type { AiMenuContext } from '#/features/weekly-menu/ai-generator'
import {
  prepareWeeklyMenuDecision,
  weeklyMenuEngine,
} from '#/features/weekly-menu/menu-decision'

function context(): AiMenuContext {
  return {
    targetWeekStart: '2026-11-09',
    schedule: Object.fromEntries(
      DAYS.map((day) => [day, { context: null, scope: 'both' }]),
    ) as AiMenuContext['schedule'],
    recipes: ['lunch', 'dinner'].flatMap((slot) =>
      Array.from({ length: 12 }, (_, i) => ({
        id: `${slot}-${i}`,
        name: `Recipe ${slot} ${i}`,
        slot: slot as 'lunch' | 'dinner',
        ingredients: [
          {
            id: 'private-ingredient-id',
            name: 'Known ingredient',
            position: 0,
            quantity: 3,
            unit: 'g',
          },
        ],
      })),
    ),
    currentWeek: emptyMenu('2026-11-02'),
    previousWeek: emptyMenu('2026-10-26'),
  }
}
function response(answer: unknown = { type: 'choice', choice: 'menu-1' }) {
  return Response.json({ answers: { selectedMenu: answer } })
}
const options = { apiKey: 'synthetic-gateway-key', seed: 17 }
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('Decisions real SDK transport', () => {
  it.each(['absent', 'schedule-only', 'partial', 'complete'])(
    'selects exactly an existing non-first candidate with %s history',
    async (history) => {
      const input = context()
      if (history === 'schedule-only')
        input.currentWeek.days.Monday.scope = 'both'
      if (history === 'partial' || history === 'complete') {
        for (const day of history === 'partial'
          ? (['Sunday'] as const)
          : DAYS) {
          input.currentWeek.days[day].lunchRecipeId = 'lunch-0'
        }
        input.previousWeek.days.Tuesday.dinnerRecipeId = 'dinner-0'
      }
      input.schedule.Monday = { context: 'office', scope: 'both' }
      input.schedule.Sunday = { context: 'eatOut', scope: 'lunch' }
      input.previousProposal = buildWeeklyMenuCandidates(input, 1)[0]
      const candidates = buildWeeklyMenuCandidates(input, options.seed)
      expect(candidates.length).toBeGreaterThan(1)
      const transport = vi.fn<typeof fetch>(async (url, init) => {
        expect(String(url)).toBe(
          'https://ai-gateway.vercel.sh/v4/ai/decision-model',
        )
        const headers = new Headers(init?.headers)
        expect(headers.get('Authorization')).toBe(
          'Bearer synthetic-gateway-key',
        )
        expect(headers.get('ai-model-id')).toBe('openai/gpt-6-luna-decisions')
        const body = JSON.parse(String(init?.body))
        expect(Object.keys(body.questions)).toEqual(['selectedMenu'])
        const question = body.questions.selectedMenu
        expect(question.type).toBe('choice')
        expect(Object.keys(question.criteria)).toEqual(
          candidates.map((_, i) => `menu-${i}`),
        )
        expect(question.instructions).toMatch(/untrusted/)
        expect(question.instructions).toMatch(/clearly heavy/)
        expect(question.instructions).toMatch(/unknown/)
        const text = body.stateParts[0].text
        expect(text).toBe(JSON.stringify(JSON.parse(text)))
        const state = JSON.parse(text)
        const referenced = new Set(
          candidates.flatMap((menu) => [...placedRecipeIds(menu)]),
        )
        expect(state.recipes.map((r: { id: string }) => r.id).sort()).toEqual(
          [...referenced].sort(),
        )
        expect(state.currentWeek).toEqual(
          DAYS.map((day) => [
            input.currentWeek.days[day].lunchRecipeId,
            input.currentWeek.days[day].dinnerRecipeId,
          ]),
        )
        expect(state.previousWeek[1][1]).toBe(
          history === 'partial' || history === 'complete' ? 'dinner-0' : null,
        )
        expect(state.previousProposal).toBeDefined()
        expect(text).not.toMatch(
          /private-ingredient-id|quantity|userId|synthetic-gateway-key/,
        )
        expect(init?.signal).toBeInstanceOf(AbortSignal)
        return response()
      })
      const prepared = prepareWeeklyMenuDecision(input, {
        ...options,
        fetch: transport,
      })
      expect(transport).not.toHaveBeenCalled()
      const result = await prepared.generate()
      expect(result.menu).toEqual(candidates[1])
      expect(result.unavailableSlots).toEqual([])
      expect(result.menu.days.Monday.lunchRecipeId).toBeNull()
      expect(result.menu.days.Sunday.dinnerRecipeId).toBeNull()
      expect(transport).toHaveBeenCalledTimes(1)
    },
  )

  it.each([
    undefined,
    false,
    { type: 'refusal' },
    { type: 'choice', choice: 'invented' },
    { type: 'score', score: 1 },
  ])(
    'rejects malformed, refused and unknown selections (%j)',
    async (answer) => {
      const transport = vi.fn<typeof fetch>(async () =>
        Response.json({ answers: { selectedMenu: answer } }),
      )
      await expect(
        prepareWeeklyMenuDecision(context(), {
          ...options,
          fetch: transport,
        }).generate(),
      ).rejects.toThrow()
      expect(transport).toHaveBeenCalledTimes(1)
    },
  )
  it.each([401, 404, 429, 503])(
    'throws HTTP %i once for initial and regeneration',
    async (status) => {
      for (const regenerate of [false, true]) {
        const input = context()
        if (regenerate)
          input.previousProposal = buildWeeklyMenuCandidates(input, 9)[0]
        const original = structuredClone(input)
        const transport = vi.fn<typeof fetch>(
          async () => new Response('synthetic provider failure', { status }),
        )
        await expect(
          prepareWeeklyMenuDecision(input, {
            ...options,
            fetch: transport,
          }).generate(),
        ).rejects.toThrow('AI Weekly Menu generation failed')
        expect(input).toEqual(original)
        expect(transport).toHaveBeenCalledTimes(1)
      }
    },
  )
  it('sets one total 20-second abort budget without retries', async () => {
    const signal = AbortSignal.abort(new Error('synthetic deadline'))
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(signal)
    const transport = vi.fn<typeof fetch>(async () => {
      throw new Error('must not reach transport')
    })
    await expect(
      prepareWeeklyMenuDecision(context(), {
        ...options,
        fetch: transport,
      }).generate(),
    ).rejects.toThrow()
    expect(timeout).toHaveBeenCalledExactlyOnceWith(20_000)
    expect(transport).not.toHaveBeenCalled()
  })
  it('requires explicit server credentials and a provider/model ID before transport', () => {
    vi.stubEnv('AI_GATEWAY_API_KEY', '')
    expect(() => prepareWeeklyMenuDecision(context())).toThrow('configuration')
    for (const model of ['', 'bad', ' openai/model', 'openai/model\n']) {
      expect(() =>
        prepareWeeklyMenuDecision(context(), { ...options, model }),
      ).toThrow('configuration')
    }
  })
  it('honors the Decisions model variable independently of the legacy model', async () => {
    vi.stubEnv('AI_WEEKLY_MENU_MODEL', 'wrong/legacy')
    vi.stubEnv('AI_WEEKLY_MENU_DECISION_MODEL', 'test/decision')
    const transport = vi.fn<typeof fetch>(async (_, init) => {
      expect(new Headers(init?.headers).get('ai-model-id')).toBe(
        'test/decision',
      )
      return response()
    })
    await prepareWeeklyMenuDecision(context(), {
      ...options,
      fetch: transport,
    }).generate()
  })
  it('returns singleton and unavailable types locally without credentials or remote calls', async () => {
    const input = context()
    input.recipes = input.recipes.filter((r) => r.id === 'lunch-0')
    const transport = vi.fn<typeof fetch>()
    const singleton = prepareWeeklyMenuDecision(input, { fetch: transport })
    const result = await singleton.generate()
    expect(result.unavailableSlots).toEqual(['dinner'])
    expect(result.menu.days.Monday.lunchRecipeId).toBe('lunch-0')
    expect(transport).not.toHaveBeenCalled()
  })
  it('reduces oversized finalist state without truncating ingredients, then rejects an impossible budget', async () => {
    const input = context()
    for (const recipe of input.recipes)
      recipe.ingredients[0].name = 'x'.repeat(3500)
    const transport = vi.fn<typeof fetch>(async (_, init) => {
      const body = JSON.parse(String(init?.body))
      const text = body.stateParts[0].text
      expect(new TextEncoder().encode(text).length).toBeLessThanOrEqual(65536)
      expect(
        Object.keys(body.questions.selectedMenu.criteria).length,
      ).toBeLessThan(8)
      expect(
        JSON.parse(text).recipes.every(
          (r: { ingredients: string[] }) => r.ingredients[0].length === 3500,
        ),
      ).toBe(true)
      return response()
    })
    await prepareWeeklyMenuDecision(input, {
      ...options,
      fetch: transport,
    }).generate()
    for (const recipe of input.recipes)
      recipe.ingredients[0].name = 'x'.repeat(70000)
    expect(() => prepareWeeklyMenuDecision(input, options)).toThrow('state')
  })
  it('validates the engine with a legacy default', () => {
    vi.stubEnv('AI_WEEKLY_MENU_ENGINE', undefined)
    expect(weeklyMenuEngine()).toBe('legacy')
    for (const engine of ['legacy', 'decisions']) {
      vi.stubEnv('AI_WEEKLY_MENU_ENGINE', engine)
      expect(weeklyMenuEngine()).toBe(engine)
    }
    for (const engine of ['', 'DECISIONS', 'decisons']) {
      vi.stubEnv('AI_WEEKLY_MENU_ENGINE', engine)
      expect(() => weeklyMenuEngine()).toThrow('configuration')
    }
  })
})
