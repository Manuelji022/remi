import { ConfirmDialog } from '#/components/primitives'
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
    <ConfirmDialog
      id="ai-preview-discard"
      isOpen={true}
      title={t('planner.aiDiscardTitle')}
      body={t(
        isSaving
          ? 'planner.aiDiscardSaving'
          : isSaveUnconfirmed
            ? 'planner.aiDiscardSaveUnconfirmed'
            : 'planner.aiDiscardBody',
      )}
      cancelLabel={t('planner.aiKeepPreview')}
      confirmLabel={t('planner.aiConfirmDiscardPreview')}
      confirmDisabled={isSaving}
      onCancel={onKeep}
      onConfirm={onDiscard}
    />
  )
}
