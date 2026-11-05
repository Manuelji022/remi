import { beforeEach, expect, it, vi } from 'vitest'
import { DAYS } from '#/features/weekly-menu/constants'
import { emptyMenu } from '#/features/weekly-menu/week'
import { generateNextWeeklyMenu } from '#/features/weekly-menu/functions'
import { AiGenerationLimitError } from '#/features/weekly-menu/ai-generation-guard'
import type { AiMenuContext } from '#/features/weekly-menu/ai-generator'

const mock = vi.hoisted(() => ({
  requireSession: vi.fn(),
  load: vi.fn(),
  guard: vi.fn(),
  stale: vi.fn(),
  legacy: vi.fn(),
}))
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    validator: () => ({ handler: (fn: unknown) => fn }),
  }),
}))
vi.mock('@tanstack/react-start/server', () => ({
  getRequest: () => ({ headers: new Headers() }),
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
vi.mock('#/features/weekly-menu/ai-generator', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  generateAiMenu: mock.legacy,
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
  vi.stubEnv('AI_WEEKLY_MENU_ENGINE', 'decisions')
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
const data = () => ({
  targetWeekStart: context.targetWeekStart,
  timeZone: 'UTC',
  schedule: context.schedule,
})

it('guards a local singleton once with no credentials, and retains the post-generation stale check', async () => {
  expect((await invoke({ data: data() })).ok).toBe(true)
  expect(mock.guard).toHaveBeenCalledTimes(1)
  expect(mock.stale).toHaveBeenCalledTimes(2)
  mock.stale
    .mockReset()
    .mockReturnValueOnce(undefined)
    .mockReturnValueOnce('2026-11-16')
  expect(await invoke({ data: data() })).toMatchObject({
    ok: false,
    reason: 'stale-week',
  })
})
it('does not convert auth, stale, database, configuration or guard errors into previews', async () => {
  mock.requireSession.mockResolvedValueOnce(null)
  await expect(invoke({ data: data() })).rejects.toThrow('Unauthorized')
  expect(mock.load).not.toHaveBeenCalled()
  mock.stale.mockReturnValueOnce('2026-11-16')
  expect(await invoke({ data: data() })).toMatchObject({
    ok: false,
    reason: 'stale-week',
  })
  expect(mock.load).not.toHaveBeenCalled()
  mock.load.mockRejectedValueOnce(new Error('synthetic DB failure'))
  await expect(invoke({ data: data() })).rejects.toThrow('synthetic DB failure')
  expect(mock.guard).not.toHaveBeenCalled()
  context.recipes.push({
    id: 'other',
    name: 'Other lunch',
    slot: 'lunch',
    ingredients: [],
  })
  await expect(invoke({ data: data() })).rejects.toThrow('configuration')
  expect(mock.guard).not.toHaveBeenCalled()
  context.recipes.pop()
  mock.guard.mockRejectedValueOnce(new AiGenerationLimitError())
  expect(await invoke({ data: data() })).toMatchObject({
    ok: false,
    reason: 'rate-limited',
  })
})
it('leaves legacy as the default and only attaches a previous proposal for the target week', async () => {
  vi.stubEnv('AI_WEEKLY_MENU_ENGINE', undefined)
  mock.legacy.mockResolvedValue({
    menu: emptyMenu(context.targetWeekStart),
    recipeNames: {},
    unavailableSlots: [],
  })
  const previous = emptyMenu(context.targetWeekStart)
  await invoke({ data: { ...data(), previousMenu: previous } })
  expect(context.previousProposal).toEqual(previous)
  expect(mock.legacy).toHaveBeenCalledTimes(1)
  delete context.previousProposal
  await invoke({ data: { ...data(), previousMenu: emptyMenu('2026-11-02') } })
  expect(context.previousProposal).toBeUndefined()
})
it('gives the development mock precedence over Decisions with zero Gateway calls', async () => {
  vi.stubEnv('AI_WEEKLY_MENU_MOCK', 'true')
  vi.stubEnv('AI_GATEWAY_API_KEY', 'synthetic-gateway-key')
  context.recipes.push({
    id: 'other',
    name: 'Other lunch',
    slot: 'lunch',
    ingredients: [],
  })
  const transport = vi.fn(
    async () => new Response('unexpected', { status: 500 }),
  )
  vi.stubGlobal('fetch', transport)
  const mocked = {
    menu: emptyMenu(context.targetWeekStart),
    recipeNames: {},
    unavailableSlots: [],
  }
  mock.legacy.mockResolvedValue(mocked)
  expect(await invoke({ data: data() })).toMatchObject({
    ok: true,
    menu: mocked.menu,
  })
  expect(mock.legacy).toHaveBeenCalledTimes(1)
  expect(transport).not.toHaveBeenCalled()
  vi.unstubAllGlobals()
})
