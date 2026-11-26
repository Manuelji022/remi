import { useEffect, useRef } from 'react'
import { Button, Icon, Input, Select } from '#/components/primitives'
import { useI18n } from '#/shared/i18n'
import {
  INGREDIENT_UNITS,
  recipeQuantityDraftSchema,
} from '#/features/recipes/recipe'
import { getEmptyRecipeIngredient } from './recipe-form-utils'
import type { RecipeIngredientDraft } from './recipe-form-utils'

interface RecipeIngredientFieldsProps {
  hasInvalidQuantity: boolean
  ingredients: RecipeIngredientDraft[]
  /** Only the phone layout collapses; wider screens always show the rows. */
  isOpen: boolean
  onChange: (ingredients: RecipeIngredientDraft[]) => void
  onOpen: () => void
}

export function RecipeIngredientFields({
  hasInvalidQuantity,
  ingredients,
  isOpen,
  onChange,
  onOpen,
}: RecipeIngredientFieldsProps) {
  const { t } = useI18n()
  const firstRowRef = useRef<HTMLInputElement>(null)
  const wasOpen = useRef(isOpen)

  // The button that opened the rows is gone, so focus moves into them.
  useEffect(() => {
    if (isOpen && !wasOpen.current) firstRowRef.current?.focus()
    wasOpen.current = isOpen
  }, [isOpen])

  function update(index: number, changes: Partial<RecipeIngredientDraft>) {
    onChange(
      ingredients.map((ingredient, position) =>
        position === index ? { ...ingredient, ...changes } : ingredient,
      ),
    )
  }

  function remove(index: number) {
    onChange(
      ingredients.length === 1
        ? [getEmptyRecipeIngredient()]
        : ingredients.filter((_, position) => position !== index),
    )
  }

  const optional = (
    <span className="recipe-form-optional">{t('recipeForm.optional')}</span>
  )

  return (
    <div className="recipe-ingredients" data-open={isOpen || undefined}>
      <button
        aria-expanded={isOpen}
        className="recipe-ingredients-reveal"
        onClick={onOpen}
        type="button"
      >
        <span className="recipe-ingredients-reveal-icon">
          <Icon name="add" size="sm" />
        </span>
        <span>
          <span className="recipe-form-label">
            {t('recipeForm.addIngredients')} {optional}
          </span>
          <span className="recipe-form-help">
            {t('recipeForm.ingredientsShortHelp')}
          </span>
        </span>
      </button>

      <fieldset className="recipe-form-group recipe-ingredients-body">
        <legend className="recipe-form-label">
          {t('recipeForm.ingredients')} {optional}
        </legend>
        <p className="recipe-form-help">{t('recipeForm.ingredientsHelp')}</p>
        {ingredients.map((ingredient, index) => {
          const row = { number: index + 1 }
          const isFilled = Object.values(ingredient).some(Boolean)

          return (
            // react-doctor-disable-next-line react-doctor/no-array-index-as-key -- Fully controlled rows with no identity of their own.
            <div className="recipe-ingredient-row" key={index}>
              <Input
                ref={index === 0 ? firstRowRef : undefined}
                aria-label={t('recipeForm.ingredientName', row)}
                autoComplete="off"
                className="recipe-ingredient-name"
                onChange={(event) =>
                  update(index, { name: event.target.value })
                }
                placeholder={t('recipeForm.ingredientPlaceholder')}
                type="text"
                value={ingredient.name}
              />
              <Input
                aria-invalid={
                  !recipeQuantityDraftSchema.safeParse(ingredient.quantity)
                    .success
                }
                aria-label={t('recipeForm.ingredientQuantity', row)}
                min="0"
                onChange={(event) =>
                  update(index, { quantity: event.target.value })
                }
                placeholder={t('recipeForm.quantityPlaceholder')}
                step="any"
                type="number"
                value={ingredient.quantity}
              />
              <Select
                aria-label={t('recipeForm.ingredientUnit', row)}
                onChange={(event) =>
                  update(index, {
                    unit: event.target.value as RecipeIngredientDraft['unit'],
                  })
                }
                value={ingredient.unit}
              >
                <option value="">{t('recipeForm.unitPlaceholder')}</option>
                {INGREDIENT_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {t(`units.${unit}`)}
                  </option>
                ))}
              </Select>
              {/* An empty row keeps the slot, so the columns line up. */}
              {isFilled ? (
                <Button
                  aria-label={t('recipeForm.removeIngredient', row)}
                  icon="close"
                  iconOnly
                  onClick={() => remove(index)}
                  variant="ghost"
                />
              ) : (
                <span />
              )}
            </div>
          )
        })}
        {hasInvalidQuantity && (
          <p className="panel-field-error" role="alert">
            {t('recipeForm.invalidQuantity')}
          </p>
        )}
        <Button
          className="recipe-ingredients-add"
          leadingIcon="add"
          onClick={() => onChange([...ingredients, getEmptyRecipeIngredient()])}
          variant="ghost"
        >
          {t('recipeForm.anotherIngredient')}
        </Button>
      </fieldset>
    </div>
  )
}
