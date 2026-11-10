import './weekly-menu-planner.css'
import { useEffect, useMemo, useState } from 'react'
import { AiMenuPreview } from '../components/AiMenuPreview'
import { WeekLockButton } from '../components/WeekLockButton'
import { MenuTab } from '../components/MenuTab'
import { PlannerHeader } from '../components/PlannerHeader'
import { MainTab } from '../components/MainTab'
import { PreferencesPanel } from '../components/preferences-panel'
import type { PreferencesPanelTab } from '../components/preferences-panel/types'
import { AiMenuSkeleton } from '../components/AiMenuSkeleton'
import { RecipesNeededDialog } from '../components/RecipesNeededDialog'
import { AiGenerationScheduleDialog } from '../components/AiGenerationScheduleDialog'
import { DiscardPreviewDialog } from '../components/DiscardPreviewDialog'
import { GenerateAnotherDialog } from '../components/GenerateAnotherDialog'
import type { Day } from '#/features/weekly-menu/constants'
import { formatRecipeIngredient } from '#/features/recipes/format'
import { getActivePreferencesBadgeCount } from '#/features/weekly-menu/types'
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
import { usePlannerWeek } from '#/features/weekly-menu/hooks/usePlannerWeek'
import { shoppingList } from '#/features/weekly-menu/shopping'
import type { ShoppingLine } from '#/features/weekly-menu/shopping'
import {
  applySchedule,
  assignRecipesToWeek,
  emptyMenu,
  isWeekLocked,
  scheduleFromMenu,
  viewWeekStart,
} from '#/features/weekly-menu/week'
import type { MealSlot } from '#/features/recipes/recipe'
import { useI18n } from '#/shared/i18n'

type MainTabId = 'menu' | 'ingredients'

export function WeeklyMenuPlanner() {
  const { t, formatWeekRange } = useI18n()
  const [activeTab, setActiveTab] = useState<MainTabId>('menu')
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(
    () => new Set(),
  )
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
  const { data, action } = plannerWeek

  const activeWeekStart = currentPreview?.menu.weekStart ?? viewedWeek
  const currentData = data
  const readyData = currentData?.status === 'ready' ? currentData : null
  const currentAction = action?.weekStart === activeWeekStart ? action : null
  const currentGeneration =
    aiGeneration.state.phase === 'error' && aiGeneration.state.userId === userId
      ? aiGeneration.state
      : null
  const scheduleDialog =
    aiGeneration.state.phase === 'confirming' ||
    aiGeneration.state.phase === 'generating'
      ? aiGeneration.state
      : null
  const tour = useFirstRunTour(
    scheduleDialog || currentPreview || aiGeneration.hasUnsavedPreview
      ? userId
      : undefined,
  )
  const scheduleDraft = scheduleDialog?.draft
  const generatingTargetWeek =
    aiGeneration.state.phase === 'generating' &&
    aiGeneration.state.userId === userId
      ? aiGeneration.state.targetWeekStart
      : null
  const isPreparingSchedule = aiGeneration.isPreparing
  const schedulePreparationError = currentGeneration?.reason === 'prepare'
  const isGenerating = aiGeneration.isGenerating
  const isSavingPreferences =
    currentAction?.kind === 'save' && currentAction.status === 'pending'
  const isAcceptingPreview =
    currentAction?.kind === 'accept' && currentAction.status === 'pending'
  const isWriting =
    isGenerating ||
    isSavingPreferences ||
    isAcceptingPreview ||
    aiGeneration.isPreparing ||
    aiGeneration.isSaving
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
  const canAcceptPreview = Boolean(
    userId &&
    currentPreview &&
    previewCatalogReady &&
    !isSessionPending &&
    isHydrated &&
    !isRecipeMutationPending &&
    !isWriting,
  )
  const canGenerateAnother = Boolean(
    canAcceptPreview && aiGeneration.canRegenerate,
  )
  const {
    isDiscardDialogOpen,
    openDiscardConfirmation,
    handleWeekNavigation,
    keepPreview,
    discardPreview,
  } = usePreviewDiscardGuard({
    hasUnsavedPreview,
    previewWeekStart: currentPreview?.menu.weekStart ?? null,
    isSavingPreview: aiGeneration.isSaving || isAcceptingPreview,
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

        {schedulePreparationError && (
          <div className="planner-feedback" role="alert">
            <p>{t('planner.aiScheduleLoadError')}</p>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                void generation.openGenerationSchedule(
                  undefined,
                  'new',
                  currentGeneration.targetWeekStart,
                  undefined,
                  generation.scheduleHeaderButtonRef.current,
                )
              }}
            >
              {t('planner.aiRetryScheduleLoad')}
            </button>
          </div>
        )}

        {generationErrorMessage && (
          <div className="planner-feedback" role="alert">
            <p>{generationErrorMessage}</p>
            {currentGeneration?.reason !== 'rate-limited' && (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={generation.handleRetryGeneration}
                disabled={!canWrite || isWriting}
              >
                {t(
                  currentGeneration?.reason === 'stale-week'
                    ? 'planner.aiReconfirmSchedule'
                    : 'planner.retryGenerate',
                )}
              </button>
            )}
          </div>
        )}

        {previewSaveError && (
          <div className="planner-feedback" role="alert">
            <p>{previewSaveError}</p>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => void acceptPreview()}
              disabled={!canAcceptPreview}
            >
              {t('planner.retryPreviewSave')}
            </button>
          </div>
        )}

        {currentAction?.status === 'success' && (
          <p className="planner-feedback" role="status">
            {t(
              currentAction.kind === 'save'
                ? 'planner.preferencesSaved'
                : 'planner.menuSaved',
            )}
          </p>
        )}

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
            onToggleIngredient={(key) => {
              setCheckedIngredients((previous) => {
                const next = new Set(previous)
                if (next.has(key)) next.delete(key)
                else next.add(key)
                return next
              })
            }}
          />
        ) : null}
      </section>

      {scheduleDialog && scheduleDraft && !isGenerating && (
        <AiGenerationScheduleDialog
          tour={tour}
          isPending={false}
          missingRecipeSlots={generation.missingRecipeSlots}
          replacesSavedMenu={scheduleDialog.replacesSavedMenu}
          onAddRecipes={generation.openRecipes}
          preferences={scheduleDraft}
          targetWeekRange={targetWeekRange}
          returnFocusTo={generation.scheduleOpenerRef.current}
          onCancel={generation.cancelScheduleConfirmation}
          onConfirm={() => void generation.confirmGenerationSchedule()}
          onUpdateDayContext={generation.updateScheduleDayContext}
          onUpdatePlanningScope={generation.updateSchedulePlanningScope}
        />
      )}

      {generation.showRecipesNotice && (
        <RecipesNeededDialog
          returnFocusTo={generation.scheduleOpenerRef.current}
          onAddRecipes={generation.openRecipes}
          onClose={generation.closeRecipesNotice}
        />
      )}

      {generation.showGenerateAnother && currentPreview && (
        <GenerateAnotherDialog
          returnFocusTo={generation.generateAnotherOpenerRef.current}
          onCancel={generation.cancelGenerateAnother}
          onConfirm={generation.startGenerateAnother}
        />
      )}

      {isDiscardDialogOpen && hasUnsavedPreview && (
        <DiscardPreviewDialog
          onKeep={keepPreview}
          onDiscard={discardPreview}
          isSaving={aiGeneration.isSaving || isAcceptingPreview}
          isSaveUnconfirmed={Boolean(previewSaveError)}
        />
      )}

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

function dateFromWeekStart(weekStart: string): Date {
  const [year, month, day] = weekStart.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

function ShoppingTab({
  lines,
  checklistId,
  checkedIngredients,
  onToggleIngredient,
}: {
  lines: readonly ShoppingLine[]
  checklistId: string
  checkedIngredients: ReadonlySet<string>
  onToggleIngredient: (key: string) => void
}) {
  const { t } = useI18n()

  return (
    <div className="planner-shopping-tab">
      <h2>{t('tabs.ingredients')}</h2>
      <p className="planner-shopping-helper">{t('planner.shoppingHelper')}</p>
      {lines.length === 0 ? (
        <p>{t('planner.shoppingEmpty')}</p>
      ) : (
        <ul>
          {lines.map((line) => {
            const key = JSON.stringify([
              checklistId,
              line.name,
              line.unit,
              line.quantity,
            ])

            return (
              <li key={key}>
                <label className="planner-shopping-item">
                  <input
                    type="checkbox"
                    checked={checkedIngredients.has(key)}
                    onChange={() => onToggleIngredient(key)}
                  />
                  <span>
                    {formatRecipeIngredient(line, (unit) => t(`units.${unit}`))}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
