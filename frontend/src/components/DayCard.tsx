import './day-card.css'

import type { Day } from '#/data/constants'
import type { DayContext, Meal, MealSlot, PlanningScope } from '#/data/types'
import { useI18n } from '#/i18n'

interface DayCardProps {
  day: Day
  isWeekend: boolean
  lunch: Meal | null
  dinner: Meal | null
  dayContext: DayContext | null
  planningScope: PlanningScope
}

export function DayCard({
  day,
  isWeekend,
  lunch,
  dinner,
  dayContext,
  planningScope,
}: DayCardProps) {
  const { t } = useI18n()
  const dayContextLabel = dayContext ? t(`contexts.${dayContext}`) : null

  return (
    <article className={`day-card ${isWeekend ? 'weekend' : ''}`}>
      <div className="day-card-header">
        <div className="day-name">{t(`days.${day}`)}</div>
        {dayContextLabel && (
          <span className="day-context-badge">{dayContextLabel}</span>
        )}
      </div>
      <div className="day-meals">
        <MealSlotDisplay
          dayContextLabel={dayContextLabel}
          meal={lunch}
          planningScope={planningScope}
          slot="lunch"
        />
        <MealSlotDisplay
          dayContextLabel={dayContextLabel}
          meal={dinner}
          planningScope={planningScope}
          slot="dinner"
        />
      </div>
    </article>
  )
}

interface MealSlotDisplayProps {
  dayContextLabel: string | null
  meal: Meal | null
  planningScope: PlanningScope
  slot: MealSlot
}

function MealSlotDisplay({
  dayContextLabel,
  meal,
  planningScope,
  slot,
}: MealSlotDisplayProps) {
  const isHomePlanned = planningScope === 'both' || planningScope === slot
  const { t } = useI18n()

  return (
    <div className={`meal-slot ${isHomePlanned ? '' : 'unplanned'}`}>
      <span className="meal-label">{t(`slots.${slot}`)}</span>
      {isHomePlanned && meal ? (
        <>
          <span className="meal-name">{meal.name}</span>
        </>
      ) : (
        <>
          <span className="meal-name">{t('meal.unplannedName')}</span>
            {dayContextLabel
              ? t('meal.coveredByContext', {
                  context: dayContextLabel.toLowerCase(),
                })
              : t('meal.outsideScope')}
        </>
      )}
    </div>
  )
}
