import './weekly-menu-planner.css'
import { useEffect, useState } from 'react'
import { AiMenuPreview } from '../components/AiMenuPreview'
import { WeekLockButton } from '../components/WeekLockButton'
import { MenuTab } from '../components/MenuTab'
import { PlannerHeader } from '../components/PlannerHeader'
import { MainTab } from '../components/MainTab'
import { PreferencesPanel } from '../components/preferences-panel'
import type { PreferencesPanelTab } from '../components/preferences-panel/types'
import { AiMenuSkeleton } from '../components/AiMenuSkeleton'
import { PlannerDialogs } from '../components/PlannerDialogs'
import { PlannerFeedback } from '../components/PlannerFeedback'
import { ShoppingTab, useCheckedIngredients } from '../components/ShoppingTab'
import type { Day } from '#/features/weekly-menu/constants'
import type { Preferences } from '#/features/weekly-menu/types'
import { authClient } from '#/features/auth/auth-client'
import { useAiMenuGeneration } from '#/features/weekly-menu/hooks/useAiMenuGeneration'
import { useFirstRunTour } from '#/features/weekly-menu/hooks/useFirstRunTour'
import { useGuestPlannerState } from '#/features/weekly-menu/hooks/useGuestPlannerState'
import {
  calendarWeekOffset,
  usePlannerWeekNavigation,
  usePreviewDiscardGuard,
} from '#/features/weekly-menu/hooks/usePlannerWeekNavigation'
import { usePlannerGeneration } from '#/features/weekly-menu/hooks/usePlannerGeneration'
import {
  usePlannerStatus,
  usePlannerWeekView,
} from '#/features/weekly-menu/hooks/usePlannerViewState'
import { dateFromWeekStart } from '#/features/weekly-menu/planner-view'
import { usePlannerWeek } from '#/features/weekly-menu/hooks/usePlannerWeek'
import { isWeekLocked, viewWeekStart } from '#/features/weekly-menu/week'
import type { MealSlot } from '#/features/recipes/recipe'
import { useI18n } from '#/shared/i18n'

type MainTabId = 'menu' | 'ingredients'

export function WeeklyMenuPlanner() {
  const { t, formatWeekRange } = useI18n()
  const [activeTab, setActiveTab] = useState<MainTabId>('menu')
  const { checkedIngredients, toggleIngredient } = useCheckedIngredients()
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)
  const {
    weekOffset,
    setWeekOffset,
    unlockedWeek,
    setUnlockedWeek,
    onPreviewWeek,
  } = usePlannerWeekNavigation()
  const {
    isHydrated,
    guestPreferences,
    setGuestPreferences,
    legacyCustomRecipes,
    clearLegacyCustomRecipes,
  } = useGuestPlannerState()
  const [isRecipeMutationPending, setIsRecipeMutationPending] = useState(false)
  const [guestGridOpen, setGuestGridOpen] = useState(false)
  const [preferencesTab, setPreferencesTab] =
    useState<PreferencesPanelTab>('schedule')
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const userId = session?.user.id
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const aiGeneration = useAiMenuGeneration({ userId, timeZone, onPreviewWeek })
  const currentPreview =
    aiGeneration.preview?.userId === userId ? aiGeneration.preview : null
  const hasUnsavedPreview = aiGeneration.hasUnsavedPreview
  const viewedWeek =
    currentPreview?.menu.weekStart ?? viewWeekStart(new Date(), weekOffset)
  const plannerWeek = usePlannerWeek({
    userId,
    weekStart: viewedWeek,
    enabled: isHydrated && !isSessionPending,
    preferencesOpen: isPreferencesOpen,
  })
  const {
    readyData,
    currentAction,
    currentGeneration,
    scheduleDialog,
    generatingTargetWeek,
    isGenerating,
    isSavingPreferences,
    isAcceptingPreview,
    isSavingPreview,
    tourUserId,
    isWriting,
    isLoading,
    loadFailed,
    canWrite,
    previewCatalogReady,
    saveError,
    previewSaveError,
    canAcceptPreview,
    canGenerateAnother,
  } = usePlannerStatus({
    userId,
    isSessionPending,
    isHydrated,
    isRecipeMutationPending,
    viewedWeek,
    aiGeneration,
    currentPreview,
    plannerWeek,
  })
  const tour = useFirstRunTour(tourUserId)
  const {
    savedPreferences,
    selectedWeekDate,
    weekRange,
    displayedWeekOffset,
    activePreferenceCount,
    visibleMenu,
    isLocked,
    shoppingEnabled,
    lines,
  } = usePlannerWeekView({
    userId,
    readyData,
    currentPreview,
    generatingTargetWeek,
    guestPreferences,
    guestGridOpen,
    weekOffset,
    unlockedWeek,
    viewedWeek,
  })

  const {
    isDiscardDialogOpen,
    openDiscardConfirmation,
    handleWeekNavigation,
    keepPreview,
    discardPreview,
  } = usePreviewDiscardGuard({
    hasUnsavedPreview,
    previewWeekStart: currentPreview?.menu.weekStart ?? null,
    isSavingPreview,
    discardPreview: aiGeneration.discard,
    weekOffset,
    setWeekOffset,
    setUnlockedWeek,
  })

  const generation = usePlannerGeneration({
    userId,
    aiGeneration,
    plannerWeek,
    tour,
    currentPreview,
    readyRecipes: readyData?.recipes ?? null,
    canWrite,
    isWriting,
    canGenerateAnother,
    setActiveTab,
    setGuestGridOpen,
    setPreferencesTab,
    setIsPreferencesOpen,
  })

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
    aiGeneration.updateRecipe(day, slot, recipeId, readyData?.recipes ?? [])
  }

  const targetWeekRange = scheduleDialog
    ? formatWeekRange(dateFromWeekStart(scheduleDialog.targetWeekStart))
    : { start: '', end: '' }
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
          isPreparingSchedule={aiGeneration.isPreparing}
          hasMenu={Boolean(visibleMenu)}
          onNavigate={handleWeekNavigation}
          onOpenPreferences={handleOpenPreferences}
          onGenerateMenu={generation.handleGenerateMenu}
          onGenerateButtonRef={(button) => {
            generation.scheduleHeaderButtonRef.current = button
          }}
        />

        <div className="planner-divider" />

        <div className="planner-toolbar">
          <MainTab
            activeTab={activeTab}
            isIngredientsDisabled={!shoppingEnabled || isWriting}
            neededItems={lines.length}
            onTabChange={setActiveTab}
          />
        </div>

        <PlannerFeedback
          generationReason={currentGeneration?.reason}
          retryGenerationDisabled={!canWrite || isWriting}
          onRetrySchedule={() => {
            void generation.openGenerationSchedule(
              undefined,
              'new',
              currentGeneration?.targetWeekStart,
              undefined,
              generation.scheduleHeaderButtonRef.current,
            )
          }}
          onRetryGeneration={generation.handleRetryGeneration}
          previewSaveError={previewSaveError}
          canAcceptPreview={canAcceptPreview}
          onRetryPreviewSave={() => void acceptPreview()}
          actionSuccess={
            currentAction?.status === 'success' ? currentAction.kind : null
          }
        />

        {generatingTargetWeek ? (
          <AiMenuSkeleton />
        ) : isLoading && !currentPreview ? (
          <div className="empty-state" role="status">
            <p>{t('planner.loadingWeek')}</p>
          </div>
        ) : loadFailed && !currentPreview ? (
          <div className="empty-state" role="alert">
            <h2>{t('planner.loadErrorTitle')}</h2>
            <p>{t('planner.loadErrorBody')}</p>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={handleRetryLoad}
            >
              {t('planner.retryLoad')}
            </button>
          </div>
        ) : activeTab === 'menu' ? (
          currentPreview ? (
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
              isLocalFallback={currentPreview.selectionSource === 'local'}
              canGenerateAnother={canGenerateAnother}
              onGenerateAnother={generation.handleGenerateAnother}
              onEditSchedule={() =>
                void generation.openGenerationSchedule(
                  undefined,
                  'edit',
                  currentPreview.menu.weekStart,
                  currentPreview,
                )
              }
              onDiscard={openDiscardConfirmation}
              onAccept={() => void acceptPreview()}
              onRetryCatalog={handleRetryLoad}
              onGenerateMenu={generation.handleGenerateMenu}
              onUpdateRecipe={handlePreviewRecipeChange}
            />
          ) : (
            <>
              {visibleMenu && (
                <WeekLockButton
                  key={viewedWeek}
                  isLocked={isLocked}
                  onUnlock={() => {
                    setUnlockedWeek(viewedWeek)
                    document
                      .querySelector<HTMLButtonElement>(
                        '.planner-actions .btn-secondary',
                      )
                      ?.focus()
                  }}
                />
              )}
              <MenuTab
                isGenerating={isGenerating}
                menu={visibleMenu}
                onGenerateMenu={generation.handleGenerateMenu}
                recipeNames={readyData?.week.recipeNames ?? {}}
                isSignedIn={Boolean(userId)}
              />
            </>
          )
        ) : shoppingEnabled ? (
          <ShoppingTab
            lines={lines}
            checklistId={JSON.stringify([userId, viewedWeek])}
            checkedIngredients={checkedIngredients}
            onToggleIngredient={toggleIngredient}
          />
        ) : null}
      </section>

      <PlannerDialogs
        generation={generation}
        tour={tour}
        schedule={
          scheduleDialog && !isGenerating
            ? {
                draft: scheduleDialog.draft,
                replacesSavedMenu: scheduleDialog.replacesSavedMenu,
              }
            : null
        }
        targetWeekRange={targetWeekRange}
        hasPreview={Boolean(currentPreview)}
        showDiscard={isDiscardDialogOpen && hasUnsavedPreview}
        onKeepPreview={keepPreview}
        onDiscardPreview={discardPreview}
        isDiscardSaving={isSavingPreview}
        isSaveUnconfirmed={Boolean(previewSaveError)}
      />

      <PreferencesPanel
        isOpen={isPreferencesOpen}
        initialTab={preferencesTab}
        isSaving={isSavingPreferences}
        isRecipeMutationPending={isRecipeMutationPending}
        onRecipeMutation={handleRecipeMutation}
        onRecipeMutationPendingChange={setIsRecipeMutationPending}
        scheduleLocked={isLocked}
        saveDisabled={
          isLocked || !canWrite || isWriting || Boolean(currentPreview)
        }
        saveError={saveError}
        legacyCustomRecipes={legacyCustomRecipes}
        onClose={() => {
          if (!isSavingPreferences) setIsPreferencesOpen(false)
        }}
        onLegacyRecipesMigrated={clearLegacyCustomRecipes}
        onSave={handleSavePreferences}
        savedPrefs={savedPreferences}
      />
    </main>
  )
}
