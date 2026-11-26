import { Button } from '#/components/primitives'
import type { Recipe } from '#/features/recipes/recipe'
import { useI18n } from '#/shared/i18n'
import { countLabel, countRecipes } from '../recipe-summary'
import { IntroLayout } from './IntroLayout'
import { OnboardingNotes } from './OnboardingNotes'

/** More names than this would push the buttons off the first screen. */
const SHOWN_RECIPES = 8

interface DoneStepProps {
  name: string
  onAddMore: () => void
  onGenerate: () => void
  recipes: Recipe[]
}

export function DoneStep({
  name,
  onAddMore,
  onGenerate,
  recipes,
}: DoneStepProps) {
  const { t } = useI18n()
  const { total, lunches, dinners } = countRecipes(recipes)
  const hidden = recipes.length - SHOWN_RECIPES
  // Never promise a full week while a whole meal has no recipe.
  let verdict = t('onboarding.doneEnough')
  if (!lunches) verdict = t('onboarding.doneNeedsLunch')
  if (!dinners) verdict = t('onboarding.doneNeedsDinner')

  return (
    <IntroLayout
      copy={
        <>
          {t('onboarding.doneYouHave')}{' '}
          <strong>
            {t('onboarding.doneCounts', {
              recipes: countLabel(t, 'recipe', total),
              lunches: countLabel(t, 'lunch', lunches),
              dinners: countLabel(t, 'dinner', dinners),
            })}
          </strong>
          . {verdict}
        </>
      }
      eyebrow={t('onboarding.doneGreeting', { name })}
      notes={<OnboardingNotes saved={recipes} />}
      title={t('onboarding.doneTitle')}
    >
      <ul aria-label={t('onboarding.listTitle')} className="intro-chips">
        {recipes.slice(0, SHOWN_RECIPES).map((recipe) => (
          <li
            className={`intro-chip intro-chip-${recipe.slot}`}
            key={recipe.id}
          >
            {recipe.name}
            <span className="onboarding-hidden-text">
              {` (${t(`slots.${recipe.slot}`)})`}
            </span>
          </li>
        ))}
        {hidden > 0 && (
          <li className="intro-chip">
            {t('onboarding.doneMore', { count: hidden })}
          </li>
        )}
      </ul>
      <div className="intro-actions intro-actions-done">
        <Button
          className="intro-main-action intro-generate"
          leadingIcon="generate"
          onClick={onGenerate}
          size="lg"
          variant="brand"
        >
          {t('onboarding.generate')}
        </Button>
        <Button className="intro-more" onClick={onAddMore} size="lg">
          {t('onboarding.addMore')}
        </Button>
        <p className="intro-note">{t('onboarding.doneEditNote')}</p>
      </div>
    </IntroLayout>
  )
}
