import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import './weekly-menu-planner.css'
import { DayCard, LoadingDots, MainTab, PreferencesPanel } from '#/components'
import {
  CalendarIcon,
  CheckIcon,
  FridgeIcon,
  LeafIcon,
  RefreshIcon,
  SettingsIcon,
  ShoppingCartIcon,
  SparkleIcon,
} from '#/components/icons'
import {
  DAYS,
  getWeekNumber,
  isWeekend,
} from '#/data/constants'
import {
  CATEGORY_META,
  createChecklistState,
  getIngredientSets,
  getIngredientChecklistKey,
  getNeededItemsCount,
} from '#/data/ingredients'
import type { IngredientCategory } from '#/data/ingredients'
import { getMenuSets } from '#/data/menu'
import {
  getActivePreferencesBadgeCount,
  getDayContextForDay,
  getDefaultPreferences,
  getPlanningScopeForDay,
} from '#/data/types'
import type { ChecklistState, Preferences, WeeklyMenu } from '#/data/types'
import { useI18n } from '#/i18n'

type MainTabId = 'menu' | 'ingredients'

export const Route = createFileRoute('/weekly-menu-planner')({
  component: WeeklyMenuPlanner,
})

export function WeeklyMenuPlanner() {
  const { locale, t, formatWeekRange } = useI18n()
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentMenuIndex, setCurrentMenuIndex] = useState(-1)
  const [animationKey, setAnimationKey] = useState(0)
  const [activeTab, setActiveTab] = useState<MainTabId>('menu')
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)
  const [savedPreferences, setSavedPreferences] = useState<Preferences>(() =>
    getDefaultPreferences(),
  )
  const [draftPreferences, setDraftPreferences] = useState<Preferences>(() =>
    getDefaultPreferences(),
  )
  const [shoppingChecklist, setShoppingChecklist] = useState<ChecklistState>({})

  const menuSets = getMenuSets(locale)
  const ingredientSets = getIngredientSets(locale)
  const generatedMenu =
    currentMenuIndex >= 0 ? menuSets[currentMenuIndex] : null
  const weekRange = formatWeekRange()
  const activePreferenceCount = getActivePreferencesBadgeCount(savedPreferences)
  const neededItems = getNeededItemsCount(shoppingChecklist)

  useEffect(() => {
    if (currentMenuIndex < 0) return

    setShoppingChecklist(createChecklistState(ingredientSets[currentMenuIndex]))
  }, [currentMenuIndex, ingredientSets, locale])

  function handleGenerateMenu() {
    if (isGenerating) return

    setIsGenerating(true)
    setActiveTab('menu')

    window.setTimeout(() => {
      const nextMenuIndex = (currentMenuIndex + 1) % menuSets.length

      setCurrentMenuIndex(nextMenuIndex)
      setShoppingChecklist(createChecklistState(ingredientSets[nextMenuIndex]))
      setAnimationKey((key) => key + 1)
      setIsGenerating(false)
    }, 700)
  }

  function handleOpenPreferences() {
    setDraftPreferences(savedPreferences)
    setIsPreferencesOpen(true)
  }

  function handleSavePreferences(preferences: Preferences) {
    setSavedPreferences(preferences)
    setDraftPreferences(preferences)
    setIsPreferencesOpen(false)
  }

  return (
    <main className="planner-page">
      <section className="planner-shell" aria-labelledby="planner-title">
        <div className="planner-hero">
          <div className="planner-card-meta">
            <p className="planner-week-pill">
              {t('planner.weekKicker', {
                week: getWeekNumber(),
                start: weekRange.start,
                end: weekRange.end,
              })}
            </p>
          </div>

          <div className="planner-actions" aria-label={t('planner.actionsLabel')}>
            <button
              className="planner-secondary-btn"
              type="button"
              onClick={handleOpenPreferences}
            >
              <SettingsIcon aria-hidden="true" />
              {t('planner.preferences')}
              {activePreferenceCount > 0 && (
                <span className="planner-btn-badge">
                  {activePreferenceCount}
                </span>
              )}
            </button>
            <button
              className="planner-primary-btn"
              type="button"
              onClick={handleGenerateMenu}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  {t('planner.generating')} <LoadingDots />
                </>
              ) : (
                <>
                  <SparkleIcon aria-hidden="true" />
                  {generatedMenu
                    ? t('planner.regenerateMenu')
                    : t('planner.generateMenu')}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="planner-divider" />

        <div className="planner-toolbar">
          <MainTab
            activeTab={activeTab}
            isIngredientsDisabled={!generatedMenu}
            neededItems={generatedMenu ? neededItems : 0}
            onTabChange={setActiveTab}
          />
          {generatedMenu && (
            <p className="planner-state-note">
              {t('planner.mockSet', {
                current: currentMenuIndex + 1,
                total: menuSets.length,
              })}
            </p>
          )}
        </div>

        {activeTab === 'menu' && (
          <MenuTab
            animationKey={animationKey}
            generatedMenu={generatedMenu}
            isGenerating={isGenerating}
            onGenerateMenu={handleGenerateMenu}
            savedPreferences={savedPreferences}
          />
        )}

        {activeTab === 'ingredients' && (
          <ShoppingTab
            checklist={shoppingChecklist}
            generatedMenu={generatedMenu}
            ingredientSet={
              currentMenuIndex >= 0 ? ingredientSets[currentMenuIndex] : undefined
            }
            isGenerating={isGenerating}
            neededItems={neededItems}
            onResetChecklist={() => {
              if (currentMenuIndex < 0) return
              setShoppingChecklist(
                createChecklistState(ingredientSets[currentMenuIndex]),
              )
            }}
            onToggleChecklistItem={(ingredientKey) => {
              setShoppingChecklist((currentChecklist) => {
                const currentItem = currentChecklist[ingredientKey] ?? {
                  checked: false,
                  inFridge: false,
                }

                const nextChecked = !currentItem.checked

                return {
                  ...currentChecklist,
                  [ingredientKey]: {
                    checked: nextChecked,
                    inFridge: nextChecked,
                  },
                }
              })
            }}
          />
        )}
      </section>

      <PreferencesPanel
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        onSave={handleSavePreferences}
        savedPrefs={draftPreferences}
      />
    </main>
  )
}

interface MenuTabProps {
  animationKey: number
  generatedMenu: WeeklyMenu | null
  isGenerating: boolean
  onGenerateMenu: () => void
  savedPreferences: Preferences
}

function MenuTab({
  animationKey,
  generatedMenu,
  isGenerating,
  onGenerateMenu,
  savedPreferences,
}: MenuTabProps) {
  const { t } = useI18n()

  if (isGenerating) {
    return (
      <div className="planner-empty-state" role="status" aria-live="polite">
        <SparkleIcon aria-hidden="true" />
        <h2>{t('planner.buildingTitle')}</h2>
        <p>{t('planner.buildingBody')}</p>
      </div>
    )
  }

  if (!generatedMenu) {
    return (
      <div className="planner-empty-state">
        <SparkleIcon aria-hidden="true" />
        <h2>{t('planner.emptyTitle')}</h2>
        <p>{t('planner.emptyBody')}</p>
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
    <div className="planner-menu-tab" key={animationKey}>
      <div className="planner-section-heading">
      </div>

      <div className="planner-day-grid">
        {DAYS.map((day, index) => {
          const planningScope = getPlanningScopeForDay(savedPreferences, day)
          const dayContext = getDayContextForDay(savedPreferences, day)

          return (
            <div className={`delay-${index + 1}`} key={day}>
              <DayCard
                day={day}
                dayContext={dayContext}
                dinner={generatedMenu[day].dinner}
                isWeekend={isWeekend(day)}
                lunch={generatedMenu[day].lunch}
                planningScope={planningScope}
              />
            </div>
          )
        })}
      </div>

    </div>
  )
}

interface ShoppingTabProps {
  checklist: ChecklistState
  generatedMenu: WeeklyMenu | null
  ingredientSet?: ReturnType<typeof getIngredientSets>[number]
  isGenerating: boolean
  neededItems: number
  onResetChecklist: () => void
  onToggleChecklistItem: (ingredientKey: string) => void
}

function ShoppingTab({
  checklist,
  generatedMenu,
  ingredientSet,
  isGenerating,
  neededItems,
  onResetChecklist,
  onToggleChecklistItem,
}: ShoppingTabProps) {
  const { t } = useI18n()

  if (!generatedMenu || isGenerating) {
    return (
      <div className="planner-empty-state">
        <ShoppingCartIcon aria-hidden="true" />
        <h2>{t('shopping.emptyTitle')}</h2>
        <p>{t('shopping.emptyBody')}</p>
      </div>
    )
  }

  const totalItems = Object.keys(checklist).length
  const stockedItems = Object.values(checklist).filter(
    (item) => item.checked || item.inFridge,
  ).length
  const completionPercent =
    totalItems > 0 ? Math.round((stockedItems / totalItems) * 100) : 0

  if (ingredientSet === undefined) {
    return (
      <div className="planner-empty-state">
        <ShoppingCartIcon aria-hidden="true" />
        <h2>{t('shopping.unavailableTitle')}</h2>
        <p>{t('shopping.unavailableBody')}</p>
      </div>
    )
  }

  return (
    <div className="planner-shopping-tab">
      <div className="planner-shopping-header">
        <div>
          <p className="planner-section-kicker">{t('shopping.kicker')}</p>
          <h2>{t('shopping.title')}</h2>
          <p className="planner-shopping-helper">{t('shopping.helper')}</p>
        </div>

        <div className="planner-shopping-actions">
          <div
            aria-label={t('shopping.progressLabel', {
              stocked: stockedItems,
              total: totalItems,
            })}
            className="planner-progress-pill"
          >
            <div aria-hidden="true" className="planner-progress-track">
              <div
                className="planner-progress-fill"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <span>
              {t('shopping.progress', {
                stocked: stockedItems,
                total: totalItems,
              })}
            </span>
          </div>

          <button
            className="planner-reset-btn"
            type="button"
            onClick={onResetChecklist}
          >
            <RefreshIcon aria-hidden="true" />
            {t('shopping.reset')}
          </button>
        </div>
      </div>

      {neededItems > 0 && (
        <section className="planner-summary-banner shopping" aria-live="polite">
          <ShoppingCartIcon aria-hidden="true" />
          <p>
            {t('shopping.needToBuy', {
              count: neededItems,
              itemWord:
                neededItems === 1
                  ? t('shopping.itemSingular')
                  : t('shopping.itemPlural'),
            })}
          </p>
        </section>
      )}

      {neededItems === 0 && totalItems > 0 && (
        <section className="planner-summary-banner stocked" aria-live="polite">
          <CheckIcon aria-hidden="true" />
          <p>{t('shopping.stocked')}</p>
        </section>
      )}

      <div className="planner-ingredient-groups">
        {(Object.keys(CATEGORY_META) as IngredientCategory[]).map(
          (category) => {
            const meta = CATEGORY_META[category]
            const ingredients = ingredientSet[category]
            const stockedCount = ingredients.filter((ingredient) => {
              const itemState = checklist[
                getIngredientChecklistKey(category, ingredient.name)
              ] ?? { checked: false, inFridge: false }
              return itemState.checked || itemState.inFridge
            }).length

            return (
              <section
                className="planner-ingredient-group"
                key={category}
                style={
                  {
                    '--category-accent': meta.accent,
                    '--category-bg': meta.bg,
                    '--category-border': meta.border,
                  } as CSSProperties
                }
              >
                <div className="planner-ingredient-group-header">
                  <div className="planner-ingredient-group-title">
                    <span className="planner-ingredient-group-accent" />
                    <h3>{t(`categories.${category}`)}</h3>
                  </div>
                  <span className="planner-ingredient-group-progress">
                    {stockedCount}/{ingredients.length}
                  </span>
                </div>

                <div className="planner-ingredient-list">
                  {ingredients.map((ingredient) => {
                    const ingredientKey = getIngredientChecklistKey(
                      category,
                      ingredient.name,
                    )
                    const itemState = checklist[ingredientKey] ?? {
                      checked: false,
                      inFridge: false,
                    }
                    const isStocked = itemState.checked || itemState.inFridge

                    return (
                      <button
                        key={`${category}-${ingredient.name}`}
                        aria-pressed={isStocked}
                        className={`planner-ingredient-row ${isStocked ? 'stocked' : ''}`}
                        type="button"
                        onClick={() => onToggleChecklistItem(ingredientKey)}
                      >
                        <span
                          aria-hidden="true"
                          className={`planner-ingredient-checkbox ${isStocked ? 'checked' : ''}`}
                        >
                          {isStocked && <CheckIcon aria-hidden="true" />}
                        </span>

                        <span className="planner-ingredient-copy">
                          <span className="planner-ingredient-label">
                            {ingredient.name}
                          </span>
                          <span className="planner-ingredient-qty">
                            {ingredient.qty}
                          </span>
                        </span>

                        {isStocked && (
                          <span className="planner-in-fridge-tag">
                            <FridgeIcon aria-hidden="true" />
                            {t('shopping.inFridge')}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          },
        )}
      </div>
    </div>
  )
}
