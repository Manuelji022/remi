import { useId, useMemo, useState } from 'react'
import { DayCard } from './DayCard'
import { PastDaysToggle } from './PastDaysToggle'
import { Button, EmptyState } from '#/components/primitives'
import { DAYS, isWeekend } from '#/features/weekly-menu/constants'
import type { Day } from '#/features/weekly-menu/constants'
import { dayTiming, showMenuDay } from '#/features/weekly-menu/week'
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
  stackPastDays?: boolean
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
  stackPastDays = false,
}: MenuTabProps) {
  const { t, locale } = useI18n()
  const dayId = useId()
  // The week whose past days are open, so other weeks start stacked.
  const [openPastWeek, setOpenPastWeek] = useState<string | null>(null)
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
      <EmptyState
        icon="let-remi-choose"
        title={t('planner.buildingTitle')}
        role="status"
        aria-live="polite"
      >
        <p>{t('planner.buildingBody')}</p>
      </EmptyState>
    )
  }

  if (!menu) {
    return (
      <EmptyState
        icon="let-remi-choose"
        title={t('planner.emptyTitle')}
        action={
          <Button
            variant="brand"
            leadingIcon="let-remi-choose"
            onClick={onGenerateMenu}
          >
            {t('planner.generateMenu')}
          </Button>
        }
      >
        <p>{t('planner.emptyBody')}</p>
        {!isSignedIn && <p>{t('planner.aiSignInRequired')}</p>}
      </EmptyState>
    )
  }

  const now = new Date()
  const timings = DAYS.map((_, index) => dayTiming(menu.weekStart, index, now))
  const pastCount = timings.filter((timing) => timing === 'past').length
  // A week that is all past stays open: stacking it would empty the board.
  const canStack = stackPastDays && pastCount > 0 && pastCount < DAYS.length
  const isPastOpen = openPastWeek === menu.weekStart
  const isStacked = canStack && !isPastOpen

  return (
    <div className="planner-menu-tab">
      <div
        className="planner-day-grid"
        // With four notes or fewer to show, the stacked board has room.
        data-stacked={
          isStacked ? (pastCount >= 3 ? 'roomy' : 'compact') : undefined
        }
      >
        {canStack && (
          <PastDaysToggle
            controls={DAYS.slice(0, pastCount)
              .map((_, index) => `${dayId}-${index}`)
              .join(' ')}
            count={pastCount}
            isOpen={isPastOpen}
            onToggle={() => setOpenPastWeek(isPastOpen ? null : menu.weekStart)}
            weekStart={menu.weekStart}
          />
        )}
        {DAYS.map((day, index) => {
          const plan = menu.days[day]
          const shown = showMenuDay(plan, recipeNames)
          const editableMeals =
            recipesBySlot && onUpdateRecipe
              ? {
                  ...(plan.scope === 'both' || plan.scope === 'lunch'
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
                  ...(plan.scope === 'both' || plan.scope === 'dinner'
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
            <div
              className={`delay-${index + 1}`}
              hidden={isStacked && timings[index] === 'past'}
              id={`${dayId}-${index}`}
              key={day}
            >
              <DayCard
                day={day}
                dayContext={shown.context}
                dayIndex={index}
                dinner={shown.dinner}
                editableMeals={editableMeals}
                isWeekend={isWeekend(day)}
                lunch={shown.lunch}
                timing={timings[index]}
                weekStart={menu.weekStart}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
