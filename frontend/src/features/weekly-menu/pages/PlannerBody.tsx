import { MainTab } from '../components/MainTab'
import { MenuTab } from '../components/MenuTab'
import { WeekLockButton } from '../components/WeekLockButton'
import type { ShoppingLine } from '../shopping'
import { useI18n } from '#/shared/i18n'
import { formatRecipeIngredient } from '#/features/recipes/format'
import type { CalendarWeekMenu } from '../week'

interface PlannerBodyProps {
  activeTab: 'menu' | 'ingredients'
  onTabChange: (tab: 'menu' | 'ingredients') => void
  isIngredientsDisabled: boolean
  neededItems: number
  visibleMenu: CalendarWeekMenu | null
  isLocked: boolean
  viewedWeek: string
  onUnlock: () => void
  onGenerateMenu: () => void
  isGenerating: boolean
  recipeNames: Record<string, string>
  isSignedIn: boolean
  lines: readonly ShoppingLine[]
  checklistId: string
  checkedIngredients: ReadonlySet<string>
  onToggleIngredient: (key: string) => void
}

export function PlannerBody({
  activeTab,
  onTabChange,
  isIngredientsDisabled,
  neededItems,
  visibleMenu,
  isLocked,
  viewedWeek,
  onUnlock,
  onGenerateMenu,
  isGenerating,
  recipeNames,
  isSignedIn,
  lines,
  checklistId,
  checkedIngredients,
  onToggleIngredient,
}: PlannerBodyProps) {
  return (
    <>
      <div className="planner-toolbar">
        <MainTab
          activeTab={activeTab}
          isIngredientsDisabled={isIngredientsDisabled}
          neededItems={neededItems}
          onTabChange={onTabChange}
        />
      </div>

      {activeTab === 'menu' ? (
        <>
          {visibleMenu && (
            <WeekLockButton
              key={viewedWeek}
              isLocked={isLocked}
              onUnlock={onUnlock}
            />
          )}
          <MenuTab
            isGenerating={isGenerating}
            menu={visibleMenu}
            onGenerateMenu={onGenerateMenu}
            recipeNames={recipeNames}
            isSignedIn={isSignedIn}
          />
        </>
      ) : (
        <ShoppingTab
          lines={lines}
          checklistId={checklistId}
          checkedIngredients={checkedIngredients}
          onToggleIngredient={onToggleIngredient}
        />
      )}
    </>
  )
}

function ShoppingTab({
  lines,
  checklistId,
  checkedIngredients,
  onToggleIngredient,
}: {
  lines: readonly ShoppingLine[]
  checklistId: string
  checkedIngredients: ReadonlySet<string>
  onToggleIngredient: (key: string) => void
}) {
  const { t } = useI18n()

  return (
    <div className="planner-shopping-tab">
      <h2>{t('tabs.ingredients')}</h2>
      <p className="planner-shopping-helper">{t('planner.shoppingHelper')}</p>
      {lines.length === 0 ? (
        <p>{t('planner.shoppingEmpty')}</p>
      ) : (
        <ul>
          {lines.map((line) => {
            const key = JSON.stringify([
              checklistId,
              line.name,
              line.unit,
              line.quantity,
            ])

            return (
              <li key={key}>
                <label className="planner-shopping-item">
                  <input
                    type="checkbox"
                    checked={checkedIngredients.has(key)}
                    onChange={() => onToggleIngredient(key)}
                  />
                  <span>
                    {formatRecipeIngredient(line, (unit) => t(`units.${unit}`))}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
