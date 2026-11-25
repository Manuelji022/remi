import { useId, useRef, useState } from 'react'
import {
  Button,
  Field,
  Input,
  SegmentedControl,
  Select,
} from '#/components/primitives'
import { useI18n } from '#/shared/i18n'
import {
  INGREDIENT_UNITS,
  MEAL_SLOTS,
  recipeInputSchema,
  recipeQuantityDraftSchema,
} from '#/features/recipes/recipe'
import type { MealSlot, RecipeInput } from '#/features/recipes/recipe'
import {
  buildRecipeIngredients,
  getEmptyRecipeIngredient,
  hasInvalidRecipeIngredientQuantity,
} from './recipe-form-utils'
import type { RecipeIngredientDraft } from './recipe-form-utils'

interface RecipeFormProps {
  isAddingRecipe: boolean
  onAddRecipe: (recipe: RecipeInput) => Promise<void>
}

export function RecipeForm({ isAddingRecipe, onAddRecipe }: RecipeFormProps) {
  const { t } = useI18n()
  const [recipeName, setRecipeName] = useState('')
  const [recipeSlot, setRecipeSlot] = useState<MealSlot>('dinner')
  const [recipeIngredients, setRecipeIngredients] = useState<
    RecipeIngredientDraft[]
  >([getEmptyRecipeIngredient()])
  const submissionInFlight = useRef(false)
  const recipeNameId = useId()
  const recipeIngredientsId = useId()
  const hasInvalidIngredientQuantity =
    hasInvalidRecipeIngredientQuantity(recipeIngredients)

  async function handleAddRecipe() {
    const name = recipeName.trim()

    if (submissionInFlight.current || hasInvalidIngredientQuantity) return
    const recipe = recipeInputSchema.safeParse({
      name,
      slot: recipeSlot,
      ingredients: buildRecipeIngredients(recipeIngredients),
    })
    if (!recipe.success) return

    submissionInFlight.current = true
    try {
      await onAddRecipe(recipe.data)
      setRecipeName('')
      setRecipeSlot('dinner')
      setRecipeIngredients([getEmptyRecipeIngredient()])
    } catch {
      return
    } finally {
      submissionInFlight.current = false
    }
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
      <Field label={t('preferences.recipeName')}>
        <Input
          id={recipeNameId}
          name="recipeName"
          onChange={(event) => setRecipeName(event.target.value)}
          placeholder={t('preferences.recipeNamePlaceholder')}
          type="text"
          value={recipeName}
        />
      </Field>

      <div className="panel-field">
        <span>{t('preferences.recipeSlot')}</span>
        <SegmentedControl
          label={t('preferences.recipeSlotHelp')}
          options={MEAL_SLOTS.map((slot) => ({
            value: slot,
            label: t(`slots.${slot}`),
          }))}
          value={recipeSlot}
          onChange={setRecipeSlot}
        />
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
              !recipeQuantityDraftSchema.safeParse(quantity).success

            return (
              <div className="panel-ingredient-row" key={ingredientIndex}>
                <Field
                  className="panel-ingredient-name-field"
                  label={t('preferences.ingredientName')}
                >
                  <Input
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
                </Field>

                <Field
                  className="panel-ingredient-quantity-field"
                  label={t('preferences.ingredientQuantity')}
                >
                  <Input
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
                </Field>

                <Field
                  className="panel-ingredient-unit-field"
                  label={t('preferences.ingredientUnit')}
                >
                  <Select
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
                  </Select>
                </Field>

                <Button
                  iconOnly
                  icon="remove"
                  variant="ghost"
                  className="panel-ingredient-delete-btn"
                  aria-label={t('preferences.deleteIngredient')}
                  onClick={() => deleteRecipeIngredientRow(ingredientIndex)}
                />
              </div>
            )
          })}
        </div>
        {hasInvalidIngredientQuantity && (
          <p className="panel-field-error">
            {t('preferences.invalidIngredientQuantity')}
          </p>
        )}
        <Button
          size="sm"
          variant="ghost"
          leadingIcon="add"
          className="panel-add-ingredient-btn"
          onClick={addRecipeIngredientRow}
        >
          {t('preferences.addIngredient')}
        </Button>
      </div>

      <Button
        block
        variant="secondary"
        leadingIcon="add"
        data-testid="panel-add-recipe"
        disabled={
          isAddingRecipe || !recipeName.trim() || hasInvalidIngredientQuantity
        }
        onClick={handleAddRecipe}
      >
        {t(
          isAddingRecipe ? 'preferences.addingRecipe' : 'preferences.addRecipe',
        )}
      </Button>
      {!recipeName.trim() ? (
        <p className="panel-add-hint">{t('preferences.addRecipeHint')}</p>
      ) : null}
    </div>
  )
}
