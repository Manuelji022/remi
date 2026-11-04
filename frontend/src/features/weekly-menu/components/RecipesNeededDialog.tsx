import { ConfirmDialog } from '#/components/primitives'
import { useI18n } from '#/shared/i18n'

interface RecipesNeededDialogProps {
  returnFocusTo: HTMLElement | null
  onAddRecipes: () => void
  onClose: () => void
}

export function RecipesNeededDialog({
  returnFocusTo,
  onAddRecipes,
  onClose,
}: RecipesNeededDialogProps) {
  const { t } = useI18n()
  return (
    <ConfirmDialog
      id="ai-recipes-needed"
      isOpen={true}
      title={t('planner.aiRecipesNeededTitle')}
      body={t('planner.aiRecipesNeededBody')}
      cancelLabel={t('common.close')}
      confirmLabel={t('planner.aiAddRecipes')}
      returnFocusTo={returnFocusTo}
      onCancel={onClose}
      onConfirm={onAddRecipes}
    />
  )
}
