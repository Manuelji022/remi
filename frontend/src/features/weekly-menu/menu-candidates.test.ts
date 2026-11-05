import { describe, expect, it } from 'vitest'
import type { Recipe } from '#/features/recipes/recipe'
import { DAYS } from '#/features/weekly-menu/constants'
import { menuForTargetSchedule } from '#/features/weekly-menu/ai-schedule'
import type { TargetWeekSchedule } from '#/features/weekly-menu/ai-schedule'
import { emptyMenu } from '#/features/weekly-menu/week'
import type { CalendarWeekMenu } from '#/features/weekly-menu/week'
import { buildWeeklyMenuCandidates } from '#/features/weekly-menu/menu-candidates'

const targetWeekStart = '2026-10-05'
const schedule: TargetWeekSchedule = Object.fromEntries(
  DAYS.map((day) => [day, { context: null, scope: 'both' }]),
) as TargetWeekSchedule

function recipe(id: string, slot: Recipe['slot']): Recipe {
  return { id, name: id, slot, ingredients: [] }
}

function context(overrides: Partial<CandidateContext> = {}) {
  return {
    targetWeekStart,
    schedule,
    recipes: [
      recipe('lunch-a', 'lunch'),
      recipe('lunch-b', 'lunch'),
      recipe('dinner-a', 'dinner'),
      recipe('dinner-b', 'dinner'),
    ],
    currentWeek: emptyMenu('2026-09-28'),
    previousWeek: emptyMenu('2026-09-21'),
    ...overrides,
  }
}

type CandidateContext = Parameters<typeof buildWeeklyMenuCandidates>[0]

function recipesFor(menu: CalendarWeekMenu, slot: Recipe['slot']) {
  return DAYS.map((day) =>
    slot === 'lunch'
      ? menu.days[day].lunchRecipeId
      : menu.days[day].dinnerRecipeId,
  ).filter((id): id is string => id !== null)
}

describe('bounded local weekly menu candidates', () => {
  it('keeps the target Monday, all seven scheduled days, and compatible recipes only', () => {
    const targetSchedule: TargetWeekSchedule = {
      ...schedule,
      Monday: { context: 'office', scope: 'both' },
      Tuesday: { context: 'eatOut', scope: 'lunch' },
      Wednesday: { context: null, scope: 'lunch' },
      Thursday: { context: null, scope: 'dinner' },
    }
    const input = context({ schedule: targetSchedule })
    const expected = menuForTargetSchedule(targetWeekStart, targetSchedule)
    const [candidate] = buildWeeklyMenuCandidates(input, 12)

    expect(candidate.weekStart).toBe(targetWeekStart)
    expect(Object.keys(candidate.days)).toEqual(DAYS)
    for (const day of DAYS) {
      expect(candidate.days[day].context).toBe(expected.days[day].context)
      expect(candidate.days[day].scope).toBe(expected.days[day].scope)
      for (const slot of ['lunch', 'dinner'] as const) {
        const id =
          slot === 'lunch'
            ? candidate.days[day].lunchRecipeId
            : candidate.days[day].dinnerRecipeId
        const isHomePlanned =
          expected.days[day].scope === 'both' ||
          expected.days[day].scope === slot
        expect(id === null).toBe(!isHomePlanned)
        if (id) {
          expect(
            input.recipes.some((item) => item.id === id && item.slot === slot),
          ).toBe(true)
        }
      }
    }
  })

  it('generates with valid empty history and softly favors less recent recipes', () => {
    const recent = context({
      recipes: [
        recipe('lunch-current', 'lunch'),
        recipe('lunch-previous', 'lunch'),
        recipe('dinner-one', 'dinner'),
      ],
    })
    for (const day of DAYS) {
      recent.currentWeek.days[day].lunchRecipeId = 'lunch-current'
      recent.previousWeek.days[day].lunchRecipeId = 'lunch-previous'
    }

    const [candidate] = buildWeeklyMenuCandidates(recent, 22)

    expect(recipesFor(candidate, 'lunch').length).toBe(DAYS.length)
    expect(
      recipesFor(candidate, 'lunch').filter((id) => id === 'lunch-current')
        .length,
    ).toBeLessThan(
      recipesFor(candidate, 'lunch').filter((id) => id === 'lunch-previous')
        .length,
    )
    expect(buildWeeklyMenuCandidates(context(), 0).length).toBeGreaterThan(0)
  })

  it('repeats scarce compatible recipes and leaves unavailable slot types empty', () => {
    const input = context({
      recipes: [recipe('only-lunch', 'lunch')],
    })
    const [candidate] = buildWeeklyMenuCandidates(input, 0)

    expect(recipesFor(candidate, 'lunch')).toEqual(
      Array(DAYS.length).fill('only-lunch'),
    )
    expect(recipesFor(candidate, 'dinner')).toEqual([])
  })

  it('is stable for a normalized catalog and explicit seed regardless of catalog order', () => {
    const input = context()
    const reversed = context({ recipes: input.recipes.slice().reverse() })

    expect(buildWeeklyMenuCandidates(input, 73)).toEqual(
      buildWeeklyMenuCandidates(reversed, 73),
    )
  })

  it('returns at most eight distinct weeks and varies weekday pairings', () => {
    const candidates = buildWeeklyMenuCandidates(context(), 73)
    const signatures = candidates.map((candidate) =>
      DAYS.map((day) =>
        [
          candidate.days[day].lunchRecipeId,
          candidate.days[day].dinnerRecipeId,
        ].join(':'),
      ).join('|'),
    )
    const MondayPairings = new Set(
      candidates.map(
        (candidate) =>
          `${candidate.days.Monday.lunchRecipeId}:${candidate.days.Monday.dinnerRecipeId}`,
      ),
    )

    expect(candidates.length).toBeLessThanOrEqual(8)
    expect(new Set(signatures).size).toBe(candidates.length)
    expect(MondayPairings.size).toBeGreaterThan(1)
  })

  it('excludes an identical previous proposal when another valid week exists', () => {
    const initial = buildWeeklyMenuCandidates(context(), 19)
    expect(initial.length).toBeGreaterThan(1)

    const regenerated = buildWeeklyMenuCandidates(
      context({ previousProposal: initial[0] }),
      19,
    )

    expect(regenerated[0]).not.toEqual(initial[0])
    expect(regenerated.length).toBeGreaterThan(0)
  })

  it('returns the sole valid week when no alternative exists', () => {
    const input = context({
      recipes: [recipe('only-lunch', 'lunch'), recipe('only-dinner', 'dinner')],
    })
    const only = buildWeeklyMenuCandidates(input, 0)[0]

    expect(
      buildWeeklyMenuCandidates({ ...input, previousProposal: only }, 0),
    ).toEqual([only])
  })

  it('keeps every catalog recipe eligible across seeds instead of a fixed subset', () => {
    const smallLunchSchedule: TargetWeekSchedule = {
      ...schedule,
      ...Object.fromEntries(
        DAYS.slice(1).map((day) => [
          day,
          { context: 'office', scope: 'dinner' },
        ]),
      ),
    }
    const lunchRecipes = Array.from({ length: 7 }, (_, index) =>
      recipe(`lunch-${index}`, 'lunch'),
    )
    const input = context({
      schedule: smallLunchSchedule,
      recipes: [...lunchRecipes, recipe('dinner-one', 'dinner')],
    })
    const eligible = new Set<string>()

    for (let seed = 0; seed < 24; seed += 1) {
      for (const candidate of buildWeeklyMenuCandidates(input, seed)) {
        for (const id of recipesFor(candidate, 'lunch')) eligible.add(id)
      }
    }

    expect(eligible).toEqual(new Set(lunchRecipes.map(({ id }) => id)))
  })
})
