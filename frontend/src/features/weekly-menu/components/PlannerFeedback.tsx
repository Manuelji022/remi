import { useI18n } from '#/shared/i18n'

type GenerationReason =
  | 'prepare'
  | 'save'
  | 'stale-week'
  | 'rate-limited'
  | 'in-progress'
  | 'generate'

const GENERATION_ERROR_KEYS = {
  'stale-week': 'planner.aiStaleWeekError',
  'rate-limited': 'planner.aiRateLimitError',
  'in-progress': 'planner.aiInProgressError',
  generate: 'planner.aiGenerateError',
} as const

interface PlannerFeedbackProps {
  generationReason: GenerationReason | undefined
  canWrite: boolean
  isWriting: boolean
  onRetrySchedule: () => void
  onRetryGeneration: () => void
  previewSaveError: string | null
  canAcceptPreview: boolean
  onRetryPreviewSave: () => void
  action: { kind: 'save' | 'accept'; status: string } | null
}

export function PlannerFeedback({
  generationReason,
  canWrite,
  isWriting,
  onRetrySchedule,
  onRetryGeneration,
  previewSaveError,
  canAcceptPreview,
  onRetryPreviewSave,
  action,
}: PlannerFeedbackProps) {
  const { t } = useI18n()
  const errorMessageKey =
    generationReason && generationReason in GENERATION_ERROR_KEYS
      ? GENERATION_ERROR_KEYS[
          generationReason as keyof typeof GENERATION_ERROR_KEYS
        ]
      : null
  const generationErrorMessage = errorMessageKey ? t(errorMessageKey) : null

  return (
    <>
      {generationReason === 'prepare' && (
        <div className="planner-feedback" role="alert">
          <p>{t('planner.aiScheduleLoadError')}</p>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={onRetrySchedule}
          >
            {t('planner.aiRetryScheduleLoad')}
          </button>
        </div>
      )}

      {generationErrorMessage && (
        <div className="planner-feedback" role="alert">
          <p>{generationErrorMessage}</p>
          {generationReason !== 'rate-limited' && (
            <button
              className="btn btn-secondary"
              type="button"
              onClick={onRetryGeneration}
              disabled={!canWrite || isWriting}
            >
              {t(
                generationReason === 'stale-week'
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
            onClick={onRetryPreviewSave}
            disabled={!canAcceptPreview}
          >
            {t('planner.retryPreviewSave')}
          </button>
        </div>
      )}

      {action?.status === 'success' && (
        <p className="planner-feedback" role="status">
          {t(
            action.kind === 'save'
              ? 'planner.preferencesSaved'
              : 'planner.menuSaved',
          )}
        </p>
      )}
    </>
  )
}
