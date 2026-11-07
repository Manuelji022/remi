import { Dialog } from '#/components/primitives/Dialog'
import { useI18n } from '#/shared/i18n'

interface GenerateAnotherDialogProps {
  returnFocusTo: HTMLElement | null
  onCancel: () => void
  onConfirm: () => void
}

export function GenerateAnotherDialog({
  returnFocusTo,
  onCancel,
  onConfirm,
}: GenerateAnotherDialogProps) {
  const { t } = useI18n()
  return (
    <Dialog
      labelledBy="ai-generate-another-title"
      describedBy="ai-generate-another-description"
      className="planner-ai-discard-dialog"
      returnFocusTo={returnFocusTo}
      onDismiss={onCancel}
    >
      <h2 id="ai-generate-another-title">
        {t('planner.aiGenerateAnotherTitle')}
      </h2>
      <p id="ai-generate-another-description">
        {t('planner.aiGenerateAnotherBody')}
      </p>
      <div className="planner-ai-dialog-footer">
        <button className="btn btn-secondary" type="button" onClick={onCancel}>
          {t('common.cancel')}
        </button>
        <button className="btn btn-primary" type="button" onClick={onConfirm}>
          {t('planner.aiGenerateAnother')}
        </button>
      </div>
    </Dialog>
  )
}
