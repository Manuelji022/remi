import { RecipeForm } from '#/features/recipes/components/RecipeForm'
import { useRecipeForm } from '#/features/recipes/hooks/useRecipeForm'
import type { Recipe, RecipeInput } from '#/features/recipes/recipe'
import { useI18n } from '#/shared/i18n'
import { RecipePanel } from './RecipePanel'

interface AddRecipesStepProps {
  isSaving: boolean
  onAddRecipe: (recipe: RecipeInput) => Promise<void>
  onContinue: () => void
  /** Oldest first, as the server lists them. */
  recipes: Recipe[]
}

export function AddRecipesStep({
  isSaving,
  onAddRecipe,
  onContinue,
  recipes,
}: AddRecipesStepProps) {
  const { t } = useI18n()
  const form = useRecipeForm(onAddRecipe)
  const newest = recipes.at(-1)

  return (
    <div className="onboarding-card">
      <div className="add-recipes-main">
        <div className="onboarding-title">
          <h1>{t('onboarding.recipesTitle')}</h1>
          <p>
            <span className="onboarding-wide">
              {t('onboarding.recipesCopy')}
            </span>
            <span className="onboarding-narrow">
              {t('onboarding.recipesCopyShort')}
            </span>
          </p>
        </div>
        <RecipeForm autoFocus form={form} isSaving={isSaving} />
      </div>
      <RecipePanel
        justAddedId={newest?.name === form.saved?.name ? newest?.id : undefined}
        onContinue={onContinue}
        recipes={recipes}
      />
    </div>
  )
}
