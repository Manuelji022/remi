import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { PlusIcon } from '#/components/primitives'
import { getLocalizedPath, useI18n } from '#/shared/i18n'
import { authClient } from '#/features/auth/auth-client'
import {
  createRecipe,
  deleteRecipe,
  listRecipes,
} from '#/features/recipes/functions'
import type { Recipe, RecipeInput } from '#/features/recipes/recipe'
import { RecipeCard } from './RecipeCard'
import { RecipeForm } from './RecipeForm'

interface RecipesTabProps {
  legacyPending: boolean
  migrationFailed: boolean
  onRecipeMutation: () => Promise<void>
  onRecipeMutationPendingChange: (pending: boolean) => void
}

export function RecipesTab({
  legacyPending,
  migrationFailed,
  onRecipeMutation,
  onRecipeMutationPendingChange,
}: RecipesTabProps) {
  const { locale, t } = useI18n()
  const { data: session, isPending } = authClient.useSession()
  const sessionPending = isPending
  const [recipes, setRecipes] = useState<Recipe[] | null>(null)
  const [actionFailed, setActionFailed] = useState(false)
  const [isAddingRecipe, setIsAddingRecipe] = useState(false)
  const addingRecipe = useRef(false)
  const deletingIds = useRef(new Set<string>())
  const userId = session?.user.id

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

  async function handleAddRecipe(input: RecipeInput) {
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

  async function handleDeleteRecipe(recipeId: string) {
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

  const showError = actionFailed || migrationFailed

  return (
    <section
      aria-labelledby="preferences-recipes-title"
      className="panel-section"
      id="preferences-recipes-panel"
      role="tabpanel"
    >
      <div className="panel-section-copy">
        <p className="panel-section-kicker">
          <PlusIcon aria-hidden="true" />
          {t('preferences.recipesKicker')}
        </p>
        <h3 id="preferences-recipes-title">{t('preferences.recipesTitle')}</h3>
        <p>{t('preferences.recipesBody')}</p>
        {userId && <p>{t('preferences.recipeChangesImmediate')}</p>}
      </div>

      {sessionPending ? (
        <p>{t('preferences.recipesLoading')}</p>
      ) : !userId ? (
        <div className="panel-empty-recipes">
          <p>{t('preferences.signInToSaveRecipes')}</p>
          <p>
            <Link
              className="panel-text-link"
              to={getLocalizedPath('/login', locale)}
            >
              {t('auth.login')}
            </Link>
          </p>
        </div>
      ) : recipes === null ? (
        showError ? (
          <p className="panel-field-error">{t('preferences.recipesError')}</p>
        ) : (
          <p>{t('preferences.recipesLoading')}</p>
        )
      ) : (
        <>
          {showError && (
            <p className="panel-field-error">{t('preferences.recipesError')}</p>
          )}
          <RecipeForm
            isAddingRecipe={isAddingRecipe}
            onAddRecipe={handleAddRecipe}
          />
          {recipes.length === 0 ? (
            <div className="panel-empty-recipes">
              <p>{t('preferences.emptyRecipes')}</p>
            </div>
          ) : (
            <div className="panel-recipe-list">
              {recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onDelete={() => {
                    void handleDeleteRecipe(recipe.id)
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
