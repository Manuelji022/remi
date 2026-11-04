import { useMemo } from 'react'
import { DayCard } from './DayCard'
import { SparkleIcon } from '#/components/primitives'
import { DAYS, isWeekend } from '#/features/weekly-menu/constants'
import type { Day } from '#/features/weekly-menu/constants'
import { isSlotPlanned, showMenuDay } from '#/features/weekly-menu/week'
import type { CalendarWeekMenu } from '#/features/weekly-menu/week'
import type { MealSlot, Recipe } from '#/features/recipes/recipe'
import { useI18n } from '#/shared/i18n'

type SlotRecipes = Record<MealSlot, readonly Recipe[]>

interface MenuTabProps {
  isGenerating: boolean
  menu: CalendarWeekMenu | null
  onGenerateMenu: () => void
  recipeNames: Record<string, string>
  isSignedIn: boolean
  editableRecipes?: readonly Recipe[]
  onUpdateRecipe?: (day: Day, slot: MealSlot, recipeId: string | null) => void
  areRecipeEditsDisabled?: boolean
}

export function MenuTab({
  isGenerating,
  menu,
  onGenerateMenu,
  recipeNames,
  isSignedIn,
  editableRecipes,
  onUpdateRecipe,
  areRecipeEditsDisabled = false,
}: MenuTabProps) {
  const { t, locale } = useI18n()
  const recipesBySlot = useMemo<SlotRecipes | undefined>(() => {
    if (!editableRecipes) return undefined
    const collator = new Intl.Collator(locale, {
      sensitivity: 'base',
      numeric: true,
    })
    const sorted = (slot: MealSlot) =>
      editableRecipes
        .filter((recipe) => recipe.slot === slot)
        .sort((a, b) => collator.compare(a.name, b.name))
    return { lunch: sorted('lunch'), dinner: sorted('dinner') }
  }, [editableRecipes, locale])

  if (isGenerating) {
    return (
      <div className="planner-empty-state" role="status" aria-live="polite">
        <SparkleIcon aria-hidden="true" />
        <h2>{t('planner.buildingTitle')}</h2>
        <p>{t('planner.buildingBody')}</p>
      </div>
    )
  }

  if (!menu) {
    return (
      <div className="planner-empty-state">
        <SparkleIcon aria-hidden="true" />
        <h2>{t('planner.emptyTitle')}</h2>
        <p>{t('planner.emptyBody')}</p>
        {!isSignedIn && <p>{t('planner.aiSignInRequired')}</p>}
        <button
          className="planner-primary-btn"
          type="button"
          onClick={onGenerateMenu}
        >
          <SparkleIcon aria-hidden="true" />
          {t('planner.generateMenu')}
        </button>
      </div>
    )
  }

  return (
    <div className="planner-menu-tab">
      <div className="planner-section-heading"></div>
      <div className="planner-day-grid">
        {DAYS.map((day, index) => {
          const plan = menu.days[day]
          const shown = showMenuDay(plan, recipeNames)
          const editableMeals =
            recipesBySlot && onUpdateRecipe
              ? {
                  ...(isSlotPlanned(plan.scope, 'lunch')
                    ? {
                        lunch: {
                          recipeId: plan.lunchRecipeId,
                          disabled: areRecipeEditsDisabled,
                          recipes: recipesBySlot.lunch,
                          onChange: (recipeId: string | null) =>
                            onUpdateRecipe(day, 'lunch', recipeId),
                        },
                      }
                    : {}),
                  ...(isSlotPlanned(plan.scope, 'dinner')
                    ? {
                        dinner: {
                          recipeId: plan.dinnerRecipeId,
                          disabled: areRecipeEditsDisabled,
                          recipes: recipesBySlot.dinner,
                          onChange: (recipeId: string | null) =>
                            onUpdateRecipe(day, 'dinner', recipeId),
                        },
                      }
                    : {}),
                }
              : undefined
          return (
            <div className={`delay-${index + 1}`} key={day}>
              <DayCard
                day={day}
                dayContext={shown.context}
                dinner={shown.dinner}
                editableMeals={editableMeals}
                isWeekend={isWeekend(day)}
                lunch={shown.lunch}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
