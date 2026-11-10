import type { Preferences } from '#/features/weekly-menu/types'
import { RecipesTab } from '#/features/recipes/components/RecipesTab'
import { useI18n } from '#/shared/i18n'
import type { PreferencesPanelTab } from './types'
import { ScheduleTab } from './ScheduleTab'
import type {
  ScheduleDayContextChange,
  SchedulePlanningScopeChange,
} from '../../schedule-domain'

interface PanelTabContentProps {
  activeTab: PreferencesPanelTab
  draftPrefs: Preferences
  isSaving: boolean
  isRecipeMutationPending: boolean
  legacyPending: boolean
  migrationFailed: boolean
  onRecipeMutation: () => Promise<void>
  onRecipeMutationPendingChange: (pending: boolean) => void
  onUpdateDayContext: ScheduleDayContextChange
  onUpdatePlanningScope: SchedulePlanningScopeChange
  scheduleLocked: boolean
}

export function PanelTabContent({
  activeTab,
  draftPrefs,
  isSaving,
  isRecipeMutationPending,
  legacyPending,
  migrationFailed,
  onRecipeMutation,
  onRecipeMutationPendingChange,
  onUpdateDayContext,
  onUpdatePlanningScope,
  scheduleLocked,
}: PanelTabContentProps) {
  const { t } = useI18n()

  return (
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
            onUpdateDayContext={onUpdateDayContext}
            onUpdatePlanningScope={onUpdatePlanningScope}
          />
        </>
      ) : (
        <RecipesTab
          legacyPending={legacyPending}
          migrationFailed={migrationFailed}
          onRecipeMutation={onRecipeMutation}
          onRecipeMutationPendingChange={onRecipeMutationPendingChange}
        />
      )}
    </fieldset>
  )
}
