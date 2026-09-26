import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { PlusIcon } from '#/components/icons'
import { getLocalizedPath, useI18n } from '#/i18n'
import { authClient } from '#/lib/auth-client'
import { createRecipe, deleteRecipe, listRecipes } from '#/recipes/functions'
import type { Recipe, RecipeInput } from '#/recipes/recipe'
import { RecipeCard } from './RecipeCard'
import { RecipeForm } from './RecipeForm'

interface RecipesTabProps {
  legacyPending: boolean
  migrationFailed: boolean
}

export function RecipesTab({
  legacyPending,
  migrationFailed,
}: RecipesTabProps) {
  const { locale, t } = useI18n()
  const { data: session, isPending } = authClient.useSession()
  const [recipes, setRecipes] = useState<Recipe[] | null>(null)
  const [actionFailed, setActionFailed] = useState(false)
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
    try {
      const recipe = await createRecipe({ data: input })
      setRecipes((current) => [...(current ?? []), recipe])
      setActionFailed(false)
    } catch (error) {
      setActionFailed(true)
      throw error
    }
  }

  async function handleDeleteRecipe(recipeId: string) {
    if (deletingIds.current.has(recipeId)) return

    deletingIds.current.add(recipeId)

    try {
      await deleteRecipe({ data: { id: recipeId } })
      setRecipes(
        (current) =>
          current?.filter((recipe) => recipe.id !== recipeId) ?? null,
      )
      setActionFailed(false)
    } catch {
      setActionFailed(true)
    } finally {
      deletingIds.current.delete(recipeId)
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
      </div>

      {isPending ? (
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
          <RecipeForm onAddRecipe={handleAddRecipe} />
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
