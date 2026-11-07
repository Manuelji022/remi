import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mockDecisionFetch } from '#/features/weekly-menu/ai-mock-decision'
import { DAYS } from '#/features/weekly-menu/constants'
import { emptyMenu } from '#/features/weekly-menu/week'
import { generateNextWeeklyMenu } from '#/features/weekly-menu/functions'
import { AiGenerationLimitError } from '#/features/weekly-menu/ai-generation-guard'
import type { AiMenuContext } from '#/features/weekly-menu/ai-generator'

const mock = vi.hoisted(() => ({
  requireSession: vi.fn(),
  setResponseStatus: vi.fn(),
  load: vi.fn(),
  guard: vi.fn(),
  stale: vi.fn(),
}))
vi.mock('@tanstack/react-start', () => ({
  createMiddleware: () => ({ server: (fn: unknown) => fn }),
  createServerFn: () => ({
    middleware: (
      middlewares: Array<
        (args: {
          next: (options: { context: { userId: string } }) => unknown
        }) => unknown
      >,
    ) => ({
      validator: () => ({
        handler:
          (fn: (args: { data: object; context: object }) => unknown) =>
          ({ data }: { data: object }) => {
            const run = (index: number, context: object): unknown => {
              if (index >= middlewares.length) return fn({ data, context })
              return middlewares[index]({
                next: (options) =>
                  run(index + 1, { ...context, ...options.context }),
              })
            }
            return run(0, {})
          },
      }),
    }),
  }),
}))
vi.mock('@tanstack/react-start/server', () => ({
  getRequest: () => ({ headers: new Headers() }),
  setResponseStatus: mock.setResponseStatus,
}))
vi.mock('#/features/auth/auth', () => ({
  auth: { api: { getSession: mock.requireSession } },
}))
vi.mock('#/features/weekly-menu/store', () => ({
  loadMenuWeekForUser: vi.fn(),
  saveMenuWeekForUser: vi.fn(),
}))
vi.mock('#/features/weekly-menu/ai-generation-store', () => ({
  loadAiMenuContextForUser: mock.load,
  AiGenerationStaleWeekError: class extends Error {
    constructor(readonly expectedTargetWeekStart: string) {
      super('stale')
    }
  },
}))
vi.mock('#/features/weekly-menu/ai-generation-guard', () => ({
  runAiGenerationWithGuard: mock.guard,
  AiGenerationLimitError: class extends Error {},
  AiGenerationInProgressError: class extends Error {},
}))
vi.mock('#/features/weekly-menu/ai-schedule', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getStaleTargetWeekStart: mock.stale,
}))

const invoke = generateNextWeeklyMenu as unknown as (args: {
  data: object
}) => Promise<{ ok: boolean; reason?: string }>
let context: AiMenuContext
let guardActive = false
beforeEach(() => {
  guardActive = false
  vi.resetAllMocks()
  vi.unstubAllEnvs()
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('Unexpected network')
    }),
  )
  vi.stubEnv('AI_WEEKLY_MENU_MOCK', 'false')
  vi.stubEnv('AI_GATEWAY_API_KEY', '')
  context = {
    targetWeekStart: '2026-11-09',
    schedule: Object.fromEntries(
      DAYS.map((day) => [day, { context: null, scope: 'both' }]),
    ) as AiMenuContext['schedule'],
    recipes: [{ id: 'lunch', name: 'Lunch', slot: 'lunch', ingredients: [] }],
    currentWeek: emptyMenu('2026-11-02'),
    previousWeek: emptyMenu('2026-10-26'),
  }
  mock.requireSession.mockResolvedValue({ user: { id: 'synthetic-user' } })
  mock.load.mockImplementation(() => {
    expect(guardActive).toBe(false)
    return context
  })
  mock.guard.mockImplementation(async (_, generate) => {
    expect(mock.load).toHaveBeenCalled()
    guardActive = true
    try {
      return await generate()
    } finally {
      guardActive = false
    }
  })
})
const addRecipe = () =>
  context.recipes.push({
    id: 'other',
    name: 'Other lunch',
    slot: 'lunch',
    ingredients: [],
  })
const run = () => invoke({ data: data() })
const stale = { ok: false, reason: 'stale-week' }
const data = () => ({
  targetWeekStart: context.targetWeekStart,
  timeZone: 'UTC',
  schedule: context.schedule,
})

it('guards a local singleton once with no credentials, and retains the post-generation stale check', async () => {
  expect((await run()).ok).toBe(true)
  expect(mock.guard).toHaveBeenCalledTimes(1)
  expect(mock.stale).toHaveBeenCalledTimes(2)
  mock.stale
    .mockReset()
    .mockReturnValueOnce(undefined)
    .mockReturnValueOnce('2026-11-16')
  expect(await run()).toMatchObject(stale)
})
it('does not convert auth, stale, database, configuration or guard errors into previews', async () => {
  mock.requireSession.mockResolvedValueOnce(null)
  await expect(run()).rejects.toThrow('Unauthorized')
  expect(mock.setResponseStatus).toHaveBeenCalledExactlyOnceWith(401)
  expect(mock.load).not.toHaveBeenCalled()
  mock.stale.mockReturnValueOnce('2026-11-16')
  expect(await run()).toMatchObject(stale)
  expect(mock.load).not.toHaveBeenCalled()
  mock.load.mockRejectedValueOnce(new Error('synthetic DB failure'))
  await expect(run()).rejects.toThrow('synthetic DB failure')
  expect(mock.guard).not.toHaveBeenCalled()
  addRecipe()
  await expect(run()).rejects.toThrow('configuration')
  expect(mock.guard).not.toHaveBeenCalled()
  context.recipes.pop()
  mock.guard.mockRejectedValueOnce(new AiGenerationLimitError())
  expect(await run()).toMatchObject({
    ok: false,
    reason: 'rate-limited',
  })
})
it('only attaches a previous proposal for the target week', async () => {
  const previous = emptyMenu(context.targetWeekStart)
  await invoke({ data: { ...data(), previousMenu: previous } })
  expect(context.previousProposal).toEqual(previous)
  delete context.previousProposal
  await invoke({ data: { ...data(), previousMenu: emptyMenu('2026-11-02') } })
  expect(context.previousProposal).toBeUndefined()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
it.each([undefined, 'ok', 'slow'])(
  'routes mock %s through guarded Decisions with no network',
  async (mockScenario) => {
    vi.stubEnv('AI_WEEKLY_MENU_MOCK', 'true')
    addRecipe()
    vi.useFakeTimers()
    const network = vi.fn(() => {
      throw new Error('Unexpected network')
    })
    vi.stubGlobal('fetch', network)
    const log = vi.spyOn(console, 'info').mockImplementation(() => {})
    try {
      let settled = false
      const pending = invoke({ data: { ...data(), mockScenario } }).then(
        (result) => {
          settled = true
          return result
        },
      )
      if (mockScenario === 'slow') {
        await vi.advanceTimersByTimeAsync(7_999)
        expect(settled).toBe(false)
        await vi.advanceTimersByTimeAsync(1)
      }
      const result = await pending
      const call = log.mock.calls.find(
        ([marker]) => marker === 'DECISION_MOCK_TRANSPORT',
      )!
      const transport = JSON.parse(String(call[1]))
      expect(transport.candidateCount).toBeGreaterThan(1)
      expect(transport.choice).not.toBe('menu-0')
      expect(result).toMatchObject({
        ok: true,
        menu: {
          days: Object.fromEntries(
            DAYS.map((day, index) => [
              day,
              {
                lunchRecipeId: transport.selected[index][0],
                dinnerRecipeId: transport.selected[index][1],
              },
            ]),
          ),
        },
      })
      expect(mock.guard).toHaveBeenCalledTimes(1)
      expect(network).not.toHaveBeenCalled()
    } finally {
      log.mockRestore()
    }
  },
)
it('returns the empty mock shortage inside one guard', async () => {
  vi.stubEnv('AI_WEEKLY_MENU_MOCK', 'true')
  const result = await invoke({ data: { ...data(), mockScenario: 'empty' } })
  expect(result).toMatchObject({
    ok: true,
    menu: emptyMenu(context.targetWeekStart),
    recipeNames: { lunch: 'Lunch' },
    unavailableSlots: ['lunch', 'dinner'],
  })
  expect(mock.guard).toHaveBeenCalledTimes(1)
})
it('ignores the mock flag and scenario in production, using Decisions', async () => {
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('AI_WEEKLY_MENU_MOCK', 'true')
  expect(
    await invoke({ data: { ...data(), mockScenario: 'empty' } }),
  ).toMatchObject({ ok: true })
  expect(mock.stale).toHaveBeenCalledTimes(2)
  expect(mock.guard).toHaveBeenCalledTimes(1)
})
it('rejects missing/blank credentials in production before the guard or network', async () => {
  vi.stubEnv('NODE_ENV', 'production')
  addRecipe()
  for (const key of [undefined, '', '  \n']) {
    vi.stubEnv('AI_GATEWAY_API_KEY', key)
    await expect(run()).rejects.toThrow('Decisions configuration')
    expect(mock.guard).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  }
})

// Obsolete deployment variables must be ignored; these are compatibility tests.
it.each([undefined, 'legacy', 'decisions', 'unknown'])(
  'always selects Decisions with obsolete engine %j and model configuration',
  async (engine) => {
    vi.stubEnv('AI_WEEKLY_MENU_ENGINE', engine)
    vi.stubEnv('AI_WEEKLY_MENU_MODEL', 'obsolete/unused')
    vi.stubEnv('AI_GATEWAY_API_KEY', 'synthetic-key')
    addRecipe()
    const transport = mockDecisionFetch('ok')
    const network = vi.fn<typeof fetch>(async (...args) => {
      expect(guardActive).toBe(true)
      return transport(...args)
    })
    vi.stubGlobal('fetch', network)
    expect(await run()).toMatchObject({ ok: true })
    expect(network).toHaveBeenCalledTimes(1)
    expect(mock.guard).toHaveBeenCalledTimes(1)
  },
)
it.each([undefined, '', '  \n'])(
  'rejects missing/blank key %j before any attempt or lease',
  async (key) => {
    vi.stubEnv('AI_GATEWAY_API_KEY', key)
    addRecipe()
    await expect(run()).rejects.toThrow('Decisions configuration')
    expect(mock.guard).not.toHaveBeenCalled()
  },
)
