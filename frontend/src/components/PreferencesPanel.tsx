import './preferences-panel.css'

import { useEffect, useId, useMemo, useState } from 'react'
import { DAYS, isWeekend } from '#/data/constants'
import type { Day } from '#/data/constants'
import type {
  CustomRecipe,
  DayContext,
  PlanningScope,
  Preferences,
  RecipeIngredient,
} from '#/data/types'
import {
  CalendarIcon,
  CheckIcon,
  CloseIcon,
  PlusIcon,
  SettingsIcon,
  TrashIcon,
  UtensilsIcon,
} from '#/components/icons'

type PreferencesPanelTab = 'schedule' | 'recipes'

interface PreferencesPanelProps {
  isOpen: boolean
  onClose: () => void
  savedPrefs: Preferences
  onSave: (prefs: Preferences) => void
}

const PLANNING_SCOPE_OPTIONS: PlanningScope[] = ['lunch', 'dinner', 'both']
const PLANNING_SCOPE_LABELS: Record<PlanningScope, string> = {
  lunch: 'Lunch',
  dinner: 'Dinner',
  both: 'Both',
}

const RECIPE_USAGE_LABELS: Record<PlanningScope, string> = {
  lunch: 'Lunch',
  dinner: 'Dinner',
  both: 'Lunch and dinner',
}

const EMPTY_RECIPE_INGREDIENT: RecipeIngredient = {
  name: '',
  quantity: '',
}

function getBlockedPlanningScopes(
  dayContext: DayContext | null,
): ReadonlyArray<PlanningScope> {
  if (dayContext === 'office') return ['lunch', 'both']
  if (dayContext === 'eatOut') return ['both']

  return []
}

function getPlanningScopeForContext(
  dayContext: DayContext | null,
  currentScope: PlanningScope,
): PlanningScope {
  const blockedScopes = getBlockedPlanningScopes(dayContext)

  return blockedScopes.includes(currentScope) ? 'dinner' : currentScope
}

export function PreferencesPanel({
  isOpen,
  onClose,
  savedPrefs,
  onSave,
}: PreferencesPanelProps) {
  const [draftPrefs, setDraftPrefs] = useState<Preferences>(() =>
    normalizePreferences(savedPrefs),
  )
  const [activeTab, setActiveTab] = useState<PreferencesPanelTab>('schedule')
  const [recipeName, setRecipeName] = useState('')
  const [recipePlanningScope, setRecipePlanningScope] =
    useState<PlanningScope>('both')
  const [recipeIngredients, setRecipeIngredients] = useState<
    RecipeIngredient[]
  >([{ ...EMPTY_RECIPE_INGREDIENT }])
  const recipeNameId = useId()

  useEffect(() => {
    if (!isOpen) return

    setDraftPrefs(normalizePreferences(savedPrefs))
    setActiveTab('schedule')
    setRecipeName('')
    setRecipePlanningScope('both')
    setRecipeIngredients([{ ...EMPTY_RECIPE_INGREDIENT }])
  }, [isOpen, savedPrefs])

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(draftPrefs) !== JSON.stringify(savedPrefs),
    [draftPrefs, savedPrefs],
  )

  if (!isOpen) return null

  function updateDayContext(day: Day, nextContext: DayContext) {
    const currentContext = draftPrefs.dayContexts[day] ?? null
    const dayContexts = { ...draftPrefs.dayContexts }
    const currentScope = draftPrefs.planningScopes[day] ?? 'both'
    const nextActiveContext =
      currentContext === nextContext ? null : nextContext

    if (currentContext === nextContext) {
      delete dayContexts[day]
    } else {
      dayContexts[day] = nextContext
    }

    setDraftPrefs({
      ...draftPrefs,
      dayContexts,
      planningScopes: {
        ...draftPrefs.planningScopes,
        [day]: getPlanningScopeForContext(nextActiveContext, currentScope),
      },
    })
  }

  function updatePlanningScope(day: Day, nextScope: PlanningScope) {
    const dayContext = draftPrefs.dayContexts[day] ?? null
    const blockedScopes = getBlockedPlanningScopes(dayContext)

    if (blockedScopes.includes(nextScope)) return

    const planningScopes = { ...draftPrefs.planningScopes, [day]: nextScope }
    setDraftPrefs({
      ...draftPrefs,
      planningScopes,
    })
  }

  function handleAddRecipe() {
    const name = recipeName.trim()
    const ingredients = recipeIngredients
      .map((ingredient) => ({
        name: ingredient.name.trim(),
        quantity: ingredient.quantity.trim(),
      }))
      .filter((ingredient) => ingredient.name)

    if (!name || ingredients.length === 0) return

    const nextRecipe: CustomRecipe = {
      name,
      ingredients,
      planningScope: recipePlanningScope,
    }

    setDraftPrefs({
      ...draftPrefs,
      customRecipes: [...draftPrefs.customRecipes, nextRecipe],
    })

    setRecipeName('')
    setRecipePlanningScope('both')
    setRecipeIngredients([{ ...EMPTY_RECIPE_INGREDIENT }])
  }

  function updateRecipeIngredient(
    ingredientIndex: number,
    field: keyof RecipeIngredient,
    value: string,
  ) {
    setRecipeIngredients((currentIngredients) =>
      currentIngredients.map((ingredient, index) =>
        index === ingredientIndex
          ? { ...ingredient, [field]: value }
          : ingredient,
      ),
    )
  }

  function addRecipeIngredient() {
    setRecipeIngredients((currentIngredients) => [
      ...currentIngredients,
      { ...EMPTY_RECIPE_INGREDIENT },
    ])
  }

  function deleteRecipeIngredient(ingredientIndex: number) {
    setRecipeIngredients((currentIngredients) => {
      if (currentIngredients.length === 1)
        return [{ ...EMPTY_RECIPE_INGREDIENT }]

      return currentIngredients.filter((_, index) => index !== ingredientIndex)
    })
  }

  function handleDeleteRecipe(recipeIndex: number) {
    setDraftPrefs({
      ...draftPrefs,
      customRecipes: draftPrefs.customRecipes.filter(
        (_, index) => index !== recipeIndex,
      ),
    })
  }

  return (
    <div className="panel-root" aria-hidden={!isOpen}>
      <button
        className="panel-overlay"
        type="button"
        aria-label="Close preferences panel"
        onClick={onClose}
      />

      <aside
        aria-labelledby="preferences-panel-title"
        aria-modal="true"
        className="panel-drawer"
        role="dialog"
      >
        <div className="panel-header">
          <div>
            <p className="panel-kicker">
              <SettingsIcon aria-hidden="true" />
              Meal planning
            </p>
            <h2 id="preferences-panel-title">Preferences</h2>
            <p className="panel-subtitle">
              Tailor the weekly menu to your week
            </p>
          </div>
          <button
            className="panel-close-btn"
            type="button"
            aria-label="Close preferences panel"
            onClick={onClose}
          >
            <CloseIcon aria-hidden="true" />
          </button>
        </div>

        <div
          className="panel-tablist"
          role="tablist"
          aria-label="Preferences sections"
        >
          <PanelTabButton
            id="schedule"
            isActive={activeTab === 'schedule'}
            label="Weekly Schedule"
            onClick={() => setActiveTab('schedule')}
          />
          <PanelTabButton
            id="recipes"
            isActive={activeTab === 'recipes'}
            label="My Recipes"
            onClick={() => setActiveTab('recipes')}
          />
        </div>

        <div className="panel-content">
          {activeTab === 'schedule' ? (
            <section
              aria-labelledby="preferences-schedule-title"
              className="panel-section"
              id="preferences-schedule-panel"
              role="tabpanel"
            >
              <div className="panel-section-copy">
                <p className="panel-section-kicker">
                  <CalendarIcon aria-hidden="true" />
                  Weekly schedule
                </p>
                <h3 id="preferences-schedule-title">Plan around each day</h3>
                <p>
                  Mark office or eat-out days, then choose whether lunch,
                  dinner, or both still need planning at home.
                </p>
              </div>

              <div className="panel-day-list">
                {DAYS.map((day) => {
                  const dayContext = draftPrefs.dayContexts[day] ?? null
                  const planningScope = draftPrefs.planningScopes[day] ?? 'both'
                  const blockedScopes = getBlockedPlanningScopes(dayContext)

                  return (
                    <article
                      className={`panel-day-card ${isWeekend(day) ? 'weekend' : ''}`}
                      key={day}
                    >
                      <div className="panel-day-header">
                        <div>
                          <h4>{day}</h4>
                          <p>
                            {dayContext
                              ? dayContext === 'office'
                                ? 'Office day'
                                : 'Eating out'
                              : 'No day context selected'}
                          </p>
                        </div>
                        {isWeekend(day) && (
                          <span className="panel-day-badge">Weekend</span>
                        )}
                      </div>

                      <div className="panel-control-group">
                        <span className="panel-control-label">Context</span>
                        <div className="panel-pill-row">
                          <DayContextPill
                            context="office"
                            isSelected={dayContext === 'office'}
                            onClick={() => updateDayContext(day, 'office')}
                          />
                          <DayContextPill
                            context="eatOut"
                            isSelected={dayContext === 'eatOut'}
                            onClick={() => updateDayContext(day, 'eatOut')}
                          />
                        </div>
                      </div>

                      <div className="panel-control-group">
                        <span className="panel-control-label">
                          Plan at home
                        </span>
                        <div className="panel-pill-row">
                          {PLANNING_SCOPE_OPTIONS.map((scope) => {
                            const isBlocked = blockedScopes.includes(scope)

                            return (
                              <PlanningScopePill
                                isDisabled={isBlocked}
                                isSelected={planningScope === scope}
                                key={scope}
                                label={PLANNING_SCOPE_LABELS[scope]}
                                onClick={() => updatePlanningScope(day, scope)}
                              />
                            )
                          })}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ) : (
            <section
              aria-labelledby="preferences-recipes-title"
              className="panel-section"
              id="preferences-recipes-panel"
              role="tabpanel"
            >
              <div className="panel-section-copy">
                <p className="panel-section-kicker">
                  <PlusIcon aria-hidden="true" />
                  My recipes
                </p>
                <h3 id="preferences-recipes-title">
                  Save recipes to reuse later
                </h3>
                <p>
                  Add favorite meals with ingredients and when they work best.
                </p>
              </div>

              <div className="panel-recipe-form">
                <label className="panel-field">
                  <span>Recipe name</span>
                  <input
                    id={recipeNameId}
                    name="recipeName"
                    onChange={(event) => setRecipeName(event.target.value)}
                    placeholder="Ex. Lemon chickpea pasta"
                    type="text"
                    value={recipeName}
                  />
                </label>

                <div className="panel-control-group">
                  <span className="panel-control-label">Use for</span>
                  <div className="panel-pill-row">
                    {PLANNING_SCOPE_OPTIONS.map((scope) => (
                      <PlanningScopePill
                        isDisabled={false}
                        isSelected={recipePlanningScope === scope}
                        key={scope}
                        label={PLANNING_SCOPE_LABELS[scope]}
                        onClick={() => setRecipePlanningScope(scope)}
                      />
                    ))}
                  </div>
                </div>

                <div className="panel-control-group">
                  <span className="panel-control-label">Ingredients</span>
                  <div className="panel-ingredient-editor">
                    {recipeIngredients.map((ingredient, ingredientIndex) => (
                      <div
                        className="panel-ingredient-row"
                        key={ingredientIndex}
                      >
                        <label className="panel-field panel-quantity-field">
                          <span>Quantity</span>
                          <input
                            name={`recipeIngredientQuantity-${ingredientIndex}`}
                            onChange={(event) =>
                              updateRecipeIngredient(
                                ingredientIndex,
                                'quantity',
                                event.target.value,
                              )
                            }
                            placeholder="Optional"
                            type="text"
                            value={ingredient.quantity}
                          />
                        </label>
                        <label className="panel-field">
                          <span>Ingredient</span>
                          <input
                            name={`recipeIngredientName-${ingredientIndex}`}
                            onChange={(event) =>
                              updateRecipeIngredient(
                                ingredientIndex,
                                'name',
                                event.target.value,
                              )
                            }
                            placeholder="Ex. lentils"
                            type="text"
                            value={ingredient.name}
                          />
                        </label>
                        <button
                          className="panel-icon-btn panel-ingredient-delete"
                          type="button"
                          aria-label="Delete ingredient"
                          onClick={() =>
                            deleteRecipeIngredient(ingredientIndex)
                          }
                        >
                          <TrashIcon aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    className="panel-inline-add-btn"
                    type="button"
                    onClick={addRecipeIngredient}
                  >
                    <PlusIcon aria-hidden="true" />
                    Add ingredient
                  </button>
                </div>

                <button
                  className="panel-add-btn"
                  type="button"
                  disabled={
                    !recipeName.trim() ||
                    !recipeIngredients.some((ingredient) =>
                      ingredient.name.trim(),
                    )
                  }
                  onClick={handleAddRecipe}
                >
                  <PlusIcon aria-hidden="true" />
                  Add recipe
                </button>
              </div>

              {draftPrefs.customRecipes.length === 0 ? (
                <div className="panel-empty-recipes">
                  <p>No custom recipes saved yet.</p>
                </div>
              ) : (
                <div className="panel-recipe-list">
                  {draftPrefs.customRecipes.map((recipe, recipeIndex) => (
                    <article
                      className="panel-recipe-card"
                      key={`${recipe.name}-${recipeIndex}`}
                    >
                      <div className="panel-recipe-copy">
                        <div className="panel-recipe-title-row">
                          <h4>{recipe.name}</h4>
                          <span className="panel-recipe-scope">
                            {RECIPE_USAGE_LABELS[recipe.planningScope]}
                          </span>
                        </div>
                        <ul className="panel-recipe-ingredients">
                          {recipe.ingredients.map((ingredient, index) => (
                            <li key={`${ingredient.name}-${index}`}>
                              {[ingredient.quantity, ingredient.name]
                                .filter(Boolean)
                                .join(' ')}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        className="panel-icon-btn"
                        type="button"
                        aria-label={`Delete ${recipe.name}`}
                        onClick={() => handleDeleteRecipe(recipeIndex)}
                      >
                        <TrashIcon aria-hidden="true" />
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        <div className="panel-footer">
          <p className="panel-footer-note">
            {hasUnsavedChanges
              ? 'You have unsaved preference changes.'
              : 'Changes are ready to save when you are.'}
          </p>
          <div className="panel-footer-actions">
            <button
              className="panel-secondary-btn"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="panel-primary-btn"
              type="button"
              onClick={() => onSave(draftPrefs)}
            >
              <CheckIcon aria-hidden="true" />
              Save preferences
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}

function normalizePreferences(preferences: Preferences): Preferences {
  const customRecipes = preferences.customRecipes as Array<
    Partial<CustomRecipe>
  >

  return {
    ...preferences,
    customRecipes: customRecipes.map((recipe) => ({
      name: recipe.name ?? '',
      ingredients: Array.isArray(recipe.ingredients)
        ? (recipe.ingredients as Array<Partial<RecipeIngredient>>).map(
            (ingredient) => ({
              name: ingredient.name ?? '',
              quantity: ingredient.quantity ?? '',
            }),
          )
        : [],
      planningScope: recipe.planningScope ?? 'both',
    })),
  }
}

interface PanelTabButtonProps {
  id: PreferencesPanelTab
  isActive: boolean
  label: string
  onClick: () => void
}

function PanelTabButton({ id, isActive, label, onClick }: PanelTabButtonProps) {
  return (
    <button
      aria-controls={`preferences-${id}-panel`}
      aria-selected={isActive}
      className={`panel-tab-btn ${isActive ? 'active' : ''}`}
      id={`preferences-${id}-tab`}
      role="tab"
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  )
}

interface DayContextPillProps {
  context: 'office' | 'eatOut'
  isSelected: boolean
  onClick: () => void
}

function DayContextPill({ context, isSelected, onClick }: DayContextPillProps) {
  const label = context === 'office' ? 'Office' : 'Eat out'
  const Icon = context === 'office' ? CalendarIcon : UtensilsIcon

  return (
    <button
      className={`panel-context-pill ${isSelected ? 'selected' : ''}`}
      type="button"
      onClick={onClick}
    >
      <Icon aria-hidden="true" />
      {label}
    </button>
  )
}

interface PlanningScopePillProps {
  isDisabled: boolean
  isSelected: boolean
  label: string
  onClick: () => void
}

function PlanningScopePill({
  isDisabled,
  isSelected,
  label,
  onClick,
}: PlanningScopePillProps) {
  return (
    <button
      className={`panel-scope-pill ${isSelected ? 'selected' : ''}`}
      disabled={isDisabled}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  )
}
