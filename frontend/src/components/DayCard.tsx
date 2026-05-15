import './day-card.css'

import type { Day } from '#/data/constants'
import type { DayContext, Meal, MealSlot, PlanningScope } from '#/data/types'

interface DayCardProps {
  day: Day
  isWeekend: boolean
  lunch: Meal | null
  dinner: Meal | null
  dayContext: DayContext | null
  planningScope: PlanningScope
}

const SLOT_LABELS: Record<MealSlot, string> = {
  lunch: 'Lunch',
  dinner: 'Dinner',
}

const CONTEXT_LABELS: Record<DayContext, string> = {
  office: 'Office',
  eatOut: 'Eat out',
}

export function DayCard({
  day,
  isWeekend,
  lunch,
  dinner,
  dayContext,
  planningScope,
}: DayCardProps) {
  const dayContextLabel = dayContext ? CONTEXT_LABELS[dayContext] : null

  return (
    <article className={`day-card ${isWeekend ? 'weekend' : ''}`}>
      <div className="day-card-header">
        <div className="day-name">{day}</div>
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

  return (
    <div className={`meal-slot ${isHomePlanned ? '' : 'unplanned'}`}>
      <span className="meal-label">{SLOT_LABELS[slot]}</span>
      {isHomePlanned && meal ? (
        <>
          <span className="meal-name">{meal.name}</span>
          <span className="meal-description">{meal.description}</span>
        </>
      ) : (
        <>
          <span className="meal-name">No home-planned meal</span>
          <span className="meal-description">
            {dayContextLabel
              ? `Covered by ${dayContextLabel.toLowerCase()} context.`
              : 'Outside the current planning scope.'}
          </span>
        </>
      )}
    </div>
  )
}
