import { useMemo } from 'react'
import { calendarWeekOffset } from '#/features/weekly-menu/hooks/usePlannerWeekNavigation'
import {
  selectCanAcceptPreview,
  selectGenerationState,
  selectLoadState,
  selectTourUserId,
  selectVisibleMenu,
  selectWeekDate,
  selectWriteState,
} from '#/features/weekly-menu/planner-view'
import type {
  AiGeneration,
  CurrentPreview,
  PlannerWeek,
  ReadyData,
} from '#/features/weekly-menu/planner-view'
import { shoppingList } from '#/features/weekly-menu/shopping'
import { getActivePreferencesBadgeCount } from '#/features/weekly-menu/types'
import type { Preferences } from '#/features/weekly-menu/types'
import { isWeekLocked, scheduleFromMenu } from '#/features/weekly-menu/week'
import { useI18n } from '#/shared/i18n'

interface PlannerStatusOptions {
  userId: string | undefined
  isSessionPending: boolean
  isHydrated: boolean
  isRecipeMutationPending: boolean
  viewedWeek: string
  aiGeneration: AiGeneration
  currentPreview: CurrentPreview
  plannerWeek: PlannerWeek
}

// Loading, writing and error status of the planner and its AI generation.
// Pure derivation: no state or effects of its own.
export function usePlannerStatus({
  userId,
  isSessionPending,
  isHydrated,
  isRecipeMutationPending,
  viewedWeek,
  aiGeneration,
  currentPreview,
  plannerWeek,
}: PlannerStatusOptions) {
  const { t } = useI18n()
  const { data, action } = plannerWeek
  const activeWeekStart = currentPreview?.menu.weekStart ?? viewedWeek
  const readyData = data?.status === 'ready' ? data : null
  const currentAction = action?.weekStart === activeWeekStart ? action : null
  const { currentGeneration, scheduleDialog, generatingTargetWeek } =
    selectGenerationState(aiGeneration.state, userId)
  const { isSavingPreferences, isAcceptingPreview, isWriting } =
    selectWriteState(currentAction, aiGeneration)
  const { isLoading, loadFailed, canWrite } = selectLoadState({
    userId,
    data,
    isHydrated,
    isSessionPending,
    isRecipeMutationPending,
  })
  const previewCatalogReady = Boolean(
    currentPreview && readyData?.weekStart === currentPreview.menu.weekStart,
  )
  const saveError =
    currentAction?.kind === 'save' && currentAction.status === 'error'
      ? t('planner.saveError')
      : null
  const previewSaveError =
    currentGeneration?.reason === 'save' ? t('planner.previewSaveError') : null
  const canAcceptPreview = selectCanAcceptPreview({
    userId,
    hasPreview: Boolean(currentPreview),
    previewCatalogReady,
    isSessionPending,
    isHydrated,
    isRecipeMutationPending,
    isWriting,
  })
  const canGenerateAnother = canAcceptPreview && aiGeneration.canRegenerate

  return {
    readyData,
    currentAction,
    currentGeneration,
    scheduleDialog,
    generatingTargetWeek,
    isGenerating: aiGeneration.isGenerating,
    isSavingPreferences,
    isAcceptingPreview,
    isSavingPreview: aiGeneration.isSaving || isAcceptingPreview,
    tourUserId: selectTourUserId(
      userId,
      Boolean(
        scheduleDialog || currentPreview || aiGeneration.hasUnsavedPreview,
      ),
    ),
    isWriting,
    isLoading,
    loadFailed,
    canWrite,
    previewCatalogReady,
    saveError,
    previewSaveError,
    canAcceptPreview,
    canGenerateAnother,
  }
}

interface PlannerWeekViewOptions {
  userId: string | undefined
  readyData: ReadyData | null
  currentPreview: CurrentPreview
  generatingTargetWeek: string | null
  guestPreferences: Preferences
  guestGridOpen: boolean
  weekOffset: number
  unlockedWeek: string | null
  viewedWeek: string
}

// What the planner shows for the viewed week: header labels, the visible menu,
// lock state and the shopping list. Pure derivation.
export function usePlannerWeekView({
  userId,
  readyData,
  currentPreview,
  generatingTargetWeek,
  guestPreferences,
  guestGridOpen,
  weekOffset,
  unlockedWeek,
  viewedWeek,
}: PlannerWeekViewOptions) {
  const { formatWeekRange } = useI18n()
  const menuWeek = readyData?.week.menu
  const savedPreferences = useMemo(
    () => (menuWeek ? scheduleFromMenu(menuWeek) : guestPreferences),
    [menuWeek, guestPreferences],
  )
  const displayPreferences = currentPreview
    ? scheduleFromMenu(currentPreview.menu)
    : savedPreferences
  const selectedWeekDate = selectWeekDate(
    currentPreview,
    generatingTargetWeek,
    weekOffset,
  )
  const visibleMenu = selectVisibleMenu({
    userId,
    readyData,
    currentPreview,
    guestGridOpen,
    savedPreferences,
    viewedWeek,
  })
  const isLocked = Boolean(
    visibleMenu &&
    !currentPreview &&
    !generatingTargetWeek &&
    isWeekLocked(viewedWeek, new Date()) &&
    unlockedWeek !== viewedWeek,
  )
  const shoppingEnabled = Boolean(
    userId && !currentPreview && readyData?.week.hasSavedMenu,
  )

  return {
    savedPreferences,
    selectedWeekDate,
    weekRange: formatWeekRange(selectedWeekDate),
    displayedWeekOffset: generatingTargetWeek
      ? calendarWeekOffset(generatingTargetWeek)
      : weekOffset,
    activePreferenceCount: getActivePreferencesBadgeCount(displayPreferences),
    visibleMenu,
    isLocked,
    shoppingEnabled,
    lines:
      shoppingEnabled && readyData
        ? shoppingList(readyData.week.menu, readyData.recipes)
        : [],
  }
}
