import { PlusIcon } from '#/components/icons'
import type { CustomRecipe } from '#/data/types'
import { useI18n } from '#/i18n'
import { RecipeCard } from './RecipeCard'
import { RecipeForm } from './RecipeForm'

interface RecipesTabProps {
  customRecipes: CustomRecipe[]
  onAddRecipe: (recipe: CustomRecipe) => void
  onDeleteRecipe: (recipeIndex: number) => void
}

export function RecipesTab({
  customRecipes,
  onAddRecipe,
  onDeleteRecipe,
}: RecipesTabProps) {
  const { t } = useI18n()

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

      <RecipeForm onAddRecipe={onAddRecipe} />

      {customRecipes.length === 0 ? (
        <div className="panel-empty-recipes">
          <p>{t('preferences.emptyRecipes')}</p>
        </div>
      ) : (
        <div className="panel-recipe-list">
          {customRecipes.map((recipe, recipeIndex) => (
            <RecipeCard
              key={`${recipe.name}-${recipeIndex}`}
              recipe={recipe}
              onDelete={() => onDeleteRecipe(recipeIndex)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
