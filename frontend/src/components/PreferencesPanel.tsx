import './preferences-panel.css'

import { useEffect, useId, useMemo, useState } from 'react'
import { DAYS, isWeekend } from '#/data/constants'
import type { Day } from '#/data/constants'
import type {
  CustomRecipe,
  DayContext,
  PlanningScope,
  Preferences,
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
import { useI18n } from '#/i18n'

type PreferencesPanelTab = 'schedule' | 'recipes'

interface PreferencesPanelProps {
  isOpen: boolean
  onClose: () => void
  savedPrefs: Preferences
  onSave: (prefs: Preferences) => void
}

const PLANNING_SCOPE_OPTIONS: PlanningScope[] = ['lunch', 'dinner', 'both']
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
  const { t } = useI18n()
  const [draftPrefs, setDraftPrefs] = useState<Preferences>(savedPrefs)
  const [activeTab, setActiveTab] = useState<PreferencesPanelTab>('schedule')
  const [recipeName, setRecipeName] = useState('')
  const [recipeDescription, setRecipeDescription] = useState('')
  const recipeNameId = useId()
  const recipeDescriptionId = useId()

  useEffect(() => {
    if (!isOpen) return

    setDraftPrefs(savedPrefs)
    setActiveTab('schedule')
    setRecipeName('')
    setRecipeDescription('')
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
    const description = recipeDescription.trim()

    if (!name) return

    const nextRecipe: CustomRecipe = {
      name,
      description,
    }

    setDraftPrefs({
      ...draftPrefs,
      customRecipes: [...draftPrefs.customRecipes, nextRecipe],
    })

    setRecipeName('')
    setRecipeDescription('')
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
        aria-label={t('preferences.close')}
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
              {t('preferences.kicker')}
            </p>
            <h2 id="preferences-panel-title">{t('preferences.title')}</h2>
            <p className="panel-subtitle">
              {t('preferences.subtitle')}
            </p>
          </div>
          <button
            className="panel-close-btn"
            type="button"
            aria-label={t('preferences.close')}
            onClick={onClose}
          >
            <CloseIcon aria-hidden="true" />
          </button>
        </div>

        <div
          className="panel-tablist"
          role="tablist"
          aria-label={t('preferences.sections')}
        >
          <PanelTabButton
            id="schedule"
            isActive={activeTab === 'schedule'}
            label={t('preferences.weeklySchedule')}
            onClick={() => setActiveTab('schedule')}
          />
          <PanelTabButton
            id="recipes"
            isActive={activeTab === 'recipes'}
            label={t('preferences.myRecipes')}
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
                  {t('preferences.scheduleKicker')}
                </p>
                <h3 id="preferences-schedule-title">
                  {t('preferences.scheduleTitle')}
                </h3>
                <p>{t('preferences.scheduleBody')}</p>
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
                          <h4>{t(`days.${day}`)}</h4>
                          <p>
                            {dayContext
                              ? dayContext === 'office'
                                ? t('dayContext.officeDay')
                                : t('dayContext.eatingOut')
                              : t('dayContext.none')}
                          </p>
                        </div>
                        {isWeekend(day) && (
                          <span className="panel-day-badge">
                            {t('common.weekend')}
                          </span>
                        )}
                      </div>

                      <div className="panel-control-group">
                        <span className="panel-control-label">
                          {t('preferences.context')}
                        </span>
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
                          {t('preferences.planAtHome')}
                        </span>
                        <div className="panel-pill-row">
                          {PLANNING_SCOPE_OPTIONS.map((scope) => {
                            const isBlocked = blockedScopes.includes(scope)

                            return (
                              <PlanningScopePill
                                isDisabled={isBlocked}
                                isSelected={planningScope === scope}
                                key={scope}
                                label={
                                  scope === 'both'
                                    ? t('scopes.both')
                                    : t(`slots.${scope}`)
                                }
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
                  {t('preferences.recipesKicker')}
                </p>
                <h3 id="preferences-recipes-title">
                  {t('preferences.recipesTitle')}
                </h3>
                <p>{t('preferences.recipesBody')}</p>
              </div>

              <div className="panel-recipe-form">
                <label className="panel-field">
                  <span>{t('preferences.recipeName')}</span>
                  <input
                    id={recipeNameId}
                    name="recipeName"
                    onChange={(event) => setRecipeName(event.target.value)}
                    placeholder={t('preferences.recipeNamePlaceholder')}
                    type="text"
                    value={recipeName}
                  />
                </label>

                <label className="panel-field">
                  <span>{t('preferences.recipeDescription')}</span>
                  <textarea
                    id={recipeDescriptionId}
                    name="recipeDescription"
                    onChange={(event) =>
                      setRecipeDescription(event.target.value)
                    }
                    placeholder={t('preferences.recipeDescriptionPlaceholder')}
                    rows={3}
                    value={recipeDescription}
                  />
                </label>

                <button
                  className="panel-add-btn"
                  type="button"
                  disabled={!recipeName.trim()}
                  onClick={handleAddRecipe}
                >
                  <PlusIcon aria-hidden="true" />
                  {t('preferences.addRecipe')}
                </button>
              </div>

              {draftPrefs.customRecipes.length === 0 ? (
                <div className="panel-empty-recipes">
                  <p>{t('preferences.emptyRecipes')}</p>
                </div>
              ) : (
                <div className="panel-recipe-list">
                  {draftPrefs.customRecipes.map((recipe, recipeIndex) => (
                    <article
                      className="panel-recipe-card"
                      key={`${recipe.name}-${recipeIndex}`}
                    >
                      <div className="panel-recipe-copy">
                        <h4>{recipe.name}</h4>
                        <p>
                          {recipe.description || t('preferences.noRecipeNotes')}
                        </p>
                      </div>

                      <button
                        className="panel-icon-btn"
                        type="button"
                        aria-label={t('preferences.deleteRecipe', {
                          name: recipe.name,
                        })}
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
              ? t('preferences.unsaved')
              : t('preferences.ready')}
          </p>
          <div className="panel-footer-actions">
            <button
              className="panel-secondary-btn"
              type="button"
              onClick={onClose}
            >
              {t('common.cancel')}
            </button>
            <button
              className="panel-primary-btn"
              type="button"
              onClick={() => onSave(draftPrefs)}
            >
              <CheckIcon aria-hidden="true" />
              {t('preferences.save')}
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
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
  const { t } = useI18n()
  const label = t(`contexts.${context}`)
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
