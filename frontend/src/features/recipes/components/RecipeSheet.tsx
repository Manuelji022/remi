import { useState } from 'react'
import { Button, Dialog, Sheet } from '#/components/primitives'
import { useI18n } from '#/shared/i18n'
import type { Recipe, RecipeInput } from '#/features/recipes/recipe'
import { useRecipeForm } from '../hooks/useRecipeForm'
import { RecipeForm } from './RecipeForm'

interface RecipeSheetProps {
  isSaving: boolean
  /** The recipe to edit. Leave it out to add new ones. */
  recipe?: Recipe
  onSave: (recipe: RecipeInput) => Promise<void>
  onClose: () => void
}

/** The recipe form in a sheet. After adding it stays open for the next one;
 *  after editing it closes. */
export function RecipeSheet({
  isSaving,
  recipe,
  onSave,
  onClose,
}: RecipeSheetProps) {
  const { t } = useI18n()
  const form = useRecipeForm(async (input) => {
    await onSave(input)
    if (recipe) onClose()
  }, recipe)
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)

  // Unsaved input is never dropped by a stray tap on the scrim.
  function requestClose() {
    if (form.isDirty) setConfirmingDiscard(true)
    else onClose()
  }

  return (
    <>
      <Sheet
        title={t(recipe ? 'recipeForm.editTitle' : 'preferences.newRecipe')}
        dismissDisabled={isSaving}
        onDismiss={requestClose}
        actions={
          <Button disabled={isSaving} onClick={requestClose} variant="ghost">
            {t(form.isDirty ? 'common.cancel' : 'common.close')}
          </Button>
        }
      >
        <RecipeForm form={form} isSaving={isSaving} />
      </Sheet>
      {confirmingDiscard && (
        <Dialog
          title={t('preferences.discardRecipeTitle')}
          description={t('preferences.discardRecipeBody')}
          onDismiss={() => setConfirmingDiscard(false)}
          actions={
            <>
              <Button onClick={() => setConfirmingDiscard(false)}>
                {t('preferences.keepEditingRecipe')}
              </Button>
              <Button variant="danger" onClick={onClose}>
                {t('preferences.discardRecipe')}
              </Button>
            </>
          }
        />
      )}
    </>
  )
}
