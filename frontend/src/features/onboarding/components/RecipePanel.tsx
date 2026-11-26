import { useId, useState } from 'react'
import { Button, Icon, Sheet } from '#/components/primitives'
import type { Recipe } from '#/features/recipes/recipe'
import { useI18n } from '#/shared/i18n'
import { countLabel, countRecipes } from '../recipe-summary'
import './recipe-panel.css'

/** Enough for a varied week. The tip stays until this and both meals. */
const VARIED_WEEK_RECIPES = 5

interface RecipePanelProps {
  justAddedId: string | undefined
  onContinue: () => void
  onEdit: (recipe: Recipe) => void
  recipes: Recipe[]
}

/** What is saved so far: a column on desktop, a bottom bar below it. */
export function RecipePanel({
  justAddedId,
  onContinue,
  onEdit,
  recipes,
}: RecipePanelProps) {
  const { t } = useI18n()
  const titleId = useId()
  const [isListOpen, setIsListOpen] = useState(false)
  const { total, lunches, dinners } = countRecipes(recipes)
  const summary = (
    <p className="recipe-panel-summary">
      <strong>{countLabel(t, 'recipe', total)}</strong>
      {` · ${countLabel(t, 'lunch', lunches)} · ${countLabel(t, 'dinner', dinners)}`}
    </p>
  )
  const needsTip = total < VARIED_WEEK_RECIPES || !lunches || !dinners
  const [tipLead, tipRest] = [t('onboarding.tipLead'), t('onboarding.tipRest')]
  const list = (
    <>
      <RecipeRows justAddedId={justAddedId} onEdit={onEdit} recipes={recipes} />
      {needsTip && (
        <p className="recipe-panel-tip">
          <Icon name="tip" />
          <span>
            <strong>{tipLead}</strong> {tipRest}
          </span>
        </p>
      )}
    </>
  )

  return (
    <aside aria-labelledby={titleId} className="recipe-panel">
      <div className="recipe-panel-head">
        <h2 id={titleId}>{t('onboarding.listTitle')}</h2>
        {summary}
      </div>
      {total > 0 && (
        <div className="recipe-panel-peek">
          <span aria-hidden="true" className="recipe-panel-dots">
            <span />
            <span />
          </span>
          {summary}
          <Button
            onClick={() => setIsListOpen(true)}
            size="sm"
            trailingIcon="previous"
            variant="ghost"
          >
            {t('onboarding.viewList')}
          </Button>
        </div>
      )}
      <div className="recipe-panel-list">{list}</div>
      <Button
        block
        disabled={total === 0}
        onClick={onContinue}
        size="lg"
        trailingIcon="forward"
        variant="brand"
      >
        {t('onboarding.continue')}
      </Button>
      {isListOpen && (
        <Sheet
          title={t('onboarding.listTitle')}
          onDismiss={() => setIsListOpen(false)}
          actions={
            <Button onClick={() => setIsListOpen(false)} variant="ghost">
              {t('common.close')}
            </Button>
          }
        >
          <div className="recipe-panel-sheet">{list}</div>
        </Sheet>
      )}
    </aside>
  )
}

function RecipeRows({
  justAddedId,
  onEdit,
  recipes,
}: Pick<RecipePanelProps, 'justAddedId' | 'onEdit' | 'recipes'>) {
  const { t } = useI18n()

  return (
    <ul className="recipe-rows">
      {[...recipes].reverse().map((recipe) => {
        const isNew = recipe.id === justAddedId
        const count = recipe.ingredients.length
        const detail = count
          ? countLabel(t, 'ingredient', count)
          : t('onboarding.noIngredients')

        return (
          <li
            className="recipe-row"
            data-new={isNew || undefined}
            key={recipe.id}
          >
            <span className={`recipe-row-slot recipe-row-slot-${recipe.slot}`}>
              {t(`slots.${recipe.slot}`)}
            </span>
            <span className="recipe-row-copy">
              <span className="recipe-row-name">{recipe.name}</span>
              <span className="recipe-row-detail">
                {isNew ? `${t('onboarding.justAdded')} · ${detail}` : detail}
              </span>
            </span>
            <Button
              aria-label={t('onboarding.editRecipe', { name: recipe.name })}
              icon="edit"
              iconOnly
              onClick={() => onEdit(recipe)}
              variant="ghost"
            />
          </li>
        )
      })}
      <li className="recipe-row-placeholder">{t('onboarding.nextRecipe')}</li>
    </ul>
  )
}
