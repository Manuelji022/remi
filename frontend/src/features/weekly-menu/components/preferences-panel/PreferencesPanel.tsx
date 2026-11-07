import './preferences-panel.css'
import { useEffect, useEffectEvent, useState } from 'react'
import { CheckIcon } from '#/components/primitives'
import type { Day } from '#/features/weekly-menu/constants'
import type {
  DayContext,
  PlanningScope,
  Preferences,
} from '#/features/weekly-menu/types'
import { useI18n } from '#/shared/i18n'
import { authClient } from '#/features/auth/auth-client'
import type { RecipeInput } from '#/features/recipes/recipe'
import { RecipesTab } from '#/features/recipes/components/RecipesTab'
import { PanelHeader } from './PanelHeader'
import { PanelTabButton } from './Pills'
import { ScheduleTab } from './ScheduleTab'
import { useLegacyRecipeMigration } from './useLegacyRecipeMigration'
import { useRestoreFocus } from './useRestoreFocus'
import { usePanelScrollLock } from './usePanelScrollLock'
import { Dialog } from '#/components/primitives/Dialog'
import type { PreferencesPanelTab } from './types'
import {
  updateScheduleDayContext as transitionScheduleDayContext,
  updateSchedulePlanningScope as transitionSchedulePlanningScope,
} from '#/features/weekly-menu/schedule-domain'

interface PreferencesPanelProps {
  isOpen: boolean
  initialTab?: PreferencesPanelTab
  isSaving: boolean
  isRecipeMutationPending: boolean
  onRecipeMutation: () => Promise<void>
  onRecipeMutationPendingChange: (pending: boolean) => void
  scheduleLocked?: boolean
  saveDisabled: boolean
  saveError: string | null
  onClose: () => void
  savedPrefs: Preferences
  onSave: (prefs: Preferences) => void
  legacyCustomRecipes: RecipeInput[]
  onLegacyRecipesMigrated: () => void
}

export function PreferencesPanel({
  isOpen,
  initialTab = 'schedule',
  isSaving,
  isRecipeMutationPending,
  onRecipeMutation,
  onRecipeMutationPendingChange,
  scheduleLocked = false,
  saveDisabled,
  saveError,
  onClose,
  savedPrefs,
  onSave,
  legacyCustomRecipes,
  onLegacyRecipesMigrated,
}: PreferencesPanelProps) {
  const { t } = useI18n()
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const [draftPrefs, setDraftPrefs] = useState<Preferences>(savedPrefs)
  const [activeTab, setActiveTab] = useState<PreferencesPanelTab>('schedule')
  const userId = session?.user.id

  const resetDraft = useEffectEvent(() => {
    setDraftPrefs(savedPrefs)
    setActiveTab(initialTab)
  })

  useEffect(() => {
    if (isOpen) resetDraft()
  }, [isOpen])

  usePanelScrollLock(isOpen)
  useRestoreFocus(isOpen)

  const migrationFailed = useLegacyRecipeMigration({
    isActive: isOpen && !isSessionPending && Boolean(userId),
    legacyCustomRecipes,
    onMigrated: onLegacyRecipesMigrated,
  })

  if (!isOpen) return null

  function updateDayContext(day: Day, nextContext: DayContext) {
    setDraftPrefs(transitionScheduleDayContext(draftPrefs, day, nextContext))
  }

  function updatePlanningScope(day: Day, nextScope: PlanningScope) {
    setDraftPrefs(transitionSchedulePlanningScope(draftPrefs, day, nextScope))
  }

  return (
    <Dialog
      className="panel-root"
      dismissDisabled={isSaving || isRecipeMutationPending}
      labelledBy="preferences-panel-title"
      onDismiss={onClose}
    >
      <button
        className="panel-overlay"
        disabled={isSaving || isRecipeMutationPending}
        type="button"
        aria-label={t('preferences.close')}
        onClick={onClose}
      />

      <div
        aria-busy={isSaving || isRecipeMutationPending}
        className="panel-drawer"
      >
        <PanelHeader
          closeDisabled={isSaving || isRecipeMutationPending}
          onClose={onClose}
        />

        <div
          className="panel-tablist"
          role="tablist"
          aria-label={t('preferences.sections')}
        >
          <PanelTabButton
            id="schedule"
            isActive={activeTab === 'schedule'}
            isDisabled={isRecipeMutationPending}
            label={t('preferences.weeklySchedule')}
            onClick={() => setActiveTab('schedule')}
          />
          <PanelTabButton
            id="recipes"
            isActive={activeTab === 'recipes'}
            isDisabled={isRecipeMutationPending}
            label={t('preferences.myRecipes')}
            onClick={() => setActiveTab('recipes')}
          />
        </div>

        <fieldset
          className="panel-content panel-edit-fields"
          disabled={
            isSaving ||
            isRecipeMutationPending ||
            (activeTab === 'schedule' && scheduleLocked)
          }
        >
          {activeTab === 'schedule' ? (
            <>
              {scheduleLocked && (
                <p role="note">{t('planner.lockedScheduleNote')}</p>
              )}
              <ScheduleTab
                dayContexts={draftPrefs.dayContexts}
                planningScopes={draftPrefs.planningScopes}
                onUpdateDayContext={updateDayContext}
                onUpdatePlanningScope={updatePlanningScope}
              />
            </>
          ) : (
            <RecipesTab
              legacyPending={legacyCustomRecipes.length > 0}
              migrationFailed={migrationFailed}
              onRecipeMutation={onRecipeMutation}
              onRecipeMutationPendingChange={onRecipeMutationPendingChange}
            />
          )}
        </fieldset>

        <div className="panel-footer">
          {saveError && (
            <p className="panel-field-error" role="alert">
              {saveError}
            </p>
          )}
          <div className="panel-footer-actions">
            <button
              className="btn btn-secondary"
              disabled={isSaving || isRecipeMutationPending}
              type="button"
              onClick={onClose}
            >
              {t('common.cancel')}
            </button>
            <button
              className="btn btn-primary"
              disabled={saveDisabled || isRecipeMutationPending}
              type="button"
              onClick={() => onSave(draftPrefs)}
            >
              <CheckIcon aria-hidden="true" />
              {t(isSaving ? 'preferences.saving' : 'preferences.save')}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
