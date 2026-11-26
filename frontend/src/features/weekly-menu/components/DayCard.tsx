import { Badge, Card, Divider } from '#/components/primitives'
import type { Day } from '#/features/weekly-menu/constants'
import './day-card.css'
import type { DayContext } from '#/features/weekly-menu/types'
import type { MealSlot } from '#/features/recipes/recipe'
import { useI18n } from '#/shared/i18n'
import { parseWeekStart } from '#/features/weekly-menu/week'
import type { DayTiming, ShownMeal } from '#/features/weekly-menu/week'

type EditableMeal = {
  recipeId: string | null
  disabled: boolean
  recipes: readonly { id: string; name: string }[]
  onChange: (recipeId: string | null) => void
}

interface DayCardProps {
  day: Day
  isWeekend: boolean
  lunch: ShownMeal
  dinner: ShownMeal
  dayContext: DayContext | null
  dayIndex: number
  timing: DayTiming
  weekStart: string
  editableMeals?: Partial<Record<MealSlot, EditableMeal>>
}

export function DayCard({
  day,
  isWeekend,
  lunch,
  dinner,
  dayContext,
  dayIndex,
  timing,
  weekStart,
  editableMeals,
}: DayCardProps) {
  const { t, locale } = useI18n()
  const dayContextLabel = dayContext ? t(`contexts.${dayContext}`) : null
  const [year, month, dayOfMonth] = parseWeekStart(weekStart)
    .split('-')
    .map(Number)
  const date = new Date(Date.UTC(year, month - 1, dayOfMonth + dayIndex))
  const shortName = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(date)
  const dateNumber = date.getUTCDate()
  const isToday = timing === 'today'

  return (
    // The article is the straight hit area; only the paper inside tilts.
    <article
      aria-current={isToday ? 'date' : undefined}
      className={`day-card day-card-${timing} ${isWeekend ? 'weekend' : ''}`}
      data-tilt={dayIndex % 3}
    >
      <Card
        className="day-card-paper"
        variant={isToday ? 'current' : 'default'}
      >
        <div className="day-card-header">
          <h3
            aria-label={`${t(`days.${day}`)} ${dateNumber}`}
            className="day-name"
          >
            {shortName} {dateNumber}
          </h3>
          {isToday && (
            <span className="day-today">{t('planner.dayToday')}</span>
          )}
          {dayContextLabel && <Badge shape="square">{dayContextLabel}</Badge>}
        </div>
        <div className="day-meals">
          <MealSlotDisplay
            editableMeal={editableMeals?.lunch}
            meal={lunch}
            slot="lunch"
          />
          <Divider />
          <MealSlotDisplay
            editableMeal={editableMeals?.dinner}
            meal={dinner}
            slot="dinner"
          />
        </div>
      </Card>
    </article>
  )
}

interface MealSlotDisplayProps {
  meal: ShownMeal
  slot: MealSlot
  editableMeal?: EditableMeal
}

function MealSlotDisplay({ meal, slot, editableMeal }: MealSlotDisplayProps) {
  const { t } = useI18n()
  const home = meal.kind === 'recipe' || meal.kind === 'unplanned'
  const name = meal.kind === 'recipe' ? meal.name : t('meal.unplannedName')

  return (
    <div className={`meal-slot ${home ? '' : 'unplanned'}`}>
      <span className="meal-label">{t(`slots.${slot}`)}</span>
      <span className="meal-name">{name}</span>
      {meal.kind === 'outside' ? t('meal.outsideScope') : null}
      {editableMeal && (
        <label className="meal-recipe-editor">
          <span>
            {t('planner.aiPreviewRecipeSelect', {
              slot: t(`slots.${slot}`).toLowerCase(),
            })}
          </span>
          <select
            aria-label={t('planner.aiPreviewRecipeSelect', {
              slot: t(`slots.${slot}`).toLowerCase(),
            })}
            disabled={editableMeal.disabled}
            value={editableMeal.recipeId ?? ''}
            onChange={(event) =>
              editableMeal.onChange(event.target.value || null)
            }
          >
            <option value="">{t('planner.aiPreviewNoRecipe')}</option>
            {editableMeal.recipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
