import { describe, expect, it } from 'vitest'
import {
  WEEKLY_MENU_PLANNER_STORAGE_KEY,
  getBrowserStorage,
  mergeChecklistWithMenu,
  readWeeklyMenuPlannerState,
  writeWeeklyMenuPlannerState,
} from './weekly-menu-planner-storage'
import type {
  WeeklyMenuPlannerPersistedState,
  WeeklyMenuPlannerStorage,
} from './weekly-menu-planner-storage'

const persistedState: WeeklyMenuPlannerPersistedState = {
  savedPreferences: {
    dayContexts: { Monday: 'office' },
    planningScopes: { Monday: 'dinner' },
    customRecipes: [
      {
        name: 'Lemon pasta',
        slot: 'dinner',
        ingredients: [{ name: 'Pasta', quantity: 200, unit: 'g' }],
      },
    ],
  },
  currentMenuIndex: 1,
  shoppingChecklist: {
    'produceAndFreshHerbs::Kale': { checked: true, inFridge: true },
    'pantryAndDryGoods::Olive oil': { checked: false, inFridge: false },
  },
}

function createMemoryStorage(
  initial: Record<string, string> = {},
): WeeklyMenuPlannerStorage & { snapshot: () => Record<string, string> } {
  const values = new Map(Object.entries(initial))

  return {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, value)
    },
    snapshot() {
      return Object.fromEntries(values)
    },
  }
}

describe('weekly menu planner storage', () => {
  it('returns null when storage is missing', () => {
    expect(readWeeklyMenuPlannerState(null, 3)).toBeNull()
    expect(getBrowserStorage()).toBeNull()
  })

  it('returns null for missing, corrupt, or invalid JSON', () => {
    expect(readWeeklyMenuPlannerState(createMemoryStorage(), 3)).toBeNull()

    const corrupt = createMemoryStorage({
      [WEEKLY_MENU_PLANNER_STORAGE_KEY]: '{not-json',
    })
    expect(readWeeklyMenuPlannerState(corrupt, 3)).toBeNull()

    const invalid = createMemoryStorage({
      [WEEKLY_MENU_PLANNER_STORAGE_KEY]: JSON.stringify({
        savedPreferences: { dayContexts: { Monday: 'beach' } },
        currentMenuIndex: 1,
        shoppingChecklist: {},
      }),
    })
    expect(readWeeklyMenuPlannerState(invalid, 3)).toBeNull()
  })

  it('rejects a menu index outside the available sets', () => {
    const storage = createMemoryStorage({
      [WEEKLY_MENU_PLANNER_STORAGE_KEY]: JSON.stringify({
        ...persistedState,
        currentMenuIndex: 4,
      }),
    })

    expect(readWeeklyMenuPlannerState(storage, 3)).toBeNull()
  })

  it('round-trips valid planner state', () => {
    const storage = createMemoryStorage()

    writeWeeklyMenuPlannerState(storage, persistedState)

    expect(readWeeklyMenuPlannerState(storage, 3)).toEqual(persistedState)
    expect(storage.snapshot()).toHaveProperty(WEEKLY_MENU_PLANNER_STORAGE_KEY)
  })

  it('ignores writes when storage is missing', () => {
    expect(() =>
      writeWeeklyMenuPlannerState(null, persistedState),
    ).not.toThrow()
  })

  it('keeps checks only for ingredients in the current menu', () => {
    const menuChecklist = {
      'produceAndFreshHerbs::Kale': { checked: false, inFridge: false },
      'dairyAndEggs::Eggs': { checked: false, inFridge: false },
    }

    expect(
      mergeChecklistWithMenu(menuChecklist, persistedState.shoppingChecklist),
    ).toEqual({
      'produceAndFreshHerbs::Kale': { checked: true, inFridge: true },
      'dairyAndEggs::Eggs': { checked: false, inFridge: false },
    })
  })
})
