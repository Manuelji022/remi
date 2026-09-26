import { TrashIcon } from '#/components/icons'
import { useI18n } from '#/i18n'
import type { Recipe } from '#/recipes/recipe'
import { formatRecipeIngredient } from './utils'

interface RecipeCardProps {
  recipe: Recipe
  onDelete: () => void
}

export function RecipeCard({ recipe, onDelete }: RecipeCardProps) {
  const { t } = useI18n()
  const { ingredients } = recipe

  return (
    <article className="panel-recipe-card">
      <div className="panel-recipe-copy">
        <h4>{recipe.name}</h4>
        <p className="panel-recipe-slot">{t(`slots.${recipe.slot}`)}</p>
        {ingredients.length > 0 ? (
          <ul className="panel-ingredient-list">
            {ingredients.map((ingredient) => (
              <li className="panel-ingredient-chip" key={ingredient.id}>
                {formatRecipeIngredient(ingredient, (unit) =>
                  t(`units.${unit}`),
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>{t('preferences.noRecipeIngredients')}</p>
        )}
      </div>

      <button
        className="panel-icon-btn"
        type="button"
        aria-label={t('preferences.deleteRecipe', { name: recipe.name })}
        onClick={onDelete}
      >
        <TrashIcon aria-hidden="true" />
      </button>
    </article>
  )
}
