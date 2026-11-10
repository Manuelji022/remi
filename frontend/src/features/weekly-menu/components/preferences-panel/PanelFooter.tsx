import { CheckIcon } from '#/components/primitives'
import type { Preferences } from '#/features/weekly-menu/types'
import { useI18n } from '#/shared/i18n'

interface PanelFooterProps {
  draftPrefs: Preferences
  isSaving: boolean
  isRecipeMutationPending: boolean
  onClose: () => void
  onSave: (prefs: Preferences) => void
  saveDisabled: boolean
  saveError: string | null
}

export function PanelFooter({
  draftPrefs,
  isSaving,
  isRecipeMutationPending,
  onClose,
  onSave,
  saveDisabled,
  saveError,
}: PanelFooterProps) {
  const { t } = useI18n()

  return (
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
  )
}
