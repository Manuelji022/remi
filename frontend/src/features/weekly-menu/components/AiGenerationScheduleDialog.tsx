import { TourCallout } from './TourCallout'
import type { useFirstRunTour } from '../hooks/useFirstRunTour'
import { Dialog } from '#/components/primitives/Dialog'
import type { Preferences } from '#/features/weekly-menu/types'
import type {
  ScheduleDayContextChange,
  SchedulePlanningScopeChange,
} from '#/features/weekly-menu/schedule-domain'
import type { MealSlot } from '#/features/recipes/recipe'
import { useI18n } from '#/shared/i18n'
import { ScheduleEditor } from './ScheduleEditor'

interface AiGenerationScheduleDialogProps {
  tour: ReturnType<typeof useFirstRunTour>
  isPending: boolean
  preferences: Preferences
  targetWeekRange: { start: string; end: string }
  returnFocusTo: HTMLElement | null
  missingRecipeSlots: readonly MealSlot[]
  replacesSavedMenu: boolean
  onAddRecipes: () => void
  onCancel: () => void
  onConfirm: () => void
  onUpdateDayContext: ScheduleDayContextChange
  onUpdatePlanningScope: SchedulePlanningScopeChange
}

export function AiGenerationScheduleDialog({
  tour,
  isPending,
  preferences,
  targetWeekRange,
  returnFocusTo,
  missingRecipeSlots,
  replacesSavedMenu,
  onAddRecipes,
  onCancel,
  onConfirm,
  onUpdateDayContext,
  onUpdatePlanningScope,
}: AiGenerationScheduleDialogProps) {
  const { t } = useI18n()
  return (
    <Dialog
      className="planner-ai-dialog"
      describedBy="ai-generation-description"
      labelledBy="ai-generation-title"
      returnFocusTo={returnFocusTo}
      onDismiss={onCancel}
      dismissDisabled={isPending}
    >
      <header className="planner-ai-dialog-header">
        <div>
          <p className="panel-section-kicker">
            {t('planner.aiScheduleKicker')}
          </p>
          <h2 id="ai-generation-title">{t('planner.aiScheduleTitle')}</h2>
          <p className="planner-ai-dialog-range">
            {targetWeekRange.start} – {targetWeekRange.end}
          </p>
        </div>
      </header>
      <p id="ai-generation-description" className="planner-ai-dialog-copy">
        {t('planner.aiScheduleBody')}
      </p>
      <fieldset className="planner-ai-schedule-fields" disabled={isPending}>
        <ScheduleEditor
          dayContexts={preferences.dayContexts}
          planningScopes={preferences.planningScopes}
          onUpdateDayContext={onUpdateDayContext}
          onUpdatePlanningScope={onUpdatePlanningScope}
        />
      </fieldset>
      {tour.step === 1 && (
        <TourCallout
          step={1}
          title={t('planner.tourScheduleTitle')}
          body={t('planner.tourScheduleBody')}
          isLast={false}
          onNext={tour.next}
          onSkip={tour.skip}
        />
      )}
      {missingRecipeSlots.length > 0 && (
        <div className="planner-feedback" role="alert">
          <p>
            {t(
              missingRecipeSlots.length > 1
                ? 'planner.aiMissingBothRecipes'
                : missingRecipeSlots[0] === 'lunch'
                  ? 'planner.aiMissingLunchRecipes'
                  : 'planner.aiMissingDinnerRecipes',
            )}
          </p>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={onAddRecipes}
          >
            {t('planner.aiAddRecipes')}
          </button>
        </div>
      )}
      {replacesSavedMenu && (
        <p className="planner-ai-replace-note">{t('planner.aiReplaceNote')}</p>
      )}
      <footer className="planner-ai-dialog-footer">
        <button
          className="btn btn-secondary"
          disabled={isPending}
          type="button"
          onClick={onCancel}
        >
          {t('common.cancel')}
        </button>
        <button
          className="btn btn-primary"
          disabled={isPending}
          type="button"
          onClick={onConfirm}
        >
          {t(isPending ? 'planner.generating' : 'planner.aiConfirmSchedule')}
        </button>
      </footer>
    </Dialog>
  )
}
