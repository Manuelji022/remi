// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePlannerWeek } from './usePlannerWeek'
import { useAiMenuGeneration } from './useAiMenuGeneration'
import { emptyMenu } from '../week'
import { updateSchedulePlanningScope } from '../schedule-domain'
import { nextCalendarWeekStart } from '../ai-schedule'
import type { AiPreview } from './useAiMenuGeneration'

const api = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
  generate: vi.fn(),
  recipes: vi.fn(),
}))
vi.mock('../functions', () => ({
  loadWeeklyMenu: api.load,
  saveWeeklyMenu: api.save,
  generateNextWeeklyMenu: api.generate,
}))
vi.mock('#/features/recipes/functions', () => ({ listRecipes: api.recipes }))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const roots: ReturnType<typeof createRoot>[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await act(() => root.unmount())
  vi.resetAllMocks()
  document.body.innerHTML = ''
})
function mount<T>(hook: () => T) {
  let result: T
  const node = document.createElement('div')
  document.body.append(node)
  const root = createRoot(node)
  roots.push(root)
  function Probe() {
    result = hook()
    return null
  }
  const render = async () => {
    await act(async () => {
      root.render(<Probe />)
    })
  }
  return {
    render,
    get current() {
      return result!
    },
  }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const weekStart = '2026-10-05'
const week = { menu: emptyMenu(weekStart), recipeNames: {}, hasSavedMenu: true }

describe('usePlannerWeek write ownership', () => {
  it.each([false, true])(
    'settles a held write after readiness toggles (reject=%s)',
    async (reject) => {
      api.load.mockResolvedValue(week)
      api.recipes.mockResolvedValue([])
      const held = deferred<typeof week>()
      api.save.mockReturnValue(held.promise)
      let enabled = true
      const view = mount(() =>
        usePlannerWeek({
          userId: 'one',
          weekStart,
          enabled,
          preferencesOpen: false,
        }),
      )
      await view.render()
      let saved!: Promise<boolean>
      await act(async () => {
        saved = view.current.acceptPreview(week.menu, [])
      })
      enabled = false
      await view.render()
      enabled = true
      await view.render()
      await act(async () => {
        if (reject) held.reject(new Error('lost response'))
        else held.resolve(week)
        await saved
      })
      expect(view.current.action?.status).not.toBe('pending')
      expect(view.current.action).toBeNull()
      expect(await saved).toBe(!reject)
    },
  )
  it.each([false, true])(
    'does not resurrect scoped feedback (reject=%s)',
    async (reject) => {
      api.load.mockResolvedValue(week)
      api.recipes.mockResolvedValue([])
      if (reject) api.save.mockRejectedValue(new Error('lost response'))
      else api.save.mockResolvedValue(week)
      let userId = 'one'
      const view = mount(() =>
        usePlannerWeek({
          userId,
          weekStart,
          enabled: true,
          preferencesOpen: false,
        }),
      )
      await view.render()
      await act(async () => {
        await view.current.acceptPreview(week.menu, [])
      })
      userId = 'two'
      await view.render()
      userId = 'one'
      await view.render()
      expect(view.current.action).toBeNull()
    },
  )
})

describe('unchanged AI schedule regeneration', () => {
  it('keeps sparse/default preferences identical when selecting the effective scope', () => {
    const preferences = { dayContexts: {}, planningScopes: {} }
    expect(updateSchedulePlanningScope(preferences, 'Monday', 'both')).toBe(
      preferences,
    )
  })
  it.each(['throw', 'stale-week', 'in-progress', 'rate-limited'])(
    'retains an edited preview after %s',
    async (reason) => {
      const target = nextCalendarWeekStart(new Date(), 'UTC')
      const preview: AiPreview = {
        userId: 'one',
        weekStart: target,
        menu: emptyMenu(target),
        recipeNames: {},
        unavailableSlots: [],
      }
      preview.menu.days.Monday.dinnerRecipeId = 'manual-edit'
      if (reason === 'throw')
        api.generate.mockRejectedValue(new Error('provider'))
      else
        api.generate.mockResolvedValue({
          ok: false,
          reason,
          expectedTargetWeekStart: '2026-10-12',
        })
      const view = mount(() =>
        useAiMenuGeneration({
          userId: 'one',
          timeZone: 'UTC',
          onPreviewWeek: () => {},
        }),
      )
      await view.render()
      await act(async () => {
        await view.current.openSchedule({
          mode: 'edit',
          targetWeekStart: target,
          preview,
        })
      })
      await act(async () => {
        await view.current.confirm()
      })
      expect(view.current.preview).toEqual(preview)
      expect(view.current.state.phase).toBe('error')
      api.save.mockResolvedValue(true)
      await act(async () => {
        await view.current.accept(api.save)
      })
      expect(api.save).toHaveBeenCalledWith(preview.menu, preview)
    },
  )
  it.each(['in-progress', 'rate-limited'])(
    'retains the confirmed retry draft after %s',
    async (reason) => {
      const target = nextCalendarWeekStart(new Date(), 'UTC')
      api.load.mockResolvedValue({ ...week, hasSavedMenu: false })
      api.generate.mockResolvedValue({ ok: false, reason })
      const view = mount(() =>
        useAiMenuGeneration({
          userId: 'one',
          timeZone: 'UTC',
          onPreviewWeek: () => {},
        }),
      )
      await view.render()
      await act(async () => {
        await view.current.openSchedule({ targetWeekStart: target })
      })
      await act(() => view.current.updateContext('Monday', 'office'))
      await act(async () => {
        await view.current.confirm()
      })
      await act(async () => {
        await view.current.retry()
      })
      expect(
        view.current.state.phase === 'confirming' &&
          view.current.state.draft.dayContexts.Monday,
      ).toBe('office')
    },
  )
  it('continues discarding a preview after an actual schedule change', async () => {
    const target = nextCalendarWeekStart(new Date(), 'UTC')
    const preview: AiPreview = {
      userId: 'one',
      weekStart: target,
      menu: emptyMenu(target),
      recipeNames: {},
      unavailableSlots: [],
    }
    api.generate.mockRejectedValue(new Error('provider'))
    const view = mount(() =>
      useAiMenuGeneration({
        userId: 'one',
        timeZone: 'UTC',
        onPreviewWeek: () => {},
      }),
    )
    await view.render()
    await act(async () => {
      await view.current.openSchedule({
        mode: 'edit',
        targetWeekStart: target,
        preview,
      })
    })
    await act(() => view.current.updateContext('Monday', 'office'))
    await act(async () => {
      await view.current.confirm()
    })
    expect(view.current.preview).toBeUndefined()
  })
})
