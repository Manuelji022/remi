import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
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
  getWeekDateRange,
  getWeekNumber,
  isWeekend,
} from '#/data/constants'
import {
  CATEGORY_META,
  INGREDIENT_SETS,
  createChecklistState,
  getIngredientChecklistKey,
  getNeededItemsCount,
} from '#/data/ingredients'
import type { IngredientCategory } from '#/data/ingredients'
import { MENU_SETS } from '#/data/menu'
import {
  getActivePreferencesBadgeCount,
  getDayContextForDay,
  getDefaultPreferences,
  getPlanningScopeForDay,
} from '#/data/types'
import type { ChecklistState, Preferences, WeeklyMenu } from '#/data/types'

type MainTabId = 'menu' | 'ingredients'

export const Route = createFileRoute('/weekly-menu-planner')({
  component: WeeklyMenuPlanner,
})

function WeeklyMenuPlanner() {
  const [generatedMenu, setGeneratedMenu] = useState<WeeklyMenu | null>(null)
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

  const weekRange = getWeekDateRange()
  const activePreferenceCount = getActivePreferencesBadgeCount(savedPreferences)
  const neededItems = getNeededItemsCount(shoppingChecklist)

  function handleGenerateMenu() {
    if (isGenerating) return

    setIsGenerating(true)
    setActiveTab('menu')

    window.setTimeout(() => {
      const nextMenuIndex = (currentMenuIndex + 1) % MENU_SETS.length

      setGeneratedMenu(MENU_SETS[nextMenuIndex])
      setCurrentMenuIndex(nextMenuIndex)
      setShoppingChecklist(createChecklistState(INGREDIENT_SETS[nextMenuIndex]))
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
          <div className="planner-copy">
            <p className="planner-kicker">
              <CalendarIcon aria-hidden="true" />
              Week {getWeekNumber()} · {weekRange.start} to {weekRange.end}
            </p>
            <h1 id="planner-title">Weekly Menu Planner</h1>
            <p className="planner-intro">
              Generate a mock Weekly Menu for the current Calendar Week, tune
              preferences, and prepare the shopping checklist from the same
              screen.
            </p>
          </div>

          <div className="planner-actions" aria-label="Planner actions">
            <button
              className="planner-secondary-btn"
              type="button"
              onClick={handleOpenPreferences}
            >
              <SettingsIcon aria-hidden="true" />
              Preferences
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
                  Generating <LoadingDots />
                </>
              ) : (
                <>
                  <SparkleIcon aria-hidden="true" />
                  {generatedMenu ? 'Regenerate menu' : 'Generate menu'}
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
              Mock set {currentMenuIndex + 1} of {MENU_SETS.length}
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
            currentMenuIndex={currentMenuIndex}
            generatedMenu={generatedMenu}
            isGenerating={isGenerating}
            neededItems={neededItems}
            onResetChecklist={() => {
              if (currentMenuIndex < 0) return
              setShoppingChecklist(
                createChecklistState(INGREDIENT_SETS[currentMenuIndex]),
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
  if (isGenerating) {
    return (
      <div className="planner-empty-state" role="status" aria-live="polite">
        <SparkleIcon aria-hidden="true" />
        <h2>Building your Weekly Menu</h2>
        <p>Balancing lunch, dinner, variety, and your saved preferences.</p>
      </div>
    )
  }

  if (!generatedMenu) {
    return (
      <div className="planner-empty-state">
        <SparkleIcon aria-hidden="true" />
        <h2>No Weekly Menu yet</h2>
        <p>
          Start with a generated mock menu. The next phases will make this view
          richer, but the page state is already wired end to end.
        </p>
        <button
          className="planner-primary-btn"
          type="button"
          onClick={onGenerateMenu}
        >
          <SparkleIcon aria-hidden="true" />
          Generate menu
        </button>
      </div>
    )
  }

  return (
    <div className="planner-menu-tab" key={animationKey}>
      <div className="planner-section-heading">
        <div>
          <p className="planner-section-kicker">Current Calendar Week</p>
          <h2>Lunch and dinner at a glance</h2>
        </div>
        <p>
          Both Meal Slots stay visible so later phases can distinguish
          home-planned and unplanned slots cleanly.
        </p>
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

      <section className="planner-reasoning" aria-labelledby="reasoning-title">
        <div className="planner-reasoning-icon">
          <LeafIcon aria-hidden="true" />
        </div>
        <div>
          <p className="planner-section-kicker">Mock AI reasoning</p>
          <h2 id="reasoning-title">Why this Weekly Menu works</h2>
          <ul>
            <li>
              Alternates lighter lunches with richer dinners so the week feels
              varied without requiring a different cooking style every night.
            </li>
            <li>
              Keeps both lunch and dinner visible for each day, even when future
              preferences mark one slot as away from home.
            </li>
            <li>
              Uses the selected mock set to prepare ingredient state for the
              downstream shopping checklist.
            </li>
          </ul>
        </div>
      </section>
    </div>
  )
}

interface ShoppingTabProps {
  checklist: ChecklistState
  currentMenuIndex: number
  generatedMenu: WeeklyMenu | null
  isGenerating: boolean
  neededItems: number
  onResetChecklist: () => void
  onToggleChecklistItem: (ingredientKey: string) => void
}

function ShoppingTab({
  checklist,
  currentMenuIndex,
  generatedMenu,
  isGenerating,
  neededItems,
  onResetChecklist,
  onToggleChecklistItem,
}: ShoppingTabProps) {
  if (!generatedMenu || isGenerating) {
    return (
      <div className="planner-empty-state">
        <ShoppingCartIcon aria-hidden="true" />
        <h2>Generate a Weekly Menu first</h2>
        <p>
          The shopping checklist is tied to the selected mock menu set and will
          be expanded in the shopping-list phase.
        </p>
      </div>
    )
  }

  const ingredientSet = INGREDIENT_SETS.at(currentMenuIndex)
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
        <h2>Shopping data unavailable</h2>
        <p>Generate the Weekly Menu again to rebuild the ingredient list.</p>
      </div>
    )
  }

  return (
    <div className="planner-shopping-tab">
      <div className="planner-shopping-header">
        <div>
          <p className="planner-section-kicker">Shopping List</p>
          <h2>Everything you need for this week</h2>
          <p className="planner-shopping-helper">
            Tick the items you already have. The rest becomes your shopping list
            for the week.
          </p>
        </div>

        <div className="planner-shopping-actions">
          <div
            aria-label={`${stockedItems} of ${totalItems} ingredients already in fridge`}
            className="planner-progress-pill"
          >
            <div aria-hidden="true" className="planner-progress-track">
              <div
                className="planner-progress-fill"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <span>
              {stockedItems}/{totalItems} in fridge
            </span>
          </div>

          <button
            className="planner-reset-btn"
            type="button"
            onClick={onResetChecklist}
          >
            <RefreshIcon aria-hidden="true" />
            Reset checklist
          </button>
        </div>
      </div>

      {neededItems > 0 && (
        <section className="planner-summary-banner shopping" aria-live="polite">
          <ShoppingCartIcon aria-hidden="true" />
          <p>
            You still need to buy{' '}
            <strong>
              {neededItems} item{neededItems === 1 ? '' : 's'}
            </strong>{' '}
            for this weekly menu.
          </p>
        </section>
      )}

      {neededItems === 0 && totalItems > 0 && (
        <section className="planner-summary-banner stocked" aria-live="polite">
          <CheckIcon aria-hidden="true" />
          <p>Your fridge is stocked. Nothing left to buy this week.</p>
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
                    <h3>{meta.label}</h3>
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
                            In fridge
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
