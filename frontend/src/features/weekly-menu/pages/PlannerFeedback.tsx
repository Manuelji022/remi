import type { AiGenerationState } from '../ai-generation-state'
import { useI18n } from '#/shared/i18n'

interface PlannerFeedbackProps {
  schedulePreparationError: boolean
  generationErrorMessage: string | null
  previewSaveError: string | null
  actionSuccess: boolean
  actionKind?: 'save' | 'accept'
  canAcceptPreview: boolean
  canWrite: boolean
  isWriting: boolean
  onRetryGeneration: () => void
  onRetryScheduleLoad: (targetWeekStart: string) => void
  onRetryPreviewSave: () => void
  currentGeneration: Extract<AiGenerationState, { phase: 'error' }> | null
}

export function PlannerFeedback({
  schedulePreparationError,
  generationErrorMessage,
  previewSaveError,
  actionSuccess,
  actionKind,
  canAcceptPreview,
  canWrite,
  isWriting,
  onRetryGeneration,
  onRetryScheduleLoad,
  onRetryPreviewSave,
  currentGeneration,
}: PlannerFeedbackProps) {
  const { t } = useI18n()

  if (schedulePreparationError && currentGeneration) {
    return (
      <div className="planner-feedback" role="alert">
        <p>{t('planner.aiScheduleLoadError')}</p>
        <button
          className="planner-secondary-btn"
          type="button"
          onClick={() => onRetryScheduleLoad(currentGeneration.targetWeekStart)}
        >
          {t('planner.aiRetryScheduleLoad')}
        </button>
      </div>
    )
  }

  if (generationErrorMessage) {
    return (
      <div className="planner-feedback" role="alert">
        <p>{generationErrorMessage}</p>
        {currentGeneration?.reason !== 'rate-limited' && (
          <button
            className="planner-secondary-btn"
            type="button"
            onClick={onRetryGeneration}
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
    )
  }

  if (previewSaveError) {
    return (
      <div className="planner-feedback" role="alert">
        <p>{previewSaveError}</p>
        <button
          className="planner-secondary-btn"
          type="button"
          onClick={onRetryPreviewSave}
          disabled={!canAcceptPreview}
        >
          {t('planner.retryPreviewSave')}
        </button>
      </div>
    )
  }

  if (actionSuccess) {
    return (
      <p className="planner-feedback" role="status">
        {t(
          actionKind === 'save'
            ? 'planner.preferencesSaved'
            : 'planner.menuSaved',
        )}
      </p>
    )
  }

  return null
}
