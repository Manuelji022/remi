import { Icon } from '#/components/primitives'
import type { Recipe } from '#/features/recipes/recipe'
import { useI18n } from '#/shared/i18n'
import { countLabel, countRecipes } from '../recipe-summary'
import './onboarding-notes.css'

const SAMPLES = [
  { slot: 'lunch', dish: 'onboarding.noteLunchDish' },
  { slot: 'dinner', dish: 'onboarding.noteDinnerDish' },
] as const

/** Decoration: two sample notes, and a third that waits for a dish or, once
 *  `saved` is given, counts them. */
export function OnboardingNotes({ saved }: { saved?: Recipe[] }) {
  const { t } = useI18n()
  const counts = saved && countRecipes(saved)
  const total = counts && countLabel(t, 'recipe', counts.total)

  return (
    <div aria-hidden="true" className="onboarding-notes">
      <div className="onboarding-notes-stage">
        {SAMPLES.map(({ slot, dish }) => (
          <div className={`onboarding-note onboarding-note-${slot}`} key={slot}>
            <span className="onboarding-note-title">{t(`slots.${slot}`)}</span>
            <span className="onboarding-note-body">
              <span className="onboarding-note-day onboarding-wide">
                {t('onboarding.noteDay')}
              </span>
              <span className="onboarding-note-dish">{t(dish)}</span>
            </span>
          </div>
        ))}
        <div className="onboarding-note onboarding-note-yours">
          <span className="onboarding-note-head">
            <span className="onboarding-note-title">
              {total ?? t('onboarding.noteYours')}
            </span>
            <span>
              {t(counts ? 'onboarding.noteReady' : 'onboarding.noteYoursCopy')}
            </span>
          </span>
          {counts ? (
            <span className="onboarding-note-body onboarding-note-answer">
              <span className="onboarding-note-check">
                <Icon name="done" size="sm" />
              </span>
              <span className="onboarding-wide">
                {countLabel(t, 'lunch', counts.lunches)} ·{' '}
                {countLabel(t, 'dinner', counts.dinners)}
              </span>
              <span className="onboarding-narrow">
                {total && t('onboarding.noteReadyShort', { recipes: total })}
              </span>
            </span>
          ) : (
            <span className="onboarding-note-body onboarding-note-field">
              {t('onboarding.notePlaceholder')}
              <span className="onboarding-note-caret" />
            </span>
          )}
          <span className="onboarding-note-tape" />
        </div>
      </div>
    </div>
  )
}
