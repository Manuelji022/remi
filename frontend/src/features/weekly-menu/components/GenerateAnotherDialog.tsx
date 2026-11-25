import { Button } from '#/components/primitives'
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
      id="ai-generate-another"
      title={t('planner.aiGenerateAnotherTitle')}
      description={t('planner.aiGenerateAnotherBody')}
      returnFocusTo={returnFocusTo}
      onDismiss={onCancel}
      actions={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button variant="brand" onClick={onConfirm}>
            {t('planner.aiGenerateAnother')}
          </Button>
        </>
      }
    />
  )
}
