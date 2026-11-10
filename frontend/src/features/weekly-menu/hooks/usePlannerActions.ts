import type { Dispatch, SetStateAction } from 'react'
import type { MealSlot } from '#/features/recipes/recipe'
import type { Day } from '#/features/weekly-menu/constants'
import type { useAiMenuGeneration } from '#/features/weekly-menu/hooks/useAiMenuGeneration'
import type { usePlannerWeek } from '#/features/weekly-menu/hooks/usePlannerWeek'
import type { ReadyData } from '#/features/weekly-menu/planner-view'
import { calendarWeekOffset } from '#/features/weekly-menu/hooks/usePlannerWeekNavigation'
import type { PreferencesPanelTab } from '../components/preferences-panel/types'
import type { Preferences } from '#/features/weekly-menu/types'
import { isWeekLocked } from '#/features/weekly-menu/week'

type AiGeneration = ReturnType<typeof useAiMenuGeneration>

interface PlannerActionsOptions {
  userId: string | undefined
  plannerWeek: ReturnType<typeof usePlannerWeek>
  aiGeneration: AiGeneration
  readyData: ReadyData | null
  currentPreview: NonNullable<AiGeneration['preview']> | null | undefined
  hasVisibleMenu: boolean
  viewedWeek: string
  unlockedWeek: string | null
  canWrite: boolean
  isWriting: boolean
  setWeekOffset: (offset: number) => void
  setPreferencesTab: (tab: PreferencesPanelTab) => void
  setIsPreferencesOpen: Dispatch<SetStateAction<boolean>>
  setGuestPreferences: (preferences: Preferences) => void
}

// User actions of the planner: retry, open and save preferences, accept the
// AI preview and edit its recipes.
export function usePlannerActions({
  userId,
  plannerWeek,
  aiGeneration,
  readyData,
  currentPreview,
  hasVisibleMenu,
  viewedWeek,
  unlockedWeek,
  canWrite,
  isWriting,
  setWeekOffset,
  setPreferencesTab,
  setIsPreferencesOpen,
  setGuestPreferences,
}: PlannerActionsOptions) {
  function handleRetryLoad() {
    if (!isWriting) plannerWeek.retry()
  }

  function handleOpenPreferences() {
    if (!canWrite || isWriting || currentPreview) return
    plannerWeek.clearAction()
    setPreferencesTab('schedule')
    setIsPreferencesOpen(true)
  }

  async function acceptPreview() {
    const current = currentPreview
    const catalog = readyData
    if (
      !current ||
      !userId ||
      !catalog ||
      catalog.weekStart !== current.weekStart ||
      isWriting ||
      plannerWeek.ownsAccept({ userId, weekStart: current.weekStart })
    )
      return
    const accepted = await aiGeneration.accept((menu) =>
      plannerWeek.acceptPreview(menu, catalog.recipes),
    )
    if (accepted) setWeekOffset(calendarWeekOffset(current.weekStart))
  }

  async function writeMenu(preferences?: Preferences) {
    if (!canWrite || !readyData || !preferences) return
    const saved = await plannerWeek.savePreferences(
      preferences,
      readyData.week.menu,
    )
    if (saved) setIsPreferencesOpen(false)
  }

  function handleSavePreferences(preferences: Preferences) {
    if (!canWrite || isWriting || currentPreview) return
    const targetWeek = readyData?.week.menu.weekStart ?? viewedWeek
    if (
      hasVisibleMenu &&
      isWeekLocked(targetWeek, new Date()) &&
      unlockedWeek !== targetWeek
    )
      return
    if (!userId) {
      setGuestPreferences(preferences)
      setIsPreferencesOpen(false)
      return
    }
    void writeMenu(preferences)
  }

  function handlePreviewRecipeChange(
    day: Day,
    slot: MealSlot,
    recipeId: string | null,
  ) {
    if (
      userId &&
      currentPreview &&
      plannerWeek.ownsAccept({
        userId,
        weekStart: currentPreview.menu.weekStart,
      })
    )
      return
    aiGeneration.updateRecipe(day, slot, recipeId, readyData?.recipes ?? [])
  }

  return {
    handleRetryLoad,
    handleOpenPreferences,
    acceptPreview,
    handleSavePreferences,
    handlePreviewRecipeChange,
  }
}
