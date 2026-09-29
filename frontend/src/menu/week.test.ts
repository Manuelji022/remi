import { describe, expect, it } from 'vitest'
import { getDefaultPreferences } from '#/data/types'
import {
  MenuInputError,
  applySchedule,
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

  it('shows a recipe name on a home slot and the unplanned lunch for an office day', () => {
    const plan = applySchedule(emptyMenu('2026-09-28'), {
      dayContexts: { Monday: 'office' },
      planningScopes: { Monday: 'dinner' },
    }).days.Monday
    plan.dinnerRecipeId = 'recipe-pasta'

    expect(
      showMenuDay(
        plan,
        { 'recipe-pasta': 'Lemon pasta' },
        {
          lunch: { name: 'Roasted Tomato Soup & Sourdough', description: '' },
          dinner: { name: 'Herb-Crusted Salmon with Lentils', description: '' },
        },
      ),
    ).toEqual({
      context: 'office',
      scope: 'dinner',
      lunch: null,
      dinner: { name: 'Lemon pasta', description: '' },
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
