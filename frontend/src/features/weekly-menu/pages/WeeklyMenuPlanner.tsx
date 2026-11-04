import './weekly-menu-planner.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker } from '@tanstack/react-router'
import { AiMenuPreview } from '../components/AiMenuPreview'
import { PlannerHeader } from '../components/PlannerHeader'
import { AiMenuSkeleton } from '../components/AiMenuSkeleton'
import type { Day } from '#/features/weekly-menu/constants'
import { listRecipes } from '#/features/recipes/functions'
import {
  getActivePreferencesBadgeCount,
  getDefaultPreferences,
} from '#/features/weekly-menu/types'
import type {
  DayContext,
  PlanningScope,
  Preferences,
} from '#/features/weekly-menu/types'
import { authClient } from '#/features/auth/auth-client'
import { hasManualEdits } from '#/features/weekly-menu/hooks/useAiMenuGeneration'
import { useFirstRunTour } from '#/features/weekly-menu/hooks/useFirstRunTour'
import { usePlannerWeek } from '#/features/weekly-menu/hooks/usePlannerWeek'
import { shoppingList } from '#/features/weekly-menu/shopping'
import {
  applySchedule,
  assignRecipesToWeek,
  emptyMenu,
  homePlannedSlotTypes,
  isWeekLocked,
  scheduleFromMenu,
  viewWeekStart,
  weekStartFromDate,
} from '#/features/weekly-menu/week'
import type { MealSlot, Recipe, RecipeInput } from '#/features/recipes/recipe'
import { useI18n } from '#/shared/i18n'
import {
  getBrowserStorage,
  readWeeklyMenuPlannerState,
  writeWeeklyMenuPlannerState,
} from '#/features/weekly-menu/planner-storage'
import {
  PlannerGenerationProvider,
  usePlannerGeneration,
} from '../hooks/usePlannerGeneration'
import { PlannerBody } from './PlannerBody'
import { PlannerFeedback } from './PlannerFeedback'
import { PlannerDialogs } from './PlannerDialogs'
import type { PreferencesPanelTab } from '../components/preferences-panel/types'

type MainTabId = 'menu' | 'ingredients'

export function WeeklyMenuPlanner() {
  const { data: session } = authClient.useSession()
  const userId = session?.user.id
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const [previewWeekStart, setPreviewWeekStart] = useState<string | null>(null)

  return (
    <PlannerGenerationProvider
      userId={userId}
      timeZone={timeZone}
      onPreviewWeek={setPreviewWeekStart}
    >
      <WeeklyMenuPlannerContent previewWeekStart={previewWeekStart} />
    </PlannerGenerationProvider>
  )
}

interface WeeklyMenuPlannerContentProps {
  previewWeekStart: string | null
}

function WeeklyMenuPlannerContent({
  previewWeekStart,
}: WeeklyMenuPlannerContentProps) {
  const { t, formatWeekRange } = useI18n()
  const [activeTab, setActiveTab] = useState<MainTabId>('menu')
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(
    () => new Set(),
  )
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [unlockedWeek, setUnlockedWeek] = useState<string | null>(null)
  const [guestPreferences, setGuestPreferences] = useState<Preferences>(() =>
    getDefaultPreferences(),
  )
  const [legacyCustomRecipes, setLegacyCustomRecipes] = useState<RecipeInput[]>(
    [],
  )
  const [isRecipeMutationPending, setIsRecipeMutationPending] = useState(false)
  const [guestGridOpen, setGuestGridOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false)
  const [discardWeekOffset, setDiscardWeekOffset] = useState<number | null>(
    null,
  )
  const [preferencesTab, setPreferencesTab] =
    useState<PreferencesPanelTab>('schedule')
  const [showRecipesNotice, setShowRecipesNotice] = useState(false)
  const [missingRecipeSlots, setMissingRecipeSlots] = useState<MealSlot[]>([])
  const [showGenerateAnother, setShowGenerateAnother] = useState(false)
  const precheckPendingRef = useRef(false)
  const generateAnotherOpenerRef = useRef<HTMLElement | null>(null)
  const hasLoadedRef = useRef(false)
  const scheduleOpenerRef = useRef<HTMLElement | null>(null)
  const scheduleHeaderButtonRef = useRef<HTMLButtonElement | null>(null)
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const userId = session?.user.id

  // Handle preview week navigation
  useEffect(() => {
    if (previewWeekStart) {
      setUnlockedWeek(null)
      setWeekOffset(calendarWeekOffset(previewWeekStart))
    }
  }, [previewWeekStart])

  // Get generation state from context
  const {
    preview: currentPreview,
    hasUnsavedPreview,
    state: generationState,
    canRegenerate,
    openSchedule,
    updateContext,
    updateScope,
    confirm,
    regenerate,
    retry,
    updateRecipe,
    accept,
    discard,
    dismiss,
  } = usePlannerGeneration()

  const viewedWeek =
    currentPreview?.menu.weekStart ?? viewWeekStart(new Date(), weekOffset)
  const plannerWeek = usePlannerWeek({
    userId,
    weekStart: viewedWeek,
    enabled: isHydrated && !isSessionPending,
  })
  const { data, action } = plannerWeek

  const activeWeekStart = currentPreview?.menu.weekStart ?? viewedWeek
  const currentData = data
  const readyData = currentData?.status === 'ready' ? currentData : null
  const currentAction = action?.weekStart === activeWeekStart ? action : null
  const currentGeneration =
    generationState.phase === 'error' && generationState.userId === userId
      ? generationState
      : null
  const scheduleDialog =
    generationState.phase === 'confirming' ||
    generationState.phase === 'generating'
      ? generationState
      : null
  const tour = useFirstRunTour(
    scheduleDialog || currentPreview || hasUnsavedPreview ? userId : undefined,
  )
  const scheduleDraft = scheduleDialog?.draft
  const generatingTargetWeek =
    generationState.phase === 'generating' && generationState.userId === userId
      ? generationState.targetWeekStart
      : null
  const isPreparingSchedule = generationState.phase === 'preparing'
  const schedulePreparationError = currentGeneration?.reason === 'prepare'
  const isGenerating = generationState.phase === 'generating'
  const isSavingPreferences =
    currentAction?.kind === 'save' && currentAction.status === 'pending'
  const isAcceptingPreview =
    currentAction?.kind === 'accept' && currentAction.status === 'pending'
  const isWriting =
    isGenerating ||
    isSavingPreferences ||
    isAcceptingPreview ||
    isPreparingSchedule ||
    generationState.phase === 'saving'
  const isLoading =
    !isHydrated ||
    isSessionPending ||
    Boolean(userId && (!currentData || currentData.status === 'loading'))
  const loadFailed = Boolean(userId && currentData?.status === 'error')
  const canWrite =
    !isLoading &&
    !loadFailed &&
    !isRecipeMutationPending &&
    (!userId || Boolean(readyData))
  const menuWeek = readyData?.week.menu
  const savedPreferences = useMemo(
    () => (menuWeek ? scheduleFromMenu(menuWeek) : guestPreferences),
    [menuWeek, guestPreferences],
  )
  const displayPreferences = currentPreview
    ? scheduleFromMenu(currentPreview.menu)
    : savedPreferences
  const selectedWeekDate = generatingTargetWeek
    ? dateFromWeekStart(generatingTargetWeek)
    : currentPreview
      ? dateFromWeekStart(currentPreview.menu.weekStart)
      : new Date()
  if (!currentPreview && !generatingTargetWeek) {
    selectedWeekDate.setDate(selectedWeekDate.getDate() + weekOffset * 7)
  }
  const weekRange = formatWeekRange(selectedWeekDate)
  const displayedWeekOffset = generatingTargetWeek
    ? calendarWeekOffset(generatingTargetWeek)
    : weekOffset
  const activePreferenceCount =
    getActivePreferencesBadgeCount(displayPreferences)
  const previewCatalogReady = Boolean(
    currentPreview && readyData?.weekStart === currentPreview.menu.weekStart,
  )
  const visibleMenu = currentPreview
    ? currentPreview.menu
    : userId
      ? readyData?.week.hasSavedMenu
        ? readyData.week.menu
        : null
      : guestGridOpen
        ? assignRecipesToWeek(
            applySchedule(emptyMenu(viewedWeek), savedPreferences),
            [],
          )
        : null
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
  const lines =
    shoppingEnabled && readyData
      ? shoppingList(readyData.week.menu, readyData.recipes)
      : []
  const saveError =
    currentAction?.kind === 'save' && currentAction.status === 'error'
      ? t('planner.saveError')
      : null
  const previewSaveError =
    currentGeneration?.reason === 'save' ? t('planner.previewSaveError') : null
  const routeBlocker = useBlocker({
    shouldBlockFn: () => hasUnsavedPreview,
    enableBeforeUnload: () => hasUnsavedPreview,
    withResolver: true,
  })
  const isDiscardDialogOpen =
    showDiscardConfirmation || routeBlocker.status === 'blocked'

  useEffect(() => {
    if (hasUnsavedPreview) return
    setShowDiscardConfirmation(false)
    setDiscardWeekOffset(null)
    if (routeBlocker.status === 'blocked') routeBlocker.reset()
  }, [hasUnsavedPreview, routeBlocker])

  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    const stored = readWeeklyMenuPlannerState(getBrowserStorage())
    if (stored) {
      setGuestPreferences(stored.savedPreferences)
      setLegacyCustomRecipes(stored.legacyCustomRecipes)
    }
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    writeWeeklyMenuPlannerState(getBrowserStorage(), {
      savedPreferences: guestPreferences,
      legacyCustomRecipes,
    })
  }, [isHydrated, legacyCustomRecipes, guestPreferences])

  useEffect(() => {
    if (generationState.phase !== 'confirming') setMissingRecipeSlots([])
  }, [generationState.phase])

  useEffect(() => {
    setIsPreferencesOpen(false)
    setActiveTab('menu')
  }, [userId, viewedWeek])

  function handleRetryLoad() {
    if (!isWriting) plannerWeek.retry()
  }

  const handleRecipeMutation = plannerWeek.refreshAfterRecipeMutation

  function handleOpenPreferences() {
    if (!canWrite || isWriting || currentPreview) return
    plannerWeek.clearAction()
    setPreferencesTab('schedule')
    setIsPreferencesOpen(true)
  }

  // Catalog is account-wide, so the loaded planner catalog is reused when
  // ready; otherwise ask the server. Returns null when it cannot be read.
  async function loadCatalog(): Promise<readonly Recipe[] | null> {
    if (readyData) return readyData.recipes
    try {
      return await listRecipes()
    } catch {
      return null
    }
  }

  function openRecipes() {
    setShowRecipesNotice(false)
    setMissingRecipeSlots([])
    dismiss()
    setPreferencesTab('recipes')
    setIsPreferencesOpen(true)
  }

  async function openGenerationSchedule(
    initialPreferences?: Preferences,
    mode: 'new' | 'edit' = 'new',
    targetOverride?: string,
    previewValue?: NonNullable<typeof currentPreview>,
    focusReturnFallback?: HTMLElement | null,
  ) {
    rememberScheduleOpener(focusReturnFallback)
    await openSchedule({
      targetWeekStart: targetOverride,
      mode,
      preferences: initialPreferences,
      preview: previewValue,
    })
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
        await openSchedule()
      } finally {
        precheckPendingRef.current = false
      }
    })()
  }

  function rememberScheduleOpener(fallback?: HTMLElement | null) {
    const activeElement = document.activeElement
    scheduleOpenerRef.current =
      fallback ?? (activeElement instanceof HTMLElement ? activeElement : null)
  }

  function updateScheduleDayContext(day: Day, context: DayContext) {
    setMissingRecipeSlots([])
    updateContext(day, context)
  }

  function updateSchedulePlanningScope(day: Day, scope: PlanningScope) {
    setMissingRecipeSlots([])
    updateScope(day, scope)
  }

  function cancelScheduleConfirmation() {
    dismiss()
  }

  async function confirmGenerationSchedule() {
    if (generationState.phase !== 'confirming' || precheckPendingRef.current)
      return
    const { targetWeekStart, draft } = generationState
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
      void confirm()
    } finally {
      precheckPendingRef.current = false
    }
  }

  function startGenerateAnother() {
    setShowGenerateAnother(false)
    plannerWeek.clearAction()
    void regenerate()
  }

  function handleGenerateAnother(opener: HTMLElement) {
    if (!currentPreview || !canGenerateAnother || showGenerateAnother) return
    generateAnotherOpenerRef.current = opener
    if (hasManualEdits(currentPreview)) setShowGenerateAnother(true)
    else startGenerateAnother()
  }

  function handleRetryGeneration() {
    rememberScheduleOpener(scheduleHeaderButtonRef.current)
    void retry()
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
    const accepted = await accept((menu) =>
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
      visibleMenu &&
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
    updateRecipe(day, slot, recipeId, readyData?.recipes ?? [])
  }

  function handleWeekNavigation(nextOffset: number) {
    const clamped = Math.max(-1, Math.min(1, nextOffset))
    if (currentPreview) {
      setDiscardWeekOffset(clamped)
      setShowDiscardConfirmation(true)
      return
    }
    if (clamped !== weekOffset) setUnlockedWeek(null)
    setWeekOffset(clamped)
  }

  function keepPreview() {
    setShowDiscardConfirmation(false)
    setDiscardWeekOffset(null)
    if (routeBlocker.status === 'blocked') routeBlocker.reset()
  }

  function discardPreview() {
    if (generationState.phase === 'saving' || isAcceptingPreview) return
    discard()
    setShowDiscardConfirmation(false)
    const nextOffset = discardWeekOffset
    setDiscardWeekOffset(null)
    if (nextOffset !== null) setWeekOffset(nextOffset)
    else if (routeBlocker.status !== 'blocked' && currentPreview) {
      setWeekOffset(calendarWeekOffset(currentPreview.menu.weekStart))
    }
    if (routeBlocker.status === 'blocked') routeBlocker.proceed()
  }

  const handleLegacyRecipesMigrated = useCallback(() => {
    setLegacyCustomRecipes([])
  }, [])

  const targetWeekRange = scheduleDialog
    ? formatWeekRange(dateFromWeekStart(scheduleDialog.targetWeekStart))
    : { start: '', end: '' }
  const canAcceptPreview = Boolean(
    userId &&
    currentPreview &&
    previewCatalogReady &&
    !isSessionPending &&
    isHydrated &&
    !isRecipeMutationPending &&
    !isWriting,
  )
  const canGenerateAnother = Boolean(canAcceptPreview && canRegenerate)
  const generationErrorMessage =
    currentGeneration?.reason === 'stale-week'
      ? t('planner.aiStaleWeekError')
      : currentGeneration?.reason === 'rate-limited'
        ? t('planner.aiRateLimitError')
        : currentGeneration?.reason === 'in-progress'
          ? t('planner.aiInProgressError')
          : currentGeneration?.reason === 'generate'
            ? t('planner.aiGenerateError')
            : null

  return (
    <main className="planner-page" id="main">
      <section className="planner-shell" aria-labelledby="planner-title">
        <PlannerHeader
          weekDate={selectedWeekDate}
          weekRange={weekRange}
          weekOffset={displayedWeekOffset}
          isWriting={isWriting}
          canWrite={canWrite}
          hasPreview={Boolean(currentPreview)}
          preferenceCount={activePreferenceCount}
          isGenerating={isGenerating}
          isPreparingSchedule={isPreparingSchedule}
          hasMenu={Boolean(visibleMenu)}
          onNavigate={handleWeekNavigation}
          onOpenPreferences={handleOpenPreferences}
          onGenerateMenu={handleGenerateMenu}
          onGenerateButtonRef={(button) => {
            scheduleHeaderButtonRef.current = button
          }}
        />

        <div className="planner-divider" />

        <PlannerFeedback
          schedulePreparationError={schedulePreparationError}
          generationErrorMessage={generationErrorMessage}
          previewSaveError={previewSaveError}
          actionSuccess={currentAction?.status === 'success'}
          actionKind={currentAction?.kind}
          canAcceptPreview={canAcceptPreview}
          canWrite={canWrite}
          isWriting={isWriting}
          onRetryGeneration={handleRetryGeneration}
          onRetryScheduleLoad={(targetWeekStart) => {
            void openGenerationSchedule(
              undefined,
              'new',
              targetWeekStart,
              undefined,
              scheduleHeaderButtonRef.current,
            )
          }}
          onRetryPreviewSave={() => void acceptPreview()}
          currentGeneration={currentGeneration}
        />

        {generatingTargetWeek ? (
          <AiMenuSkeleton />
        ) : isLoading && !currentPreview ? (
          <div className="planner-empty-state" role="status">
            <p>{t('planner.loadingWeek')}</p>
          </div>
        ) : loadFailed && !currentPreview ? (
          <div className="planner-empty-state" role="alert">
            <h2>{t('planner.loadErrorTitle')}</h2>
            <p>{t('planner.loadErrorBody')}</p>
            <button
              className="planner-secondary-btn"
              type="button"
              onClick={handleRetryLoad}
            >
              {t('planner.retryLoad')}
            </button>
          </div>
        ) : currentPreview ? (
          <AiMenuPreview
            tour={tour}
            menu={currentPreview.menu}
            recipeNames={currentPreview.recipeNames}
            unavailableSlots={currentPreview.unavailableSlots}
            recipes={readyData?.recipes}
            isCatalogReady={previewCatalogReady}
            hasCatalogLoadFailed={loadFailed}
            isWriting={isWriting}
            isAccepting={isAcceptingPreview}
            isSaveUnconfirmed={Boolean(previewSaveError)}
            canAccept={canAcceptPreview}
            isSignedIn={Boolean(userId)}
            replacesSavedMenu={currentPreview.replacesSavedMenu}
            canGenerateAnother={canGenerateAnother}
            onGenerateAnother={handleGenerateAnother}
            onEditSchedule={() =>
              void openGenerationSchedule(
                undefined,
                'edit',
                currentPreview.menu.weekStart,
                currentPreview,
              )
            }
            onDiscard={() => setShowDiscardConfirmation(true)}
            onAccept={() => void acceptPreview()}
            onRetryCatalog={handleRetryLoad}
            onGenerateMenu={handleGenerateMenu}
            onUpdateRecipe={handlePreviewRecipeChange}
          />
        ) : (
          <PlannerBody
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isIngredientsDisabled={!shoppingEnabled || isWriting}
            neededItems={lines.length}
            visibleMenu={visibleMenu}
            isLocked={isLocked}
            viewedWeek={viewedWeek}
            onUnlock={() => {
              setUnlockedWeek(viewedWeek)
              document
                .querySelector<HTMLButtonElement>(
                  '.planner-actions .planner-secondary-btn',
                )
                ?.focus()
            }}
            onGenerateMenu={handleGenerateMenu}
            isGenerating={isGenerating}
            recipeNames={readyData?.week.recipeNames ?? {}}
            isSignedIn={Boolean(userId)}
            lines={lines}
            checklistId={JSON.stringify([userId, viewedWeek])}
            checkedIngredients={checkedIngredients}
            onToggleIngredient={(key) => {
              setCheckedIngredients((previous) => {
                const next = new Set(previous)
                if (next.has(key)) next.delete(key)
                else next.add(key)
                return next
              })
            }}
          />
        )}
      </section>

      <PlannerDialogs
        scheduleDialog={scheduleDialog}
        scheduleDraft={scheduleDraft}
        isGenerating={isGenerating}
        missingRecipeSlots={missingRecipeSlots}
        scheduleOpenerRef={scheduleOpenerRef}
        targetWeekRange={targetWeekRange}
        tour={tour}
        onUpdateDayContext={updateScheduleDayContext}
        onUpdatePlanningScope={updateSchedulePlanningScope}
        onCancelScheduleConfirmation={cancelScheduleConfirmation}
        onConfirmGenerationSchedule={() => void confirmGenerationSchedule()}
        onAddRecipes={openRecipes}
        showRecipesNotice={showRecipesNotice}
        onCloseRecipesNotice={() => setShowRecipesNotice(false)}
        showGenerateAnother={showGenerateAnother}
        currentPreview={currentPreview}
        generateAnotherOpenerRef={generateAnotherOpenerRef}
        onCancelGenerateAnother={() => setShowGenerateAnother(false)}
        onConfirmGenerateAnother={startGenerateAnother}
        isDiscardDialogOpen={isDiscardDialogOpen}
        hasUnsavedPreview={hasUnsavedPreview}
        isSaving={generationState.phase === 'saving'}
        isAcceptingPreview={isAcceptingPreview}
        isSaveUnconfirmed={Boolean(previewSaveError)}
        onKeepPreview={keepPreview}
        onDiscardPreview={discardPreview}
        isPreferencesOpen={isPreferencesOpen}
        preferencesTab={preferencesTab}
        isSavingPreferences={isSavingPreferences}
        isRecipeMutationPending={isRecipeMutationPending}
        onRecipeMutation={handleRecipeMutation}
        onRecipeMutationPendingChange={setIsRecipeMutationPending}
        scheduleLocked={isLocked}
        saveDisabled={
          isLocked || !canWrite || isWriting || Boolean(currentPreview)
        }
        saveError={saveError}
        legacyCustomRecipes={legacyCustomRecipes}
        onClosePreferences={() => {
          if (!isSavingPreferences) {
            setIsPreferencesOpen(false)
            void plannerWeek.refreshRecipes()
          }
        }}
        onLegacyRecipesMigrated={handleLegacyRecipesMigrated}
        onSavePreferences={handleSavePreferences}
        savedPrefs={savedPreferences}
      />
    </main>
  )
}

function dateFromWeekStart(weekStart: string): Date {
  const [year, month, day] = weekStart.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

function calendarWeekOffset(targetWeekStart: string): number {
  const currentWeekStart = weekStartFromDate(new Date())
  const dateNumber = (value: string) => {
    const [year, month, day] = value.split('-').map(Number)
    return Date.UTC(year, month - 1, day)
  }
  return Math.round(
    (dateNumber(targetWeekStart) - dateNumber(currentWeekStart)) /
      (7 * 24 * 60 * 60 * 1000),
  )
}
