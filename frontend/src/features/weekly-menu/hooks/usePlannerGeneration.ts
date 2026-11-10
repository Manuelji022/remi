import { useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { listRecipes } from '#/features/recipes/functions'
import type { MealSlot, Recipe } from '#/features/recipes/recipe'
import type { Day } from '#/features/weekly-menu/constants'
import type {
  DayContext,
  PlanningScope,
  Preferences,
} from '#/features/weekly-menu/types'
import type { useAiMenuGeneration } from '#/features/weekly-menu/hooks/useAiMenuGeneration'
import { hasManualEdits } from '#/features/weekly-menu/hooks/useAiMenuGeneration'
import type { useFirstRunTour } from '#/features/weekly-menu/hooks/useFirstRunTour'
import type { usePlannerWeek } from '#/features/weekly-menu/hooks/usePlannerWeek'
import type { PreferencesPanelTab } from '#/features/weekly-menu/components/preferences-panel/types'
import {
  applySchedule,
  emptyMenu,
  homePlannedSlotTypes,
} from '#/features/weekly-menu/week'

type AiGeneration = ReturnType<typeof useAiMenuGeneration>
type CurrentPreview = NonNullable<AiGeneration['preview']>

interface PlannerGenerationOptions {
  userId: string | undefined
  aiGeneration: AiGeneration
  plannerWeek: ReturnType<typeof usePlannerWeek>
  tour: ReturnType<typeof useFirstRunTour>
  currentPreview: CurrentPreview | null | undefined
  // Catalog of the loaded planner week, reused when ready.
  readyRecipes: readonly Recipe[] | null
  canWrite: boolean
  isWriting: boolean
  canGenerateAnother: boolean
  setActiveTab: (tab: 'menu') => void
  setGuestGridOpen: (open: boolean) => void
  setPreferencesTab: (tab: PreferencesPanelTab) => void
  setIsPreferencesOpen: Dispatch<SetStateAction<boolean>>
}

// AI generation and schedule orchestration for the planner: the recipe
// pre-check, the schedule dialog, "generate another" and retries.
export function usePlannerGeneration({
  userId,
  aiGeneration,
  plannerWeek,
  tour,
  currentPreview,
  readyRecipes,
  canWrite,
  isWriting,
  canGenerateAnother,
  setActiveTab,
  setGuestGridOpen,
  setPreferencesTab,
  setIsPreferencesOpen,
}: PlannerGenerationOptions) {
  const [showRecipesNotice, setShowRecipesNotice] = useState(false)
  const [missingRecipeSlots, setMissingRecipeSlots] = useState<MealSlot[]>([])
  const [showGenerateAnother, setShowGenerateAnother] = useState(false)
  const precheckPendingRef = useRef(false)
  const generateAnotherOpenerRef = useRef<HTMLElement | null>(null)
  const scheduleOpenerRef = useRef<HTMLElement | null>(null)
  const scheduleHeaderButtonRef = useRef<HTMLButtonElement | null>(null)

  // Missing-recipe warnings only belong to an open confirmation: clear them
  // during render once it closes, so no stale warning paints for a frame.
  if (aiGeneration.state.phase !== 'confirming' && missingRecipeSlots.length) {
    setMissingRecipeSlots([])
  }

  // Catalog is account-wide, so the loaded planner catalog is reused when
  // ready; otherwise ask the server. Returns null when it cannot be read.
  async function loadCatalog(): Promise<readonly Recipe[] | null> {
    if (readyRecipes) return readyRecipes
    try {
      return await listRecipes()
    } catch {
      return null
    }
  }

  function openRecipes() {
    setShowRecipesNotice(false)
    setMissingRecipeSlots([])
    aiGeneration.dismiss()
    setPreferencesTab('recipes')
    setIsPreferencesOpen(true)
  }

  function rememberScheduleOpener(fallback?: HTMLElement | null) {
    const activeElement = document.activeElement
    scheduleOpenerRef.current =
      fallback ?? (activeElement instanceof HTMLElement ? activeElement : null)
  }

  async function openGenerationSchedule(
    initialPreferences?: Preferences,
    mode: 'new' | 'edit' = 'new',
    targetOverride?: string,
    previewValue?: CurrentPreview,
    focusReturnFallback?: HTMLElement | null,
  ) {
    rememberScheduleOpener(focusReturnFallback)
    await aiGeneration.openSchedule({
      targetWeekStart: targetOverride,
      mode,
      preferences: initialPreferences,
      preview: previewValue,
    })
  }

  function editSchedule() {
    if (!currentPreview) return
    void openGenerationSchedule(
      undefined,
      'edit',
      currentPreview.menu.weekStart,
      currentPreview,
    )
  }

  function handleGenerateMenu() {
    if (!canWrite || isWriting || currentPreview) return
    setActiveTab('menu')
    plannerWeek.clearAction()
    if (!userId) {
      setGuestGridOpen(true)
      return
    }
    if (precheckPendingRef.current) return
    rememberScheduleOpener()
    precheckPendingRef.current = true
    void (async () => {
      try {
        const catalog = await loadCatalog()
        if (catalog && catalog.length === 0) {
          setShowRecipesNotice(true)
          return
        }
        await aiGeneration.openSchedule()
      } finally {
        precheckPendingRef.current = false
      }
    })()
  }

  function updateScheduleDayContext(day: Day, context: DayContext) {
    setMissingRecipeSlots([])
    aiGeneration.updateContext(day, context)
  }

  function updateSchedulePlanningScope(day: Day, scope: PlanningScope) {
    setMissingRecipeSlots([])
    aiGeneration.updateScope(day, scope)
  }

  function cancelScheduleConfirmation() {
    aiGeneration.dismiss()
  }

  async function confirmGenerationSchedule() {
    if (aiGeneration.state.phase !== 'confirming' || precheckPendingRef.current)
      return
    const { targetWeekStart, draft } = aiGeneration.state
    precheckPendingRef.current = true
    try {
      const catalog = await loadCatalog()
      if (catalog) {
        const needed = homePlannedSlotTypes(
          applySchedule(emptyMenu(targetWeekStart), draft),
        )
        const missing = needed.filter(
          (slot) => !catalog.some((recipe) => recipe.slot === slot),
        )
        if (missing.length > 0) {
          setMissingRecipeSlots(missing)
          return
        }
      }
      setMissingRecipeSlots([])
      plannerWeek.clearAction()
      setActiveTab('menu')
      if (tour.step === 1) tour.next()
      void aiGeneration.confirm()
    } finally {
      precheckPendingRef.current = false
    }
  }

  function startGenerateAnother() {
    setShowGenerateAnother(false)
    plannerWeek.clearAction()
    void aiGeneration.regenerate()
  }

  function handleGenerateAnother(opener: HTMLElement) {
    if (!currentPreview || !canGenerateAnother || showGenerateAnother) return
    generateAnotherOpenerRef.current = opener
    if (hasManualEdits(currentPreview)) setShowGenerateAnother(true)
    else startGenerateAnother()
  }

  function handleRetryGeneration() {
    rememberScheduleOpener(scheduleHeaderButtonRef.current)
    void aiGeneration.retry()
  }

  return {
    showRecipesNotice,
    closeRecipesNotice: () => setShowRecipesNotice(false),
    missingRecipeSlots,
    showGenerateAnother,
    cancelGenerateAnother: () => setShowGenerateAnother(false),
    generateAnotherOpenerRef,
    scheduleOpenerRef,
    scheduleHeaderButtonRef,
    openRecipes,
    openGenerationSchedule,
    editSchedule,
    handleGenerateMenu,
    updateScheduleDayContext,
    updateSchedulePlanningScope,
    cancelScheduleConfirmation,
    confirmGenerationSchedule,
    startGenerateAnother,
    handleGenerateAnother,
    handleRetryGeneration,
  }
}
