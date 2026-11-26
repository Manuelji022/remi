import {
  Badge,
  Button,
  Card,
  Menu,
  MenuDivider,
  MenuItem,
} from '#/components/primitives'
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

// By weekday, so a note keeps its colour as the week moves on.
const NOTE_TONES = ['butter', 'lilac', 'mint'] as const

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
      data-day={dayIndex}
      data-tone={NOTE_TONES[dayIndex % NOTE_TONES.length]}
    >
      <Card className="day-card-paper">
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
            dayName={t(`days.${day}`)}
            editableMeal={editableMeals?.lunch}
            meal={lunch}
            slot="lunch"
            timing={timing}
          />
          <MealSlotDisplay
            dayName={t(`days.${day}`)}
            editableMeal={editableMeals?.dinner}
            meal={dinner}
            slot="dinner"
            timing={timing}
          />
        </div>
      </Card>
    </article>
  )
}

interface MealSlotDisplayProps {
  dayName: string
  meal: ShownMeal
  slot: MealSlot
  timing: DayTiming
  editableMeal?: EditableMeal
}

function MealSlotDisplay({
  dayName,
  meal,
  slot,
  timing,
  editableMeal,
}: MealSlotDisplayProps) {
  const { t } = useI18n()
  const home = meal.kind === 'recipe' || meal.kind === 'unplanned'
  const name = meal.kind === 'recipe' ? meal.name : t('meal.unplannedName')
  // Today's dinner is the one headline slot on the board.
  const tonight = timing === 'today' && slot === 'dinner' && home
  const swapLabel = t('planner.swapSlot', {
    day: dayName,
    slot: t(`slots.${slot}`).toLowerCase(),
  })

  return (
    <div
      className={`meal-slot ${home ? '' : 'unplanned'}`}
      data-empty={meal.kind === 'unplanned' || undefined}
      data-recipe-id={editableMeal ? (editableMeal.recipeId ?? '') : undefined}
      data-tonight={tonight || undefined}
    >
      <div className="meal-slot-text">
        <span className="meal-label">
          {t(tonight ? 'planner.tonight' : `slots.${slot}`)}
        </span>
        <span className="meal-name">{name}</span>
        {meal.kind === 'outside' ? t('meal.outsideScope') : null}
      </div>
      {editableMeal && (
        <Menu
          header={swapLabel}
          trigger={(props) => (
            <Button
              {...props}
              aria-label={swapLabel}
              className="meal-swap"
              disabled={editableMeal.disabled}
              icon="let-remi-choose"
              iconOnly
              variant="secondary"
            />
          )}
          wide
        >
          {editableMeal.recipes.map((recipe) => (
            <MenuItem
              checked={recipe.id === editableMeal.recipeId}
              key={recipe.id}
              onSelect={() => editableMeal.onChange(recipe.id)}
            >
              {recipe.name}
            </MenuItem>
          ))}
          <MenuDivider />
          <MenuItem
            checked={editableMeal.recipeId === null}
            onSelect={() => editableMeal.onChange(null)}
          >
            {t('planner.aiPreviewNoRecipe')}
          </MenuItem>
        </Menu>
      )}
    </div>
  )
}
