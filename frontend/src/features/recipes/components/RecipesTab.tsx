import { PlusIcon } from '#/components/primitives'
import { LocalizedLink, useI18n } from '#/shared/i18n'
import { authClient } from '#/features/auth/auth-client'
import { useRecipeCatalog } from '#/features/recipes/hooks/useRecipeCatalog'
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
  const { t } = useI18n()
  const { data: session, isPending } = authClient.useSession()
  const sessionPending = isPending
  const userId = session?.user.id
  const { recipes, actionFailed, isAddingRecipe, addRecipe, deleteRecipe } =
    useRecipeCatalog({
      userId,
      legacyPending,
      onRecipeMutation,
      onRecipeMutationPendingChange,
    })

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
      <RecipeCatalogContent
        error={actionFailed || migrationFailed}
        isAddingRecipe={isAddingRecipe}
        onAddRecipe={addRecipe}
        onDeleteRecipe={deleteRecipe}
        recipes={recipes}
        sessionPending={sessionPending}
        userId={userId}
      />
    </section>
  )
}

interface RecipeCatalogContentProps {
  error: boolean
  isAddingRecipe: boolean
  onAddRecipe: (input: RecipeInput) => Promise<void>
  onDeleteRecipe: (recipeId: string) => Promise<void>
  recipes: Recipe[] | null
  sessionPending: boolean
  userId: string | undefined
}

function RecipeCatalogContent({
  error,
  isAddingRecipe,
  onAddRecipe,
  onDeleteRecipe,
  recipes,
  sessionPending,
  userId,
}: RecipeCatalogContentProps) {
  const { t } = useI18n()

  if (sessionPending) return <p>{t('preferences.recipesLoading')}</p>

  if (!userId) {
    return (
      <div className="panel-empty-recipes">
        <p>{t('preferences.signInToSaveRecipes')}</p>
        <p>
          <LocalizedLink className="text-link" to="/login">
            {t('auth.login')}
          </LocalizedLink>
        </p>
      </div>
    )
  }

  if (recipes === null) {
    return error ? (
      <p className="panel-field-error">{t('preferences.recipesError')}</p>
    ) : (
      <p>{t('preferences.recipesLoading')}</p>
    )
  }

  return (
    <RecipeCatalogList
      error={error}
      isAddingRecipe={isAddingRecipe}
      onAddRecipe={onAddRecipe}
      onDeleteRecipe={onDeleteRecipe}
      recipes={recipes}
    />
  )
}

interface RecipeCatalogListProps {
  error: boolean
  isAddingRecipe: boolean
  onAddRecipe: (input: RecipeInput) => Promise<void>
  onDeleteRecipe: (recipeId: string) => Promise<void>
  recipes: Recipe[]
}

function RecipeCatalogList({
  error,
  isAddingRecipe,
  onAddRecipe,
  onDeleteRecipe,
  recipes,
}: RecipeCatalogListProps) {
  const { t } = useI18n()

  return (
    <>
      {error && (
        <p className="panel-field-error">{t('preferences.recipesError')}</p>
      )}
      <RecipeForm isAddingRecipe={isAddingRecipe} onAddRecipe={onAddRecipe} />
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
                void onDeleteRecipe(recipe.id)
              }}
            />
          ))}
        </div>
      )}
    </>
  )
}
