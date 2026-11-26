import { useEffect, useId, useRef } from 'react'
import { Banner, Button, Field, Icon, Input } from '#/components/primitives'
import { useI18n } from '#/shared/i18n'
import { MEAL_SLOTS } from '#/features/recipes/recipe'
import type { useRecipeForm } from '../hooks/useRecipeForm'
import { RecipeIngredientFields } from './RecipeIngredientFields'
import './recipe-form.css'

interface RecipeFormProps {
  /** For a page that opens on the form. A sheet focuses it by itself. */
  autoFocus?: boolean
  form: ReturnType<typeof useRecipeForm>
  isSaving: boolean
}

/** One recipe at a time: Enter saves, then the name field takes the next. */
export function RecipeForm({ autoFocus, form, isSaving }: RecipeFormProps) {
  const { t } = useI18n()
  const slotGroup = useId()
  const nameRef = useRef<HTMLInputElement>(null)
  const { saved } = form

  // An effect: a disabled ancestor has to be enabled again before focus.
  useEffect(() => {
    if (saved) nameRef.current?.focus()
  }, [saved])

  let status = ''
  if (!form.name.trim()) {
    status = saved
      ? t('recipeForm.saved', { name: saved.name })
      : t('recipeForm.nameMissing')
  }

  return (
    <form className="recipe-form" noValidate onSubmit={form.submit}>
      <Field label={t('recipeForm.name')}>
        <Input
          ref={nameRef}
          // react-doctor-disable-next-line react-doctor/no-autofocus -- Typing this name is the only task of the page.
          autoFocus={autoFocus}
          autoComplete="off"
          className="recipe-form-name"
          enterKeyHint="done"
          name="recipeName"
          onChange={(event) => form.setName(event.target.value)}
          placeholder={t('recipeForm.namePlaceholder')}
          readOnly={isSaving}
          type="text"
          value={form.name}
        />
      </Field>

      <fieldset className="recipe-form-group">
        <legend className="recipe-form-label">{t('recipeForm.slot')}</legend>
        <div className="recipe-slots">
          {MEAL_SLOTS.map((slot) => (
            <label className={`recipe-slot recipe-slot-${slot}`} key={slot}>
              <input
                checked={form.slot === slot}
                className="recipe-slot-input"
                name={slotGroup}
                onChange={() => form.setSlot(slot)}
                type="radio"
                value={slot}
              />
              <span className="recipe-slot-icon">
                <Icon name={slot} />
              </span>
              <span className="recipe-slot-text">
                <span className="recipe-slot-name">{t(`slots.${slot}`)}</span>
                <span className="recipe-slot-hint">
                  {t(`recipeForm.${slot}Hint`)}
                </span>
              </span>
              <span aria-hidden="true" className="recipe-slot-check">
                <Icon name="done" size="sm" />
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <RecipeIngredientFields
        hasInvalidQuantity={form.hasInvalidQuantity}
        ingredients={form.ingredients}
        isOpen={form.ingredientsOpen}
        onChange={form.setIngredients}
        onOpen={form.openIngredients}
      />

      {form.saveFailed && (
        <Banner announce tone="error">
          {t('recipeForm.saveError')}
        </Banner>
      )}

      <div className="recipe-form-submit">
        <Button
          className="recipe-form-save"
          data-testid="panel-add-recipe"
          disabled={!form.canSave && !isSaving}
          leadingIcon="add"
          pending={isSaving}
          size="lg"
          type="submit"
          variant="brand"
        >
          {t('recipeForm.save')}
        </Button>
        <p className="recipe-form-enter">
          {t('recipeForm.orPress')} <kbd>Enter ↵</kbd>
        </p>
        <p className="recipe-form-status" role="status">
          {status}
        </p>
      </div>
    </form>
  )
}
