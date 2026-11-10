import { useEffect, useRef, useState } from 'react'
import {
  createRecipe,
  deleteRecipe,
  listRecipes,
} from '#/features/recipes/functions'
import type { Recipe, RecipeInput } from '#/features/recipes/recipe'

interface UseRecipeCatalogOptions {
  userId: string | undefined
  legacyPending: boolean
  onRecipeMutation: () => Promise<void>
  onRecipeMutationPendingChange: (pending: boolean) => void
}

export function useRecipeCatalog({
  userId,
  legacyPending,
  onRecipeMutation,
  onRecipeMutationPendingChange,
}: UseRecipeCatalogOptions) {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null)
  const [actionFailed, setActionFailed] = useState(false)
  const [isAddingRecipe, setIsAddingRecipe] = useState(false)
  const addingRecipe = useRef(false)
  const deletingIds = useRef(new Set<string>())

  useEffect(() => {
    if (!userId) {
      setRecipes(null)
      setActionFailed(false)
      return
    }

    let cancelled = false

    void listRecipes()
      .then((rows) => {
        if (cancelled) return
        setRecipes(rows)
        setActionFailed(false)
      })
      .catch(() => {
        if (!cancelled) setActionFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [userId, legacyPending])

  async function addRecipe(input: RecipeInput) {
    if (addingRecipe.current) return

    addingRecipe.current = true
    setIsAddingRecipe(true)
    onRecipeMutationPendingChange(true)

    try {
      let recipe: Recipe
      try {
        recipe = await createRecipe({ data: input })
      } catch (error) {
        setActionFailed(true)
        throw error
      }

      setRecipes((current) => [...(current ?? []), recipe])
      setActionFailed(false)
      try {
        await onRecipeMutation()
      } catch {
        setActionFailed(true)
      }
    } finally {
      addingRecipe.current = false
      setIsAddingRecipe(false)
      onRecipeMutationPendingChange(false)
    }
  }

  async function deleteRecipeFromCatalog(recipeId: string) {
    if (deletingIds.current.has(recipeId)) return

    deletingIds.current.add(recipeId)
    onRecipeMutationPendingChange(true)

    try {
      await deleteRecipe({ data: { id: recipeId } })
      setRecipes(
        (current) =>
          current?.filter((recipe) => recipe.id !== recipeId) ?? null,
      )
      setActionFailed(false)
      try {
        await onRecipeMutation()
      } catch {
        setActionFailed(true)
      }
    } catch {
      setActionFailed(true)
    } finally {
      deletingIds.current.delete(recipeId)
      onRecipeMutationPendingChange(false)
    }
  }

  return {
    recipes,
    actionFailed,
    isAddingRecipe,
    addRecipe,
    deleteRecipe: deleteRecipeFromCatalog,
  }
}
