import type { Day } from '#/features/weekly-menu/constants'
import './day-card.css'
import type { DayContext } from '#/features/weekly-menu/types'
import type { MealSlot } from '#/features/recipes/recipe'
import { useI18n } from '#/shared/i18n'
import type { ShownMeal } from '#/features/weekly-menu/week'

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
  editableMeals?: Partial<Record<MealSlot, EditableMeal>>
}

export function DayCard({
  day,
  isWeekend,
  lunch,
  dinner,
  dayContext,
  editableMeals,
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
          editableMeal={editableMeals?.lunch}
          meal={lunch}
          slot="lunch"
        />
        <MealSlotDisplay
          editableMeal={editableMeals?.dinner}
          meal={dinner}
          slot="dinner"
        />
      </div>
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
