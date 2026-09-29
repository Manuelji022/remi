import { describe, expect, it } from 'vitest'
import { getDefaultPreferences } from '#/data/types'
import {
  MenuInputError,
  applySchedule,
  assignRecipesToWeek,
  emptyMenu,
  parseCalendarWeek,
  parseWeekStart,
  scheduleFromMenu,
  shiftWeekStart,
  showMenuDay,
  weekStartFromDate,
} from '#/menu/week'

describe('calendar week', () => {
  it('uses the Monday of the local calendar week', () => {
    expect(weekStartFromDate(new Date(2026, 8, 29))).toBe('2026-09-28')
    expect(weekStartFromDate(new Date(2026, 8, 28))).toBe('2026-09-28')
    expect(weekStartFromDate(new Date(2026, 9, 4))).toBe('2026-09-28')
    expect(shiftWeekStart('2026-09-28', -1)).toBe('2026-09-21')
    expect(shiftWeekStart('2026-09-28', 1)).toBe('2026-10-05')
    expect(parseWeekStart('2026-09-28')).toBe('2026-09-28')
    expect(() => parseWeekStart('2026-09-29')).toThrow(MenuInputError)
  })

  it('keeps an owned dinner recipe when Monday becomes an office day', () => {
    const menu = emptyMenu('2026-09-28')
    menu.days.Monday.dinnerRecipeId = 'recipe-pasta'

    const saved = applySchedule(menu, {
      dayContexts: { Monday: 'office' },
      planningScopes: { Monday: 'dinner' },
    })

    expect(saved.days.Monday).toEqual({
      context: 'office',
      scope: 'dinner',
      lunchRecipeId: null,
      dinnerRecipeId: 'recipe-pasta',
    })
    expect(saved.days.Tuesday).toEqual({
      context: null,
      scope: 'both',
      lunchRecipeId: null,
      dinnerRecipeId: null,
    })
    expect(scheduleFromMenu(saved)).toEqual({
      dayContexts: { Monday: 'office' },
      planningScopes: { Monday: 'dinner' },
    })
  })

  it('stores the prior week apart from the current week', () => {
    const current = applySchedule(emptyMenu('2026-09-28'), {
      dayContexts: { Monday: 'office' },
      planningScopes: {},
    })
    const prior = applySchedule(emptyMenu('2026-09-21'), {
      ...getDefaultPreferences(),
      dayContexts: { Tuesday: 'eatOut' },
      planningScopes: { Tuesday: 'lunch' },
    })

    expect(current.weekStart).toBe('2026-09-28')
    expect(current.days.Monday.context).toBe('office')
    expect(prior.weekStart).toBe('2026-09-21')
    expect(prior.days.Monday.context).toBeNull()
    expect(prior.days.Tuesday).toEqual({
      context: 'eatOut',
      scope: 'lunch',
      lunchRecipeId: null,
      dinnerRecipeId: null,
    })
    expect(parseCalendarWeek(current).days.Monday.scope).toBe('dinner')
  })

  it('fills open home slots from lunch and dinner queues', () => {
    const menu = applySchedule(emptyMenu('2026-09-28'), {
      dayContexts: { Monday: 'office', Wednesday: 'eatOut' },
      planningScopes: { Wednesday: 'lunch', Friday: 'dinner' },
    })
    menu.days.Tuesday.lunchRecipeId = 'stale-lunch'
    const pool = [
      { id: 'l1', slot: 'lunch' as const },
      { id: 'l2', slot: 'lunch' as const },
      { id: 'd1', slot: 'dinner' as const },
      { id: 'd2', slot: 'dinner' as const },
      { id: 'd3', slot: 'dinner' as const },
      { id: 'd4', slot: 'dinner' as const },
    ]

    const assigned = assignRecipesToWeek(menu, pool)

    expect(assigned.days).toEqual({
      Monday: {
        context: 'office',
        scope: 'dinner',
        lunchRecipeId: null,
        dinnerRecipeId: 'd1',
      },
      Tuesday: {
        context: null,
        scope: 'both',
        lunchRecipeId: 'l1',
        dinnerRecipeId: 'd2',
      },
      Wednesday: {
        context: 'eatOut',
        scope: 'lunch',
        lunchRecipeId: 'l2',
        dinnerRecipeId: null,
      },
      Thursday: {
        context: null,
        scope: 'both',
        lunchRecipeId: null,
        dinnerRecipeId: 'd3',
      },
      Friday: {
        context: null,
        scope: 'dinner',
        lunchRecipeId: null,
        dinnerRecipeId: 'd4',
      },
      Saturday: {
        context: null,
        scope: 'both',
        lunchRecipeId: null,
        dinnerRecipeId: null,
      },
      Sunday: {
        context: null,
        scope: 'both',
        lunchRecipeId: null,
        dinnerRecipeId: null,
      },
    })
    expect(assignRecipesToWeek(assigned, pool).days).toEqual(assigned.days)
    expect(assignRecipesToWeek(menu, []).days).toEqual({
      Monday: {
        context: 'office',
        scope: 'dinner',
        lunchRecipeId: null,
        dinnerRecipeId: null,
      },
      Tuesday: {
        context: null,
        scope: 'both',
        lunchRecipeId: null,
        dinnerRecipeId: null,
      },
      Wednesday: {
        context: 'eatOut',
        scope: 'lunch',
        lunchRecipeId: null,
        dinnerRecipeId: null,
      },
      Thursday: {
        context: null,
        scope: 'both',
        lunchRecipeId: null,
        dinnerRecipeId: null,
      },
      Friday: {
        context: null,
        scope: 'dinner',
        lunchRecipeId: null,
        dinnerRecipeId: null,
      },
      Saturday: {
        context: null,
        scope: 'both',
        lunchRecipeId: null,
        dinnerRecipeId: null,
      },
      Sunday: {
        context: null,
        scope: 'both',
        lunchRecipeId: null,
        dinnerRecipeId: null,
      },
    })
    expect(showMenuDay(assigned.days.Monday, {})).toEqual({
      context: 'office',
      scope: 'dinner',
      lunch: { kind: 'covered', context: 'office' },
      dinner: { kind: 'unplanned' },
    })
    expect(showMenuDay(assigned.days.Monday, { d1: 'Lemon pasta' })).toEqual({
      context: 'office',
      scope: 'dinner',
      lunch: { kind: 'covered', context: 'office' },
      dinner: { kind: 'recipe', name: 'Lemon pasta' },
    })
    expect(showMenuDay(assigned.days.Friday, {}).lunch).toEqual({
      kind: 'outside',
    })
  })

  it('skips a repeated pool id', () => {
    const assigned = assignRecipesToWeek(emptyMenu('2026-09-28'), [
      { id: 'l1', slot: 'lunch' },
      { id: 'l1', slot: 'dinner' },
      { id: 'l2', slot: 'lunch' },
    ])

    expect(assigned.days.Monday).toEqual({
      context: null,
      scope: 'both',
      lunchRecipeId: 'l1',
      dinnerRecipeId: null,
    })
    expect(assigned.days.Tuesday).toEqual({
      context: null,
      scope: 'both',
      lunchRecipeId: 'l2',
      dinnerRecipeId: null,
    })
  })

  it('rejects a lunch recipe on an office day', () => {
    const menu = emptyMenu('2026-09-28')
    menu.days.Monday = {
      context: 'office',
      scope: 'dinner',
      lunchRecipeId: 'recipe-soup',
      dinnerRecipeId: null,
    }

    expect(() => parseCalendarWeek(menu)).toThrow(MenuInputError)
  })
})
