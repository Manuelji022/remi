import { Button, Icon } from '#/components/primitives'
import { useI18n } from '#/shared/i18n'
import { IntroLayout } from './IntroLayout'
import { OnboardingNotes } from './OnboardingNotes'

const HOW = [1, 2, 3] as const

interface WelcomeStepProps {
  name: string
  onStart: () => void
}

export function WelcomeStep({ name, onStart }: WelcomeStepProps) {
  const { t } = useI18n()
  return (
    <IntroLayout
      copy={
        <>
          <span className="onboarding-wide">{t('onboarding.welcomeCopy')}</span>
          <span className="onboarding-narrow">
            {t('onboarding.welcomeCopyShort')}
          </span>
        </>
      }
      eyebrow={t('onboarding.welcomeGreeting', { name })}
      notes={<OnboardingNotes />}
      title={t('onboarding.welcomeTitle')}
    >
      <ol className="intro-how">
        {HOW.map((number) => (
          <li key={number}>
            <span aria-hidden="true" className="intro-how-number">
              {number}
            </span>
            <span>
              <strong>
                <span className="onboarding-wide">
                  {t(`onboarding.how${number}`)}
                </span>
                <span className="onboarding-narrow">
                  {t(`onboarding.how${number}Short`)}
                </span>
              </strong>{' '}
              {t(`onboarding.how${number}Rest`)}
            </span>
          </li>
        ))}
      </ol>
      <div className="intro-actions">
        <Button
          className="intro-main-action"
          onClick={onStart}
          size="lg"
          trailingIcon="forward"
          variant="brand"
        >
          {t('onboarding.start')}
        </Button>
        <p className="intro-note">
          <Icon className="onboarding-wide" name="duration" size="sm" />
          <span className="onboarding-wide">{t('onboarding.welcomeTime')}</span>
          <span className="onboarding-narrow">
            {t('onboarding.welcomeTimeShort')}
          </span>
        </p>
      </div>
    </IntroLayout>
  )
}
