import { formatRecipeIngredient } from '#/features/recipes/format'
import type { ShoppingLine } from '#/features/weekly-menu/shopping'
import { useI18n } from '#/shared/i18n'

export function ShoppingList({ lines }: { lines: readonly ShoppingLine[] }) {
  const { t } = useI18n()
  return (
    <div className="planner-shopping-tab">
      <h2>{t('tabs.ingredients')}</h2>
      <p className="planner-shopping-helper">{t('planner.shoppingHelper')}</p>
      {lines.length === 0 ? (
        <p>{t('planner.shoppingEmpty')}</p>
      ) : (
        <ul>
          {lines.map((line) => (
            <li
              key={`${line.name}\0${line.unit ?? ''}\0${line.quantity === null ? 'unknown' : 'number'}`}
            >
              {formatRecipeIngredient(line, (unit) => t(`units.${unit}`))}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
