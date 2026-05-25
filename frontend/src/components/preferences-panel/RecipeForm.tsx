import { useId, useState } from 'react'
import { PlusIcon, TrashIcon } from '#/components/icons'
import type { CustomRecipe, MealSlot } from '#/data/types'
import { useI18n } from '#/i18n'
import { INGREDIENT_UNITS, RECIPE_SLOT_OPTIONS } from './types'
import type { RecipeIngredientDraft } from './types'
import {
  buildRecipeIngredients,
  getEmptyRecipeIngredient,
  hasInvalidRecipeIngredientQuantity,
} from './utils'

interface RecipeFormProps {
  onAddRecipe: (recipe: CustomRecipe) => void
}

export function RecipeForm({ onAddRecipe }: RecipeFormProps) {
  const { t } = useI18n()
  const [recipeName, setRecipeName] = useState('')
  const [recipeSlot, setRecipeSlot] = useState<MealSlot>('dinner')
  const [recipeIngredients, setRecipeIngredients] = useState<
    RecipeIngredientDraft[]
  >([getEmptyRecipeIngredient()])
  const recipeNameId = useId()
  const recipeIngredientsId = useId()
  const hasInvalidIngredientQuantity =
    hasInvalidRecipeIngredientQuantity(recipeIngredients)

  function handleAddRecipe() {
    const name = recipeName.trim()

    if (!name || hasInvalidIngredientQuantity) return

    onAddRecipe({
      name,
      slot: recipeSlot,
      ingredients: buildRecipeIngredients(recipeIngredients),
    })

    setRecipeName('')
    setRecipeSlot('dinner')
    setRecipeIngredients([getEmptyRecipeIngredient()])
  }

  function updateRecipeIngredient(
    ingredientIndex: number,
    field: keyof RecipeIngredientDraft,
    value: string,
  ) {
    setRecipeIngredients(
      recipeIngredients.map((ingredient, index) =>
        index === ingredientIndex
          ? { ...ingredient, [field]: value }
          : ingredient,
      ),
    )
  }

  function addRecipeIngredientRow() {
    setRecipeIngredients([...recipeIngredients, getEmptyRecipeIngredient()])
  }

  function deleteRecipeIngredientRow(ingredientIndex: number) {
    if (recipeIngredients.length === 1) {
      setRecipeIngredients([getEmptyRecipeIngredient()])
      return
    }

    setRecipeIngredients(
      recipeIngredients.filter((_, index) => index !== ingredientIndex),
    )
  }

  return (
    <div className="panel-recipe-form">
      <label className="panel-field">
        <span>{t('preferences.recipeName')}</span>
        <input
          id={recipeNameId}
          name="recipeName"
          onChange={(event) => setRecipeName(event.target.value)}
          placeholder={t('preferences.recipeNamePlaceholder')}
          type="text"
          value={recipeName}
        />
      </label>

      <div className="panel-field">
        <span>{t('preferences.recipeSlot')}</span>
        <div
          className="panel-pill-row"
          aria-label={t('preferences.recipeSlotHelp')}
          role="group"
        >
          {RECIPE_SLOT_OPTIONS.map((slot) => (
            <button
              className={`panel-scope-pill ${recipeSlot === slot ? 'selected' : ''}`}
              key={slot}
              type="button"
              onClick={() => setRecipeSlot(slot)}
            >
              {t(`slots.${slot}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-field">
        <span>{t('preferences.recipeIngredients')}</span>
        <div className="panel-ingredient-rows">
          {recipeIngredients.map((ingredient, ingredientIndex) => {
            const ingredientNameId = `${recipeIngredientsId}-name-${ingredientIndex}`
            const ingredientQuantityId = `${recipeIngredientsId}-quantity-${ingredientIndex}`
            const ingredientUnitId = `${recipeIngredientsId}-unit-${ingredientIndex}`
            const quantity = ingredient.quantity.trim()
            const hasInvalidQuantity =
              quantity !== '' &&
              (!Number.isFinite(Number(quantity)) || Number(quantity) < 0)

            return (
              <div className="panel-ingredient-row" key={ingredientIndex}>
                <label className="panel-ingredient-name-field">
                  <span>{t('preferences.ingredientName')}</span>
                  <input
                    id={ingredientNameId}
                    name={ingredientNameId}
                    onChange={(event) =>
                      updateRecipeIngredient(
                        ingredientIndex,
                        'name',
                        event.target.value,
                      )
                    }
                    placeholder={t('preferences.ingredientNamePlaceholder')}
                    type="text"
                    value={ingredient.name}
                  />
                </label>

                <label className="panel-ingredient-quantity-field">
                  <span>{t('preferences.ingredientQuantity')}</span>
                  <input
                    aria-invalid={hasInvalidQuantity}
                    id={ingredientQuantityId}
                    min="0"
                    name={ingredientQuantityId}
                    onChange={(event) =>
                      updateRecipeIngredient(
                        ingredientIndex,
                        'quantity',
                        event.target.value,
                      )
                    }
                    placeholder="1"
                    type="number"
                    value={ingredient.quantity}
                  />
                </label>

                <label className="panel-ingredient-unit-field">
                  <span>{t('preferences.ingredientUnit')}</span>
                  <select
                    id={ingredientUnitId}
                    name={ingredientUnitId}
                    onChange={(event) =>
                      updateRecipeIngredient(
                        ingredientIndex,
                        'unit',
                        event.target.value,
                      )
                    }
                    value={ingredient.unit}
                  >
                    <option value="">
                      {t('preferences.ingredientNoUnit')}
                    </option>
                    {INGREDIENT_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {t(`units.${unit}`)}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  className="panel-icon-btn panel-ingredient-delete-btn"
                  type="button"
                  aria-label={t('preferences.deleteIngredient')}
                  onClick={() => deleteRecipeIngredientRow(ingredientIndex)}
                >
                  <TrashIcon aria-hidden="true" />
                </button>
              </div>
            )
          })}
        </div>
        {hasInvalidIngredientQuantity && (
          <p className="panel-field-error">
            {t('preferences.invalidIngredientQuantity')}
          </p>
        )}
        <button
          className="panel-add-ingredient-btn"
          type="button"
          onClick={addRecipeIngredientRow}
        >
          <PlusIcon aria-hidden="true" />
          {t('preferences.addIngredient')}
        </button>
      </div>

      <button
        className="panel-add-btn"
        type="button"
        disabled={!recipeName.trim() || hasInvalidIngredientQuantity}
        onClick={handleAddRecipe}
      >
        <PlusIcon aria-hidden="true" />
        {t('preferences.addRecipe')}
      </button>
    </div>
  )
}
