import './past-days.css'
import { Icon } from '#/components/primitives'
import { useI18n } from '#/shared/i18n'
import { parseWeekStart } from '#/features/weekly-menu/week'

interface PastDaysToggleProps {
  weekStart: string
  count: number
  isOpen: boolean
  controls: string
  onToggle: () => void
}

/** The week's past days. Closed, it is a stack of grey notes on the board and
 *  a "Show past days" line on phone. Open, it is the line that hides them. */
export function PastDaysToggle({
  weekStart,
  count,
  isOpen,
  controls,
  onToggle,
}: PastDaysToggleProps) {
  const { t, locale } = useI18n()
  const [year, month, day] = parseWeekStart(weekStart).split('-').map(Number)
  const weekday = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone: 'UTC',
  })
  const dayName = (index: number) => {
    const name = weekday.format(
      new Date(Date.UTC(year, month - 1, day + index)),
    )
    return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1)
  }
  const plural = count === 1 ? 'one' : 'other'

  return (
    <div className="past-days" data-open={isOpen || undefined}>
      <button
        aria-controls={controls}
        aria-expanded={isOpen}
        className="past-days-toggle"
        onClick={onToggle}
        type="button"
      >
        <span className="past-days-range">
          {count === 1 ? dayName(0) : `${dayName(0)}–${dayName(count - 1)}`}
        </span>
        <span className="past-days-done">
          <span aria-hidden="true" className="past-days-dot" />
          {t(`planner.pastDaysDone.${plural}`, { count })}
        </span>
        <span className="past-days-action">
          {isOpen
            ? t('planner.hidePastDays')
            : t(`planner.showPastDays.${plural}`, { count })}
          <Icon name="expand" size="sm" />
        </span>
      </button>
    </div>
  )
}
