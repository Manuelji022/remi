import type { Day } from '#/features/weekly-menu/constants'
import './day-card.css'
import type { DayContext } from '#/features/weekly-menu/types'
import type { MealSlot } from '#/features/recipes/recipe'
import { useI18n } from '#/shared/i18n'
import type { ShownMeal } from '#/features/weekly-menu/week'

interface DayCardProps {
  day: Day
  isWeekend: boolean
  lunch: ShownMeal
  dinner: ShownMeal
  dayContext: DayContext | null
}

export function DayCard({
  day,
  isWeekend,
  lunch,
  dinner,
  dayContext,
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
        <MealSlotDisplay meal={lunch} slot="lunch" />
        <MealSlotDisplay meal={dinner} slot="dinner" />
      </div>
    </article>
  )
}

interface MealSlotDisplayProps {
  meal: ShownMeal
  slot: MealSlot
}

function MealSlotDisplay({ meal, slot }: MealSlotDisplayProps) {
  const { t } = useI18n()
  const home = meal.kind === 'recipe' || meal.kind === 'unplanned'
  const name = meal.kind === 'recipe' ? meal.name : t('meal.unplannedName')

  return (
    <div className={`meal-slot ${home ? '' : 'unplanned'}`}>
      <span className="meal-label">{t(`slots.${slot}`)}</span>
      <span className="meal-name">{name}</span>
      {meal.kind === 'outside' ? t('meal.outsideScope') : null}
    </div>
  )
}
