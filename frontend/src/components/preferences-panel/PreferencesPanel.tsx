import './preferences-panel.css'

import { Link, useLocation } from '@tanstack/react-router'
import { Globe2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CheckIcon, CloseIcon, SettingsIcon } from '#/components/icons'
import type { Day } from '#/data/constants'
import type {
  CustomRecipe,
  DayContext,
  PlanningScope,
  Preferences,
} from '#/data/types'
import { getLocalizedPath, useI18n } from '#/i18n'
import { PanelTabButton } from './Pills'
import { RecipesTab } from './RecipesTab'
import { ScheduleTab } from './ScheduleTab'
import type { PreferencesPanelTab } from './types'
import { getBlockedPlanningScopes, getPlanningScopeForContext } from './utils'

interface PreferencesPanelProps {
  isOpen: boolean
  onClose: () => void
  savedPrefs: Preferences
  onSave: (prefs: Preferences) => void
}

export function PreferencesPanel({
  isOpen,
  onClose,
  savedPrefs,
  onSave,
}: PreferencesPanelProps) {
  const { locale, t } = useI18n()
  const location = useLocation()
  const alternateLocale = locale === 'en' ? 'es' : 'en'
  const [draftPrefs, setDraftPrefs] = useState<Preferences>(savedPrefs)
  const [activeTab, setActiveTab] = useState<PreferencesPanelTab>('schedule')

  useEffect(() => {
    if (!isOpen) return

    setDraftPrefs(savedPrefs)
    setActiveTab('schedule')
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

    setDraftPrefs({
      ...draftPrefs,
      planningScopes: { ...draftPrefs.planningScopes, [day]: nextScope },
    })
  }

  function handleAddRecipe(recipe: CustomRecipe) {
    setDraftPrefs({
      ...draftPrefs,
      customRecipes: [...draftPrefs.customRecipes, recipe],
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
          </div>
          <div className="panel-header-actions">
            <Link
              aria-label={`${t('header.languageLabel')}: ${
                alternateLocale === 'en'
                  ? t('header.languageEn')
                  : t('header.languageEs')
              }`}
              className="panel-language-switcher"
              to={getLocalizedPath(location.pathname, alternateLocale)}
            >
              <Globe2 aria-hidden="true" />
              <span>{locale === 'en' ? 'ES' : 'EN'}</span>
            </Link>
            <button
              className="panel-close-btn"
              type="button"
              aria-label={t('preferences.close')}
              onClick={onClose}
            >
              <CloseIcon aria-hidden="true" />
            </button>
          </div>
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
            <ScheduleTab
              dayContexts={draftPrefs.dayContexts}
              planningScopes={draftPrefs.planningScopes}
              onUpdateDayContext={updateDayContext}
              onUpdatePlanningScope={updatePlanningScope}
            />
          ) : (
            <RecipesTab
              customRecipes={draftPrefs.customRecipes}
              onAddRecipe={handleAddRecipe}
              onDeleteRecipe={handleDeleteRecipe}
            />
          )}
        </div>

        <div className="panel-footer">
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
