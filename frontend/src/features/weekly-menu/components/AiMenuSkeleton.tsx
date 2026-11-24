import './ai-menu-skeleton.css'
import { Skeleton } from '#/components/primitives'
import { DAYS } from '#/features/weekly-menu/constants'
import { useI18n } from '#/shared/i18n'

export function AiMenuSkeleton() {
  const { t } = useI18n()

  return (
    <div
      className="planner-ai-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="planner-ai-preview-banner">
        <p className="planner-ai-preview-kicker">
          {t('planner.aiGeneratingMenu')}
        </p>
      </div>
      <div className="planner-day-grid" aria-hidden="true">
        {DAYS.map((day) => (
          <article className="day-card" key={day}>
            <div className="day-card-header">
              <div className="day-name">{t(`days.${day}`)}</div>
            </div>
            <div className="day-meals">
              <div className="meal-slot">
                <span className="meal-label">{t('slots.lunch')}</span>
                <Skeleton height="1.25rem" width="70%" />
              </div>
              <div className="meal-slot">
                <span className="meal-label">{t('slots.dinner')}</span>
                <Skeleton height="1.25rem" width="70%" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
