import { useState } from 'react'
import { Checkbox, EmptyState } from '#/components/primitives'
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

function shoppingKey(checklistId: string, line: ShoppingLine) {
  return JSON.stringify([checklistId, line.name, line.unit, line.quantity])
}

/** The ticket Paper draws: a paper header, a progress count, a quantity lane
 *  per item and the source line. The magnet and torn edge are the standalone
 *  ticket's; the drawer keeps only what is inside. */
export function ShoppingTab({
  lines,
  checklistId,
  checkedIngredients,
  onToggleIngredient,
  weekRange,
}: {
  lines: readonly ShoppingLine[]
  checklistId: string
  checkedIngredients: ReadonlySet<string>
  onToggleIngredient: (key: string) => void
  weekRange: { start: string; end: string }
}) {
  const { t } = useI18n()
  const total = lines.length
  const done = lines.filter((line) =>
    checkedIngredients.has(shoppingKey(checklistId, line)),
  ).length

  return (
    <section
      className="shopping-ticket"
      data-empty={total === 0 || undefined}
      aria-labelledby="shopping-ticket-title"
    >
      <span className="shopping-ticket-magnet" aria-hidden="true" />
      <div className="shopping-ticket-paper">
        <header className="shopping-ticket-header">
          <h2 id="shopping-ticket-title" className="shopping-ticket-title">
            {t('planner.shoppingTitle')}
          </h2>
          <p className="shopping-ticket-week">
            {t('planner.weekRange', weekRange)}
          </p>
        </header>
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
      </div>
      <span className="shopping-ticket-edge" aria-hidden="true" />
    </section>
  )
}
