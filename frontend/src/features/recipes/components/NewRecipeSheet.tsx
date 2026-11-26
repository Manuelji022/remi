import { useState } from 'react'
import { Button, Dialog, Sheet } from '#/components/primitives'
import { useI18n } from '#/shared/i18n'
import type { RecipeInput } from '#/features/recipes/recipe'
import { useRecipeForm } from '../hooks/useRecipeForm'
import { RecipeForm } from './RecipeForm'

interface NewRecipeSheetProps {
  isSaving: boolean
  onSave: (recipe: RecipeInput) => Promise<void>
  onClose: () => void
}

/** The recipe form in a sheet. It stays open after a save for the next one. */
export function NewRecipeSheet({
  isSaving,
  onSave,
  onClose,
}: NewRecipeSheetProps) {
  const { t } = useI18n()
  const form = useRecipeForm(onSave)
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)

  // Unsaved input is never dropped by a stray tap on the scrim.
  function requestClose() {
    if (form.isDirty) setConfirmingDiscard(true)
    else onClose()
  }

  return (
    <>
      <Sheet
        title={t('preferences.newRecipe')}
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
