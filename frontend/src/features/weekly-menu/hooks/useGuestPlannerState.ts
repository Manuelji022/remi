import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import { getDefaultPreferences } from '#/features/weekly-menu/types'
import type { Preferences } from '#/features/weekly-menu/types'
import type { RecipeInput } from '#/features/recipes/recipe'
import {
  getBrowserStorage,
  readWeeklyMenuPlannerState,
  writeWeeklyMenuPlannerState,
} from '#/features/weekly-menu/planner-storage'

const subscribeToHydration = () => () => {}
const getClientHydrated = () => true
const getServerHydrated = () => false

// Guest planner choices live in this browser's localStorage, which the server
// cannot read. `isHydrated` is false on the server and during hydration, so the
// first client render matches the server; it flips to true right after.
export function useGuestPlannerState() {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrated,
    getServerHydrated,
  )
  const defaultPreferences = useMemo(() => getDefaultPreferences(), [])
  // Read storage once, on the first hydrated render. Later edits are kept in
  // the overrides below and persisted by the write-back effect.
  const stored = useMemo(
    () => (isHydrated ? readWeeklyMenuPlannerState(getBrowserStorage()) : null),
    [isHydrated],
  )
  const [preferencesOverride, setGuestPreferences] =
    useState<Preferences | null>(null)
  const [recipesOverride, setLegacyCustomRecipes] = useState<
    RecipeInput[] | null
  >(null)
  const guestPreferences =
    preferencesOverride ?? stored?.savedPreferences ?? defaultPreferences
  const legacyCustomRecipes =
    recipesOverride ?? stored?.legacyCustomRecipes ?? NO_RECIPES

  const clearLegacyCustomRecipes = useCallback(
    () => setLegacyCustomRecipes([]),
    [],
  )

  useEffect(() => {
    if (!isHydrated) return
    writeWeeklyMenuPlannerState(getBrowserStorage(), {
      savedPreferences: guestPreferences,
      legacyCustomRecipes,
    })
  }, [isHydrated, legacyCustomRecipes, guestPreferences])

  return {
    isHydrated,
    guestPreferences,
    setGuestPreferences,
    legacyCustomRecipes,
    clearLegacyCustomRecipes,
  }
}

const NO_RECIPES: RecipeInput[] = []
