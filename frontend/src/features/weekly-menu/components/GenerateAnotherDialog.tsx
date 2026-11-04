import { ConfirmDialog } from '#/components/primitives'
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
    <ConfirmDialog
      id="ai-generate-another"
      isOpen={true}
      title={t('planner.aiGenerateAnotherTitle')}
      body={t('planner.aiGenerateAnotherBody')}
      cancelLabel={t('common.cancel')}
      confirmLabel={t('planner.aiGenerateAnother')}
      returnFocusTo={returnFocusTo}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
