import type { useAiMenuGeneration } from '#/features/weekly-menu/hooks/useAiMenuGeneration'
import type { usePlannerWeek } from '#/features/weekly-menu/hooks/usePlannerWeek'
import type { Preferences } from '#/features/weekly-menu/types'
import {
  applySchedule,
  assignRecipesToWeek,
  emptyMenu,
} from '#/features/weekly-menu/week'

// Plain selectors behind the planner view-state hooks (no React state).

export type AiGeneration = ReturnType<typeof useAiMenuGeneration>
export type PlannerWeek = ReturnType<typeof usePlannerWeek>
export type CurrentPreview =
  NonNullable<AiGeneration['preview']> | null | undefined
export type ReadyData = Extract<
  NonNullable<PlannerWeek['data']>,
  { status: 'ready' }
>

export function dateFromWeekStart(weekStart: string): Date {
  const [year, month, day] = weekStart.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

// Supply an account only while its AI flow is open (see useFirstRunTour).
export function selectTourUserId(
  userId: string | undefined,
  isAiFlowOpen: boolean,
) {
  return isAiFlowOpen ? userId : undefined
}

export function selectCanAcceptPreview(flags: {
  userId: string | undefined
  hasPreview: boolean
  previewCatalogReady: boolean
  isSessionPending: boolean
  isHydrated: boolean
  isRecipeMutationPending: boolean
  isWriting: boolean
}) {
  return Boolean(
    flags.userId &&
    flags.hasPreview &&
    flags.previewCatalogReady &&
    !flags.isSessionPending &&
    flags.isHydrated &&
    !flags.isRecipeMutationPending &&
    !flags.isWriting,
  )
}

export function selectGenerationState(
  state: AiGeneration['state'],
  userId: string | undefined,
) {
  return {
    currentGeneration:
      state.phase === 'error' && state.userId === userId ? state : null,
    scheduleDialog:
      state.phase === 'confirming' || state.phase === 'generating'
        ? state
        : null,
    generatingTargetWeek:
      state.phase === 'generating' && state.userId === userId
        ? state.targetWeekStart
        : null,
  }
}

export function selectWriteState(
  currentAction: PlannerWeek['action'] | null,
  aiGeneration: AiGeneration,
) {
  const isSavingPreferences =
    currentAction?.kind === 'save' && currentAction.status === 'pending'
  const isAcceptingPreview =
    currentAction?.kind === 'accept' && currentAction.status === 'pending'
  return {
    isSavingPreferences,
    isAcceptingPreview,
    isWriting:
      aiGeneration.isGenerating ||
      isSavingPreferences ||
      isAcceptingPreview ||
      aiGeneration.isPreparing ||
      aiGeneration.isSaving,
  }
}

export function selectLoadState({
  userId,
  data,
  isHydrated,
  isSessionPending,
  isRecipeMutationPending,
}: {
  userId: string | undefined
  data: PlannerWeek['data']
  isHydrated: boolean
  isSessionPending: boolean
  isRecipeMutationPending: boolean
}) {
  const isLoading =
    !isHydrated ||
    isSessionPending ||
    Boolean(userId && (!data || data.status === 'loading'))
  const loadFailed = Boolean(userId && data?.status === 'error')
  return {
    isLoading,
    loadFailed,
    canWrite:
      !isLoading &&
      !loadFailed &&
      !isRecipeMutationPending &&
      (!userId || data?.status === 'ready'),
  }
}

export function selectWeekDate(
  currentPreview: CurrentPreview,
  generatingTargetWeek: string | null,
  weekOffset: number,
) {
  if (generatingTargetWeek) return dateFromWeekStart(generatingTargetWeek)
  if (currentPreview) return dateFromWeekStart(currentPreview.menu.weekStart)
  const date = new Date()
  date.setDate(date.getDate() + weekOffset * 7)
  return date
}

export function selectVisibleMenu({
  userId,
  readyData,
  currentPreview,
  guestGridOpen,
  savedPreferences,
  viewedWeek,
}: {
  userId: string | undefined
  readyData: ReadyData | null
  currentPreview: CurrentPreview
  guestGridOpen: boolean
  savedPreferences: Preferences
  viewedWeek: string
}) {
  if (currentPreview) return currentPreview.menu
  if (userId) {
    return readyData?.week.hasSavedMenu ? readyData.week.menu : null
  }
  if (!guestGridOpen) return null
  return assignRecipesToWeek(
    applySchedule(emptyMenu(viewedWeek), savedPreferences),
    [],
  )
}
