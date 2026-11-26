import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  recipeInputSchema,
  recipeQuantityDraftSchema,
} from '#/features/recipes/recipe'
import type { MealSlot, Recipe, RecipeInput } from '#/features/recipes/recipe'
import {
  buildRecipeIngredients,
  getEmptyRecipeIngredient,
  toRecipeIngredientDrafts,
} from '../components/recipe-form-utils'
import type { RecipeIngredientDraft } from '../components/recipe-form-utils'

const DEFAULT_SLOT: MealSlot = 'dinner'

/** The recipe form's draft: a new recipe, or the one in `recipe`. It lives
 *  outside the form so a wrapper can ask whether anything would be lost. */
export function useRecipeForm(
  onSave: (recipe: RecipeInput) => Promise<void>,
  recipe?: Recipe,
) {
  const [initial] = useState(() => ({
    name: recipe?.name ?? '',
    slot: recipe?.slot ?? DEFAULT_SLOT,
    ingredients: toRecipeIngredientDrafts(recipe?.ingredients ?? []),
  }))
  const [name, setName] = useState(initial.name)
  const [slot, setSlot] = useState(initial.slot)
  const [ingredients, setIngredients] = useState(initial.ingredients)
  const [saved, setSaved] = useState<{ name: string } | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const [ingredientsOpen, setIngredientsOpen] = useState(
    Boolean(recipe?.ingredients.length),
  )
  const submissionInFlight = useRef(false)
  const hasInvalidQuantity = ingredients.some(
    ({ quantity }) => !recipeQuantityDraftSchema.safeParse(quantity).success,
  )

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submissionInFlight.current || hasInvalidQuantity) return
    const input = recipeInputSchema.safeParse({
      name,
      slot,
      ingredients: buildRecipeIngredients(ingredients),
    })
    if (!input.success) return

    submissionInFlight.current = true
    setSaveFailed(false)
    try {
      await onSave(input.data)
      // The meal stays: people tend to add several dinners in a row.
      setName('')
      setIngredients([getEmptyRecipeIngredient()])
      setIngredientsOpen(false)
      setSaved({ name: input.data.name })
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
    isEditing: recipe !== undefined,
    // On a new recipe the meal alone is not worth asking about.
    isDirty:
      draftKey({ name, slot: recipe ? slot : initial.slot, ingredients }) !==
      draftKey(initial),
    submit,
  }
}

function draftKey(draft: {
  name: string
  slot: MealSlot
  ingredients: RecipeIngredientDraft[]
}) {
  const rows = draft.ingredients.filter((row) =>
    Object.values(row).some(Boolean),
  )
  return JSON.stringify([draft.name.trim(), draft.slot, rows])
}
