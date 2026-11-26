import './ghost-week.css'
import { dayHeading, noteTone } from './day-note'
import { DAYS } from '#/features/weekly-menu/constants'
import { dayTiming } from '#/features/weekly-menu/week'
import { useI18n } from '#/shared/i18n'

/** The outline of a week with nothing in it. A picture only: the empty state
 *  under it says what it means. */
export function GhostWeek({ weekStart }: { weekStart: string }) {
  const { locale } = useI18n()
  const now = new Date()

  return (
    <div aria-hidden="true" className="ghost-week">
      {DAYS.map((day, index) => {
        const { shortName, dateNumber } = dayHeading(weekStart, index, locale)
        return (
          <div
            className="ghost-note"
            data-timing={dayTiming(weekStart, index, now)}
            data-tone={noteTone(index)}
            key={day}
          >
            <span className="ghost-day">
              {shortName} {dateNumber}
            </span>
            <span className="ghost-slot" />
            <span className="ghost-slot" />
          </div>
        )
      })}
    </div>
  )
}
