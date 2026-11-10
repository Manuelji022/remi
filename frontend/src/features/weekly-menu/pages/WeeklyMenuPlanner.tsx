import './weekly-menu-planner.css'
import { useEffect, useState } from 'react'
import { PlannerHeader } from '../components/PlannerHeader'
import { MainTab } from '../components/MainTab'
import { PreferencesPanel } from '../components/preferences-panel'
import type { PreferencesPanelTab } from '../components/preferences-panel/types'
import { PlannerContent } from '../components/PlannerContent'
import { PlannerDialogs } from '../components/PlannerDialogs'
import { PlannerFeedback } from '../components/PlannerFeedback'
import { useCheckedIngredients } from '../components/ShoppingTab'
import { authClient } from '#/features/auth/auth-client'
import { useAiMenuGeneration } from '#/features/weekly-menu/hooks/useAiMenuGeneration'
import { useFirstRunTour } from '#/features/weekly-menu/hooks/useFirstRunTour'
import { useGuestPlannerState } from '#/features/weekly-menu/hooks/useGuestPlannerState'
import {
  usePlannerWeekNavigation,
  usePreviewDiscardGuard,
} from '#/features/weekly-menu/hooks/usePlannerWeekNavigation'
import { usePlannerGeneration } from '#/features/weekly-menu/hooks/usePlannerGeneration'
import { usePlannerActions } from '#/features/weekly-menu/hooks/usePlannerActions'
import {
  usePlannerStatus,
  usePlannerWeekView,
} from '#/features/weekly-menu/hooks/usePlannerViewState'
import { usePlannerWeek } from '#/features/weekly-menu/hooks/usePlannerWeek'
import { viewWeekStart } from '#/features/weekly-menu/week'

type MainTabId = 'menu' | 'ingredients'

export function WeeklyMenuPlanner() {
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

  const {
    handleRetryLoad,
    handleOpenPreferences,
    acceptPreview,
    handleSavePreferences,
    handlePreviewRecipeChange,
  } = usePlannerActions({
    userId,
    plannerWeek,
    aiGeneration,
    readyData,
    currentPreview,
    hasVisibleMenu: Boolean(visibleMenu),
    viewedWeek,
    unlockedWeek,
    canWrite,
    isWriting,
    setWeekOffset,
    setPreferencesTab,
    setIsPreferencesOpen,
    setGuestPreferences,
  })

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
          canWrite={canWrite}
          isWriting={isWriting}
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
          action={currentAction}
        />

        <PlannerContent
          activeTab={activeTab}
          generatingTargetWeek={generatingTargetWeek}
          isLoading={isLoading}
          loadFailed={loadFailed}
          onRetryLoad={handleRetryLoad}
          tour={tour}
          currentPreview={currentPreview}
          readyData={readyData}
          previewCatalogReady={previewCatalogReady}
          isWriting={isWriting}
          isAcceptingPreview={isAcceptingPreview}
          previewSaveError={previewSaveError}
          canAcceptPreview={canAcceptPreview}
          canGenerateAnother={canGenerateAnother}
          userId={userId}
          isGenerating={isGenerating}
          visibleMenu={visibleMenu}
          viewedWeek={viewedWeek}
          isLocked={isLocked}
          shoppingEnabled={shoppingEnabled}
          shoppingLines={lines}
          checkedIngredients={checkedIngredients}
          onToggleIngredient={toggleIngredient}
          onGenerateAnother={generation.handleGenerateAnother}
          onEditSchedule={generation.editSchedule}
          onDiscard={openDiscardConfirmation}
          onAccept={() => void acceptPreview()}
          onGenerateMenu={generation.handleGenerateMenu}
          onUpdateRecipe={handlePreviewRecipeChange}
          onUnlockWeek={setUnlockedWeek}
        />
      </section>

      <PlannerDialogs
        generation={generation}
        tour={tour}
        scheduleDialog={scheduleDialog}
        isGenerating={isGenerating}
        hasPreview={Boolean(currentPreview)}
        showDiscard={isDiscardDialogOpen}
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
        onRecipeMutation={plannerWeek.refreshAfterRecipeMutation}
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
