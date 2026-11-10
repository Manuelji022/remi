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
  retryGenerationDisabled: boolean
  onRetrySchedule: () => void
  onRetryGeneration: () => void
  previewSaveError: string | null
  canAcceptPreview: boolean
  onRetryPreviewSave: () => void
  actionSuccess: 'save' | 'accept' | null
}

export function PlannerFeedback({
  generationReason,
  retryGenerationDisabled,
  onRetrySchedule,
  onRetryGeneration,
  previewSaveError,
  canAcceptPreview,
  onRetryPreviewSave,
  actionSuccess,
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
              disabled={retryGenerationDisabled}
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

      {actionSuccess && (
        <p className="planner-feedback" role="status">
          {t(
            actionSuccess === 'save'
              ? 'planner.preferencesSaved'
              : 'planner.menuSaved',
          )}
        </p>
      )}
    </>
  )
}
