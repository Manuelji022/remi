import { describe, expect, it } from 'vitest'
import {
  WEEKLY_MENU_PLANNER_STORAGE_KEY,
  getBrowserStorage,
  readWeeklyMenuPlannerState,
  writeWeeklyMenuPlannerState,
} from './weekly-menu-planner-storage'
import type {
  WeeklyMenuPlannerPersistedState,
  WeeklyMenuPlannerStorage,
} from './weekly-menu-planner-storage'

const lemonPasta = {
  name: 'Lemon pasta',
  slot: 'dinner' as const,
  ingredients: [{ name: 'Pasta', quantity: 200, unit: 'g' as const }],
}

const persistedState: WeeklyMenuPlannerPersistedState = {
  savedPreferences: {
    dayContexts: { Monday: 'office' },
    planningScopes: { Monday: 'dinner' },
  },
  legacyCustomRecipes: [],
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
    expect(readWeeklyMenuPlannerState(null)).toBeNull()
    expect(getBrowserStorage()).toBeNull()
  })

  it('returns null for missing, corrupt, or invalid JSON', () => {
    expect(readWeeklyMenuPlannerState(createMemoryStorage())).toBeNull()

    const corrupt = createMemoryStorage({
      [WEEKLY_MENU_PLANNER_STORAGE_KEY]: '{not-json',
    })
    expect(readWeeklyMenuPlannerState(corrupt)).toBeNull()

    const invalid = createMemoryStorage({
      [WEEKLY_MENU_PLANNER_STORAGE_KEY]: JSON.stringify({
        savedPreferences: { dayContexts: { Monday: 'beach' } },
        currentMenuIndex: 1,
        shoppingChecklist: {},
      }),
    })
    expect(readWeeklyMenuPlannerState(invalid)).toBeNull()
  })

  it('reads preferences from an old menu index and checklist', () => {
    const preferences = {
      dayContexts: { Monday: 'office' as const },
      planningScopes: { Monday: 'dinner' as const },
    }
    const withIndex = createMemoryStorage({
      [WEEKLY_MENU_PLANNER_STORAGE_KEY]: JSON.stringify({
        savedPreferences: preferences,
        currentMenuIndex: 4,
        shoppingChecklist: { leftover: true },
      }),
    })

    expect(readWeeklyMenuPlannerState(withIndex)).toEqual({
      savedPreferences: preferences,
      legacyCustomRecipes: [],
    })

    const missingIndex = createMemoryStorage({
      [WEEKLY_MENU_PLANNER_STORAGE_KEY]: JSON.stringify({
        savedPreferences: preferences,
      }),
    })

    expect(readWeeklyMenuPlannerState(missingIndex)).toEqual({
      savedPreferences: preferences,
      legacyCustomRecipes: [],
    })
  })

  it('round-trips planner state and leaves recipes out of the blob', () => {
    const storage = createMemoryStorage()

    writeWeeklyMenuPlannerState(storage, persistedState)

    expect(readWeeklyMenuPlannerState(storage)).toEqual(persistedState)
    const written = JSON.parse(
      storage.snapshot()[WEEKLY_MENU_PLANNER_STORAGE_KEY],
    )
    expect(written).toEqual({
      savedPreferences: {
        dayContexts: { Monday: 'office' },
        planningScopes: { Monday: 'dinner' },
      },
    })
  })

  it('keeps legacy recipes until they are imported', () => {
    const storage = createMemoryStorage({
      [WEEKLY_MENU_PLANNER_STORAGE_KEY]: JSON.stringify({
        savedPreferences: {
          dayContexts: { Monday: 'office' },
          planningScopes: { Monday: 'dinner' },
          customRecipes: [lemonPasta],
        },
        currentMenuIndex: 1,
        shoppingChecklist: {
          'produceAndFreshHerbs::Kale': { checked: true, inFridge: true },
        },
      }),
    })

    expect(readWeeklyMenuPlannerState(storage)).toEqual({
      ...persistedState,
      legacyCustomRecipes: [
        {
          name: 'Lemon pasta',
          slot: 'dinner',
          ingredients: [{ name: 'Pasta', quantity: 200, unit: 'g' }],
        },
      ],
    })

    writeWeeklyMenuPlannerState(storage, {
      ...persistedState,
      legacyCustomRecipes: [lemonPasta],
    })

    expect(
      JSON.parse(storage.snapshot()[WEEKLY_MENU_PLANNER_STORAGE_KEY])
        .savedPreferences.customRecipes,
    ).toEqual([lemonPasta])
  })

  it('rejects a blob whose legacy recipe is invalid', () => {
    const storage = createMemoryStorage({
      [WEEKLY_MENU_PLANNER_STORAGE_KEY]: JSON.stringify({
        savedPreferences: {
          dayContexts: {},
          planningScopes: {},
          customRecipes: [{ name: 'Soup', slot: 'breakfast', ingredients: [] }],
        },
        currentMenuIndex: -1,
        shoppingChecklist: {},
      }),
    })

    expect(readWeeklyMenuPlannerState(storage)).toBeNull()
  })

  it('ignores writes when storage is missing', () => {
    expect(() =>
      writeWeeklyMenuPlannerState(null, persistedState),
    ).not.toThrow()
  })
})
