import { Icon } from '#/components/primitives'
import { LocalizedLink, useI18n } from '#/shared/i18n'

const STEPS = ['welcome', 'recipes', 'done'] as const

export type OnboardingStep = (typeof STEPS)[number]

/** Wordmark, the three steps (dots on phone) and the way out. */
export function OnboardingTopBar({ step }: { step: OnboardingStep }) {
  const { t } = useI18n()
  const current = STEPS.indexOf(step)

  return (
    <header className="onboarding-header">
      <LocalizedLink
        aria-label={t('nav.home')}
        className="onboarding-wordmark"
        to="/"
        translate="no"
      >
        remi
      </LocalizedLink>
      <ol aria-label={t('onboarding.progress')} className="onboarding-steps">
        {STEPS.map((name, index) => (
          <li
            aria-current={index === current ? 'step' : undefined}
            className="onboarding-step"
            data-done={index < current || undefined}
            key={name}
          >
            <span aria-hidden="true" className="onboarding-step-mark">
              {index < current ? <Icon name="done" size="sm" /> : index + 1}
            </span>
            <span className="onboarding-step-label">
              {t(`onboarding.step.${name}`)}
              {index < current && (
                <span className="onboarding-hidden-text">
                  {` (${t('onboarding.stepDone')})`}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
      <LocalizedLink className="onboarding-later" to="/weekly-menu-planner">
        <span className="onboarding-wide">{t('onboarding.later')}</span>
        <span className="onboarding-narrow">{t('onboarding.laterShort')}</span>
      </LocalizedLink>
    </header>
  )
}
