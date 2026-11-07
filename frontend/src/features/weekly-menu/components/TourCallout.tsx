import { useId } from 'react'
import { useI18n } from '#/shared/i18n'

export function TourCallout({
  step,
  title,
  body,
  isLast,
  onNext,
  onSkip,
}: {
  step: 1 | 2 | 3
  title: string
  body: string
  isLast: boolean
  onNext: () => void
  onSkip: () => void
}) {
  const { t } = useI18n()
  const titleId = useId()
  return (
    <aside className="planner-tour" role="note" aria-labelledby={titleId}>
      <p>{t('planner.tourStep', { step })}</p>
      <strong id={titleId}>{title}</strong>
      <p>{body}</p>
      <div className="planner-tour-actions">
        <button type="button" className="btn btn-primary" onClick={onNext}>
          {t(isLast ? 'planner.tourDone' : 'planner.tourNext')}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onSkip}>
          {t('planner.tourSkip')}
        </button>
      </div>
    </aside>
  )
}
