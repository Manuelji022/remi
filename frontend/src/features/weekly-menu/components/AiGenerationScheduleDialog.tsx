import { Dialog } from '#/components/primitives/Dialog'
import type { Preferences } from '#/features/weekly-menu/types'
import type {
  ScheduleDayContextChange,
  SchedulePlanningScopeChange,
} from '#/features/weekly-menu/schedule-domain'
import { useI18n } from '#/shared/i18n'
import { ScheduleEditor } from './ScheduleEditor'

interface AiGenerationScheduleDialogProps {
  isPending: boolean
  preferences: Preferences
  targetWeekRange: { start: string; end: string }
  returnFocusTo: HTMLElement | null
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
