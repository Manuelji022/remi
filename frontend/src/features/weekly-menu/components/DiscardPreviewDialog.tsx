import { Dialog } from '#/components/primitives/Dialog'
import { useI18n } from '#/shared/i18n'

interface DiscardPreviewDialogProps {
  onKeep: () => void
  onDiscard: () => void
  isSaving: boolean
  isSaveUnconfirmed: boolean
}

export function DiscardPreviewDialog({
  onKeep,
  onDiscard,
  isSaving,
  isSaveUnconfirmed,
}: DiscardPreviewDialogProps) {
  const { t } = useI18n()
  return (
    <Dialog
      labelledBy="ai-preview-discard-title"
      className="planner-ai-discard-dialog"
      onDismiss={onKeep}
    >
      <h2 id="ai-preview-discard-title">{t('planner.aiDiscardTitle')}</h2>
      <p>
        {t(
          isSaving
            ? 'planner.aiDiscardSaving'
            : isSaveUnconfirmed
              ? 'planner.aiDiscardSaveUnconfirmed'
              : 'planner.aiDiscardBody',
        )}
      </p>
      <div className="planner-ai-dialog-footer">
        <button className="btn btn-secondary" type="button" onClick={onKeep}>
          {t('planner.aiKeepPreview')}
        </button>
        <button
          className="btn btn-primary"
          type="button"
          onClick={onDiscard}
          disabled={isSaving}
        >
          {t('planner.aiConfirmDiscardPreview')}
        </button>
      </div>
    </Dialog>
  )
}
