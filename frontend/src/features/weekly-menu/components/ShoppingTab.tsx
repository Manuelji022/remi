import { useState } from 'react'
import { formatRecipeIngredient } from '#/features/recipes/format'
import type { ShoppingLine } from '#/features/weekly-menu/shopping'
import { useI18n } from '#/shared/i18n'

// Lives in the planner, not in `ShoppingTab`, so ticks survive switching tabs.
export function useCheckedIngredients() {
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(
    () => new Set(),
  )
  function toggleIngredient(key: string) {
    setCheckedIngredients((previous) => {
      const next = new Set(previous)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  return { checkedIngredients, toggleIngredient }
}

export function ShoppingTab({
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
