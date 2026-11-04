import { AiGenerationScheduleDialog } from '../components/AiGenerationScheduleDialog'
import { DiscardPreviewDialog } from '../components/DiscardPreviewDialog'
import { GenerateAnotherDialog } from '../components/GenerateAnotherDialog'
import { RecipesNeededDialog } from '../components/RecipesNeededDialog'
import { PreferencesPanel } from '../components/preferences-panel'
import type { PreferencesPanelTab } from '../components/preferences-panel/types'
import type { MealSlot, RecipeInput } from '#/features/recipes/recipe'
import type { Preferences } from '../types'
import type { useFirstRunTour } from '../hooks/useFirstRunTour'

interface PlannerDialogsProps {
  // Schedule dialog
  scheduleDialog: any
  scheduleDraft: Preferences | undefined
  isGenerating: boolean
  missingRecipeSlots: MealSlot[]
  scheduleOpenerRef: React.MutableRefObject<HTMLElement | null>
  targetWeekRange: { start: string; end: string }
  tour: ReturnType<typeof useFirstRunTour>
  onUpdateDayContext: (day: any, context: any) => void
  onUpdatePlanningScope: (day: any, scope: any) => void
  onCancelScheduleConfirmation: () => void
  onConfirmGenerationSchedule: () => void
  onAddRecipes: () => void

  // Recipes dialog
  showRecipesNotice: boolean
  onCloseRecipesNotice: () => void

  // Generate another dialog
  showGenerateAnother: boolean
  currentPreview: any
  generateAnotherOpenerRef: React.MutableRefObject<HTMLElement | null>
  onCancelGenerateAnother: () => void
  onConfirmGenerateAnother: () => void

  // Discard dialog
  isDiscardDialogOpen: boolean
  hasUnsavedPreview: boolean
  isSaving: boolean
  isAcceptingPreview: boolean
  isSaveUnconfirmed: boolean
  onKeepPreview: () => void
  onDiscardPreview: () => void

  // Preferences panel
  isPreferencesOpen: boolean
  preferencesTab: PreferencesPanelTab
  isSavingPreferences: boolean
  isRecipeMutationPending: boolean
  onRecipeMutation: () => Promise<void>
  onRecipeMutationPendingChange: (pending: boolean) => void
  scheduleLocked: boolean
  saveDisabled: boolean
  saveError: string | null
  legacyCustomRecipes: RecipeInput[]
  onClosePreferences: () => void
  onLegacyRecipesMigrated: () => void
  onSavePreferences: (prefs: Preferences) => void
  savedPrefs: Preferences
}

export function PlannerDialogs({
  // Schedule dialog
  scheduleDialog,
  scheduleDraft,
  isGenerating,
  missingRecipeSlots,
  scheduleOpenerRef,
  targetWeekRange,
  tour,
  onUpdateDayContext,
  onUpdatePlanningScope,
  onCancelScheduleConfirmation,
  onConfirmGenerationSchedule,
  onAddRecipes,

  // Recipes dialog
  showRecipesNotice,
  onCloseRecipesNotice,

  // Generate another dialog
  showGenerateAnother,
  currentPreview,
  generateAnotherOpenerRef,
  onCancelGenerateAnother,
  onConfirmGenerateAnother,

  // Discard dialog
  isDiscardDialogOpen,
  hasUnsavedPreview,
  isSaving,
  isAcceptingPreview,
  isSaveUnconfirmed,
  onKeepPreview,
  onDiscardPreview,

  // Preferences panel
  isPreferencesOpen,
  preferencesTab,
  isSavingPreferences,
  isRecipeMutationPending,
  onRecipeMutation,
  onRecipeMutationPendingChange,
  scheduleLocked,
  saveDisabled,
  saveError,
  legacyCustomRecipes,
  onClosePreferences,
  onLegacyRecipesMigrated,
  onSavePreferences,
  savedPrefs,
}: PlannerDialogsProps) {
  return (
    <>
      {scheduleDialog && scheduleDraft && !isGenerating && (
        <AiGenerationScheduleDialog
          tour={tour}
          isPending={false}
          missingRecipeSlots={missingRecipeSlots}
          replacesSavedMenu={scheduleDialog.replacesSavedMenu}
          onAddRecipes={onAddRecipes}
          preferences={scheduleDraft}
          targetWeekRange={targetWeekRange}
          returnFocusTo={scheduleOpenerRef.current}
          onCancel={onCancelScheduleConfirmation}
          onConfirm={onConfirmGenerationSchedule}
          onUpdateDayContext={onUpdateDayContext}
          onUpdatePlanningScope={onUpdatePlanningScope}
        />
      )}

      {showRecipesNotice && (
        <RecipesNeededDialog
          returnFocusTo={scheduleOpenerRef.current}
          onAddRecipes={onAddRecipes}
          onClose={onCloseRecipesNotice}
        />
      )}

      {showGenerateAnother && currentPreview && (
        <GenerateAnotherDialog
          returnFocusTo={generateAnotherOpenerRef.current}
          onCancel={onCancelGenerateAnother}
          onConfirm={onConfirmGenerateAnother}
        />
      )}

      {isDiscardDialogOpen && hasUnsavedPreview && (
        <DiscardPreviewDialog
          onKeep={onKeepPreview}
          onDiscard={onDiscardPreview}
          isSaving={isSaving || isAcceptingPreview}
          isSaveUnconfirmed={isSaveUnconfirmed}
        />
      )}

      <PreferencesPanel
        isOpen={isPreferencesOpen}
        initialTab={preferencesTab}
        isSaving={isSavingPreferences}
        isRecipeMutationPending={isRecipeMutationPending}
        onRecipeMutation={onRecipeMutation}
        onRecipeMutationPendingChange={onRecipeMutationPendingChange}
        scheduleLocked={scheduleLocked}
        saveDisabled={saveDisabled}
        saveError={saveError}
        legacyCustomRecipes={legacyCustomRecipes}
        onClose={onClosePreferences}
        onLegacyRecipesMigrated={onLegacyRecipesMigrated}
        onSave={onSavePreferences}
        savedPrefs={savedPrefs}
      />
    </>
  )
}
