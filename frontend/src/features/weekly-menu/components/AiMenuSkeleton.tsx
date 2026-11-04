import './ai-menu-skeleton.css'
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
          <article className="day-card ai-skeleton-card" key={day}>
            <div className="day-card-header">
              <div className="day-name">{t(`days.${day}`)}</div>
            </div>
            <div className="day-meals">
              <div className="meal-slot">
                <span className="meal-label">{t('slots.lunch')}</span>
                <span className="ai-skeleton-block" />
              </div>
              <div className="meal-slot">
                <span className="meal-label">{t('slots.dinner')}</span>
                <span className="ai-skeleton-block" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
