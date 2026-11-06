import { describe, expect, it } from 'vitest'
import { emptyMenu } from '#/features/weekly-menu/week'
import type { CalendarWeekMenu } from '#/features/weekly-menu/week'
import type { TargetWeekSchedule } from '#/features/weekly-menu/ai-schedule'
import type { Recipe } from '#/features/recipes/recipe'
import { validateAiMenuAssignments } from '#/features/weekly-menu/ai-generator'

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

  it.each([7, 2, 1, 0])(
    'reserves valid IDs before repair with %i candidates and deterministic order',
    (count) => {
      const pool = 'abcdefg'
        .slice(0, count)
        .split('')
        .map((id) => ({ ...recipes[0], id }))
      const input = { ...context, recipes: pool }
      const output = assignments(targetWeekStart, null, null)
      if (count === 7)
        Object.values(output.days).forEach((day, index) => {
          day.lunchRecipeId =
            index === 1 ? null : 'bcdefg'[index === 0 ? 0 : index - 1]
        })
      if (count === 7)
        expect(
          validateAiMenuAssignments(input, output).menu.days.Tuesday
            .lunchRecipeId,
        ).toBe('a')
      const result = validateAiMenuAssignments(input, output)
      const ids = Object.values(result.menu.days).map(
        (day) => day.lunchRecipeId,
      )
      expect(ids).toEqual(
        count === 7
          ? ['b', 'a', 'c', 'd', 'e', 'f', 'g']
          : count === 2
            ? ['a', 'b', 'a', 'b', 'a', 'b', 'a']
            : Array(7).fill(count ? 'a' : null),
      )
      expect(
        validateAiMenuAssignments(
          { ...input, recipes: pool.slice().reverse() },
          output,
        ),
      ).toEqual(result)
      expect(validateAiMenuAssignments(input, output)).toEqual(result)
      expect(result.unavailableSlots).toEqual(
        count ? ['dinner'] : ['lunch', 'dinner'],
      )
      expect(
        validateAiMenuAssignments(input, {
          weekStart: targetWeekStart,
          days: Object.fromEntries(
            Object.entries(result.menu.days).map(
              ([day, { lunchRecipeId, dinnerRecipeId }]) => [
                day,
                { lunchRecipeId, dinnerRecipeId },
              ],
            ),
          ),
        }).menu,
      ).toEqual(result.menu)
    },
  )

  it.each([
    ['an unreserved non-recent fallback exists', 'c', 'b'],
    ['the fallback is reserved by a valid model choice', 'b', 'c'],
    ['every candidate is reserved', null, 'b'],
  ])('repairs without recent repeats when %s', (_case, fill, expected) => {
    const pool = ['a', 'b', 'c'].map((id) => ({ ...recipes[0], id }))
    const currentWeek = emptyMenu('2026-09-28')
    currentWeek.days.Monday.lunchRecipeId = 'a'
    const input = { ...context, recipes: pool, currentWeek }
    const output = assignments(targetWeekStart, null, null)
    Object.values(output.days).forEach((day, index) => {
      day.lunchRecipeId = index === 0 ? null : (fill ?? 'abcccc'[index - 1])
    })
    const ids = Object.values(
      validateAiMenuAssignments(input, output).menu.days,
    ).map((day) => day.lunchRecipeId)
    expect(ids).toEqual([
      expected,
      ...Object.values(output.days)
        .slice(1)
        .map((day) => day.lunchRecipeId),
    ])
    expect(validateAiMenuAssignments(input, output)).toEqual(
      validateAiMenuAssignments(input, output),
    )
  })
})
