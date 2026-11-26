import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  recipeInputSchema,
  recipeQuantityDraftSchema,
} from '#/features/recipes/recipe'
import type { MealSlot, RecipeInput } from '#/features/recipes/recipe'
import {
  buildRecipeIngredients,
  getEmptyRecipeIngredient,
} from '../components/recipe-form-utils'
import type { RecipeIngredientDraft } from '../components/recipe-form-utils'

/** The recipe form's draft. It lives outside the form so a wrapper can ask
 *  whether anything typed would be lost. */
export function useRecipeForm(onSave: (recipe: RecipeInput) => Promise<void>) {
  const [name, setName] = useState('')
  const [slot, setSlot] = useState<MealSlot>('dinner')
  const [ingredients, setIngredients] = useState<RecipeIngredientDraft[]>(
    () => [getEmptyRecipeIngredient()],
  )
  const [saved, setSaved] = useState<{ name: string } | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const [ingredientsOpen, setIngredientsOpen] = useState(false)
  const submissionInFlight = useRef(false)
  const hasInvalidQuantity = ingredients.some(
    ({ quantity }) => !recipeQuantityDraftSchema.safeParse(quantity).success,
  )

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submissionInFlight.current || hasInvalidQuantity) return
    const recipe = recipeInputSchema.safeParse({
      name,
      slot,
      ingredients: buildRecipeIngredients(ingredients),
    })
    if (!recipe.success) return

    submissionInFlight.current = true
    setSaveFailed(false)
    try {
      await onSave(recipe.data)
      // The meal stays: people tend to add several dinners in a row.
      setName('')
      setIngredients([getEmptyRecipeIngredient()])
      setIngredientsOpen(false)
      setSaved({ name: recipe.data.name })
    } catch {
      setSaveFailed(true)
    } finally {
      submissionInFlight.current = false
    }
  }

  return {
    name,
    setName,
    slot,
    setSlot,
    ingredients,
    setIngredients,
    ingredientsOpen,
    openIngredients: () => setIngredientsOpen(true),
    /** A new object after each save, even of the same name. */
    saved,
    saveFailed,
    hasInvalidQuantity,
    canSave: name.trim() !== '' && !hasInvalidQuantity,
    isDirty:
      name.trim() !== '' ||
      ingredients.some((ingredient) =>
        Object.values(ingredient).some((value) => value.trim() !== ''),
      ),
    submit,
  }
}
