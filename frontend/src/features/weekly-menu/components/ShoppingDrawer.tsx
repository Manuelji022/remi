import { useState } from 'react'
import { Button, Checkbox, Drawer, EmptyState } from '#/components/primitives'
import type { ShoppingLine } from '#/features/weekly-menu/shopping'
import { useI18n } from '#/shared/i18n'

// Lives in the planner, not in `ShoppingDrawer`, so ticks survive closing it.
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

function shoppingKey(checklistId: string, line: ShoppingLine) {
  return JSON.stringify([checklistId, line.name, line.unit, line.quantity])
}

/** The shopping list as Paper draws it: a drawer from the end edge from lg, a
 *  bottom sheet below. Inside, the ticket keeps its type, quantity lane and
 *  perforations. */
export function ShoppingDrawer({
  lines,
  checklistId,
  checkedIngredients,
  onToggleIngredient,
  weekRange,
  onClose,
}: {
  lines: readonly ShoppingLine[]
  checklistId: string
  checkedIngredients: ReadonlySet<string>
  onToggleIngredient: (key: string) => void
  weekRange: { start: string; end: string }
  onClose: () => void
}) {
  const { t } = useI18n()
  const total = lines.length
  const done = lines.filter((line) =>
    checkedIngredients.has(shoppingKey(checklistId, line)),
  ).length

  return (
    <Drawer
      id="shopping-drawer"
      title={t('planner.shoppingTitle')}
      description={t('planner.weekRange', weekRange)}
      closeLabel={t('planner.shoppingClose')}
      onDismiss={onClose}
      actions={
        <Button variant="ghost" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      {total === 0 ? (
        <EmptyState
          variant="compact"
          icon="shopping-list"
          title={t('planner.shoppingEmptyTitle')}
        >
          <p>{t('planner.shoppingEmpty')}</p>
        </EmptyState>
      ) : (
        <>
          <div className="shopping-ticket-progress">
            <p className="shopping-ticket-count">
              <span className="shopping-ticket-done">{done}</span>{' '}
              {t('planner.shoppingBasket', { total })}
            </p>
            <p className="shopping-ticket-togo">
              {done === total
                ? t('planner.shoppingAllIn')
                : t('planner.shoppingToGo', { count: total - done })}
            </p>
            <div className="shopping-ticket-bar" aria-hidden="true">
              <div
                className="shopping-ticket-fill"
                style={{ inlineSize: `${(done / total) * 100}%` }}
              />
            </div>
          </div>
          <ul className="shopping-ticket-list">
            {lines.map((line) => {
              const key = shoppingKey(checklistId, line)

              return (
                <li key={key}>
                  <Checkbox
                    variant="shopping"
                    checked={checkedIngredients.has(key)}
                    onChange={() => onToggleIngredient(key)}
                    trailing={
                      line.quantity === null ? undefined : (
                        <>
                          <span className="shopping-ticket-qty">
                            {line.quantity}
                          </span>
                          {line.unit && (
                            <span className="shopping-ticket-unit">
                              {t(`units.${line.unit}`)}
                            </span>
                          )}
                        </>
                      )
                    }
                  >
                    {line.name}
                  </Checkbox>
                </li>
              )
            })}
          </ul>
          <p className="shopping-ticket-source">
            {t('planner.shoppingHelper')}
          </p>
        </>
      )}
    </Drawer>
  )
}
