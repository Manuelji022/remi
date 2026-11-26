import './ai-menu-skeleton.css'
import { dayHeading, noteTone } from './day-note'
import { Banner, Card, Skeleton } from '#/components/primitives'
import { DAYS } from '#/features/weekly-menu/constants'
import { useI18n } from '#/shared/i18n'

export function AiMenuSkeleton({ weekStart }: { weekStart: string }) {
  const { t, locale } = useI18n()

  return (
    <div
      className="planner-ai-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Banner tone="info">{t('planner.aiGeneratingMenu')}</Banner>
      <div className="planner-day-grid" aria-hidden="true">
        {DAYS.map((day, index) => {
          const { shortName, dateNumber } = dayHeading(weekStart, index, locale)
          return (
            <article
              className="day-card day-card-upcoming"
              data-day={index}
              data-tone={noteTone(index)}
              key={day}
            >
              <Card className="day-card-paper">
                <div className="day-card-header">
                  <div className="day-name">
                    {shortName} {dateNumber}
                  </div>
                </div>
                <div className="day-meals">
                  {(['lunch', 'dinner'] as const).map((slot) => (
                    <div className="meal-slot" key={slot}>
                      <div className="meal-slot-text">
                        <span className="meal-label">{t(`slots.${slot}`)}</span>
                        <Skeleton height="1.25rem" width="80%" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </article>
          )
        })}
      </div>
    </div>
  )
}
