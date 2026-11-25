import { Button } from '#/components/primitives'
import { Dialog } from '#/components/primitives/Dialog'
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
    <Dialog
      id="ai-recipes-needed"
      title={t('planner.aiRecipesNeededTitle')}
      description={t('planner.aiRecipesNeededBody')}
      returnFocusTo={returnFocusTo}
      onDismiss={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
          <Button variant="brand" onClick={onAddRecipes}>
            {t('planner.aiAddRecipes')}
          </Button>
        </>
      }
    />
  )
}
