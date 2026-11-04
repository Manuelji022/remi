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
            className="planner-secondary-btn"
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
          className="panel-secondary-btn"
          disabled={isPending}
          type="button"
          onClick={onCancel}
        >
          {t('common.cancel')}
        </button>
        <button
          className="panel-primary-btn"
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
