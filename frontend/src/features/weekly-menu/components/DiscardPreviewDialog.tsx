import { Button, Dialog } from '#/components/primitives'
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
      id="ai-preview-discard"
      title={t('planner.aiDiscardTitle')}
      description={t(
        isSaving
          ? 'planner.aiDiscardSaving'
          : isSaveUnconfirmed
            ? 'planner.aiDiscardSaveUnconfirmed'
            : 'planner.aiDiscardBody',
      )}
      onDismiss={onKeep}
      actions={
        <>
          <Button variant="secondary" onClick={onKeep}>
            {t('planner.aiKeepPreview')}
          </Button>
          <Button variant="brand" onClick={onDiscard} disabled={isSaving}>
            {t('planner.aiConfirmDiscardPreview')}
          </Button>
        </>
      }
    />
  )
}
