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
      className="planner-ai-discard-dialog"
      describedBy="ai-recipes-needed-description"
      labelledBy="ai-recipes-needed-title"
      returnFocusTo={returnFocusTo}
      onDismiss={onClose}
    >
      <h2 id="ai-recipes-needed-title">{t('planner.aiRecipesNeededTitle')}</h2>
      <p id="ai-recipes-needed-description">
        {t('planner.aiRecipesNeededBody')}
      </p>
      <footer className="planner-ai-dialog-footer">
        <button className="panel-secondary-btn" type="button" onClick={onClose}>
          {t('common.close')}
        </button>
        <button
          className="panel-primary-btn"
          type="button"
          onClick={onAddRecipes}
        >
          {t('planner.aiAddRecipes')}
        </button>
      </footer>
    </Dialog>
  )
}
