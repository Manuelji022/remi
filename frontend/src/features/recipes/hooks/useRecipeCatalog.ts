import { useEffect, useRef, useState } from 'react'
import {
  createRecipe,
  deleteRecipe,
  listRecipes,
  updateRecipe,
} from '#/features/recipes/functions'
import type { Recipe, RecipeInput } from '#/features/recipes/recipe'

interface UseRecipeCatalogOptions {
  userId: string | undefined
  legacyPending?: boolean
  /** Refreshes whatever else shows recipes, such as the planner week. */
  onRecipeMutation?: () => Promise<void>
  onRecipeMutationPendingChange?: (pending: boolean) => void
}

export function useRecipeCatalog({
  userId,
  legacyPending = false,
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

  function addRecipe(input: RecipeInput) {
    return write(
      () => createRecipe({ data: input }),
      (current, saved) => [...current, saved],
    )
  }

  function editRecipe(id: string, input: RecipeInput) {
    return write(
      () => updateRecipe({ data: { ...input, id } }),
      (current, saved) =>
        current.map((item) => (item.id === id ? saved : item)),
    )
  }

  /** One create or update at a time. Rejects when it was not saved. */
  async function write(
    request: () => Promise<Recipe>,
    merge: (current: Recipe[], saved: Recipe) => Recipe[],
  ) {
    if (addingRecipe.current) return

    addingRecipe.current = true
    setIsAddingRecipe(true)
    onRecipeMutationPendingChange?.(true)

    try {
      let recipe: Recipe
      try {
        recipe = await request()
      } catch (error) {
        setActionFailed(true)
        throw error
      }

      setRecipes((current) => merge(current ?? [], recipe))
      setActionFailed(false)
      try {
        await onRecipeMutation?.()
      } catch {
        setActionFailed(true)
      }
    } finally {
      addingRecipe.current = false
      setIsAddingRecipe(false)
      onRecipeMutationPendingChange?.(false)
    }
  }

  async function deleteRecipeFromCatalog(recipeId: string) {
    if (deletingIds.current.has(recipeId)) return

    deletingIds.current.add(recipeId)
    onRecipeMutationPendingChange?.(true)

    try {
      await deleteRecipe({ data: { id: recipeId } })
      setRecipes(
        (current) =>
          current?.filter((recipe) => recipe.id !== recipeId) ?? null,
      )
      setActionFailed(false)
      try {
        await onRecipeMutation?.()
      } catch {
        setActionFailed(true)
      }
    } catch {
      setActionFailed(true)
    } finally {
      deletingIds.current.delete(recipeId)
      onRecipeMutationPendingChange?.(false)
    }
  }

  return {
    recipes,
    actionFailed,
    isAddingRecipe,
    addRecipe,
    editRecipe,
    deleteRecipe: deleteRecipeFromCatalog,
  }
}
