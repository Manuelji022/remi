import './preferences-panel.css'
import { useEffect, useEffectEvent, useState } from 'react'
import type { Day } from '#/features/weekly-menu/constants'
import type {
  DayContext,
  PlanningScope,
  Preferences,
} from '#/features/weekly-menu/types'
import { useI18n } from '#/shared/i18n'
import { authClient } from '#/features/auth/auth-client'
import type { RecipeInput } from '#/features/recipes/recipe'
import { PanelFooter } from './PanelFooter'
import { PanelHeader } from './PanelHeader'
import { PanelTabContent } from './PanelTabContent'
import { PanelTabButton } from './Pills'
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
    isActive: isOpen && !isSessionPending,
    userId,
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

        <PanelTabContent
          activeTab={activeTab}
          draftPrefs={draftPrefs}
          isSaving={isSaving}
          isRecipeMutationPending={isRecipeMutationPending}
          legacyPending={legacyCustomRecipes.length > 0}
          migrationFailed={migrationFailed}
          onRecipeMutation={onRecipeMutation}
          onRecipeMutationPendingChange={onRecipeMutationPendingChange}
          onUpdateDayContext={updateDayContext}
          onUpdatePlanningScope={updatePlanningScope}
          scheduleLocked={scheduleLocked}
        />

        <PanelFooter
          draftPrefs={draftPrefs}
          isSaving={isSaving}
          isRecipeMutationPending={isRecipeMutationPending}
          onClose={onClose}
          onSave={onSave}
          saveDisabled={saveDisabled}
          saveError={saveError}
        />
      </div>
    </Dialog>
  )
}
